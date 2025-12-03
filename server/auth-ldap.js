// LDAP Authentication
import ldap from 'ldapjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Skapar LDAP-klient
 */
function createLdapClient(config) {
  const { url } = config;
  return ldap.createClient({ url });
}

/**
 * Autentiserar användare med LDAP
 */
export async function authenticateLdapUser(username, password, config) {
  return new Promise((resolve) => {
    try {
      const { url, baseDN, username: bindDN, password: bindPassword } = config;
      
      if (!url || !baseDN) {
        return resolve({ success: false, message: 'LDAP-konfiguration saknas' });
      }

      const client = createLdapClient(config);

      // Först bind med service account för att söka efter användaren
      client.bind(bindDN || `cn=${username},${baseDN}`, bindPassword || password, async (err) => {
        if (err) {
          // Om bind med service account misslyckades, försök direkt med användaren
          const userDN = `cn=${username},${baseDN}`;
          client.bind(userDN, password, async (bindErr) => {
            if (bindErr) {
              client.unbind();
              return resolve({ success: false, message: 'Ogiltigt användarnamn eller lösenord' });
            }

            // Hämta användarinformation
            const userInfo = await getLdapUserInfo(client, userDN, baseDN, username);
            client.unbind();

            if (!userInfo) {
              return resolve({ success: false, message: 'Kunde inte hämta användarinformation' });
            }

            // Hämta eller skapa användare i databasen
            handleLdapUser(userInfo, config).then((result) => {
              resolve(result);
            });
          });
        } else {
          // Sök efter användaren
          const searchDN = `cn=${username},${baseDN}`;
          const opts = {
            filter: `(cn=${username})`,
            scope: 'sub',
            attributes: ['dn', 'cn', 'mail', 'displayName', 'memberOf'],
          };

          client.search(baseDN, opts, async (searchErr, res) => {
            if (searchErr) {
              client.unbind();
              return resolve({ success: false, message: 'LDAP-sökning misslyckades' });
            }

            let userDN = null;
            let userAttrs = {};

            res.on('searchEntry', (entry) => {
              userDN = entry.dn.toString();
              userAttrs = entry.pojo.attributes.reduce((acc, attr) => {
                acc[attr.type] = attr.values[0];
                return acc;
              }, {});
            });

            res.on('end', async () => {
              if (!userDN) {
                client.unbind();
                return resolve({ success: false, message: 'Användare hittades inte' });
              }

              // Verifiera lösenord genom att försöka binda med användarens DN
              const userClient = createLdapClient(config);
              userClient.bind(userDN, password, async (verifyErr) => {
                if (verifyErr) {
                  userClient.unbind();
                  return resolve({ success: false, message: 'Ogiltigt lösenord' });
                }

                const userInfo = {
                  dn: userDN,
                  username: userAttrs.cn || username,
                  email: userAttrs.mail || `${username}@example.com`,
                  name: userAttrs.displayName || userAttrs.cn || username,
                  groups: userAttrs.memberOf || [],
                };

                userClient.unbind();
                client.unbind();

                // Hämta eller skapa användare och synkronisera grupper
                handleLdapUser(userInfo, config).then((result) => {
                  resolve(result);
                });
              });
            });

            res.on('error', (err) => {
              client.unbind();
              resolve({ success: false, message: `LDAP-fel: ${err.message}` });
            });
          });
        }
      });
    } catch (error) {
      console.error('❌ LDAP authentication error:', error);
      resolve({ success: false, message: 'LDAP-autentisering misslyckades' });
    }
  });
}

/**
 * Hämtar användarinformation från LDAP
 */
function getLdapUserInfo(client, userDN, baseDN, username) {
  return new Promise((resolve) => {
    const opts = {
      filter: `(cn=${username})`,
      scope: 'sub',
      attributes: ['dn', 'cn', 'mail', 'displayName', 'memberOf'],
    };

    client.search(baseDN, opts, (err, res) => {
      if (err) {
        return resolve(null);
      }

      let userInfo = null;

      res.on('searchEntry', (entry) => {
        const attrs = entry.pojo.attributes.reduce((acc, attr) => {
          acc[attr.type] = attr.values[0];
          return acc;
        }, {});

        userInfo = {
          dn: entry.dn.toString(),
          username: attrs.cn || username,
          email: attrs.mail || `${username}@example.com`,
          name: attrs.displayName || attrs.cn || username,
          groups: attrs.memberOf || [],
        };
      });

      res.on('end', () => {
        resolve(userInfo);
      });

      res.on('error', () => {
        resolve(null);
      });
    });
  });
}

/**
 * Hanterar LDAP-användare och synkroniserar grupper
 */
async function handleLdapUser(userInfo, config) {
  try {
    // Hitta eller skapa användare
    let user = await prisma.user.findUnique({
      where: { email: userInfo.email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: `ldap-${userInfo.dn.replace(/[^a-zA-Z0-9]/g, '-')}`,
          name: userInfo.name,
          email: userInfo.email,
          role: 'user',
          authMethod: 'ldap',
        },
      });
    } else if (user.authMethod !== 'ldap') {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          authMethod: 'ldap',
          lastLogin: new Date(),
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });
    }

    // Synkronisera grupper
    await syncLdapGroups(user.id, userInfo.groups, config);

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    };
  } catch (error) {
    console.error('❌ Error handling LDAP user:', error);
    return { success: false, message: 'Kunde inte skapa/uppdatera användare' };
  }
}

/**
 * Synkroniserar LDAP-grupper till databasen
 */
async function syncLdapGroups(userId, ldapGroups, config) {
  try {
    const client = createLdapClient(config);
    const { baseDN, username: bindDN, password: bindPassword } = config;

    // Bind med service account
    await new Promise((resolve, reject) => {
      client.bind(bindDN, bindPassword, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    for (const groupDN of ldapGroups) {
      try {
        // Hämta gruppinformation
        const groupInfo = await getLdapGroupInfo(client, groupDN, baseDN);

        if (!groupInfo) continue;

        // Hitta eller skapa grupp
        let group = await prisma.group.findFirst({
          where: {
            source: 'ldap',
            externalId: groupDN,
          },
        });

        if (!group) {
          group = await prisma.group.create({
            data: {
              name: groupInfo.cn || groupDN,
              displayName: groupInfo.displayName || groupInfo.cn,
              description: groupInfo.description,
              source: 'ldap',
              externalId: groupDN,
            },
          });
        }

        // Lägg till användare i gruppen
        const existingMember = await prisma.groupMember.findFirst({
          where: {
            userId: userId,
            groupId: group.id,
          },
        });

        if (!existingMember) {
          await prisma.groupMember.create({
            data: {
              userId: userId,
              groupId: group.id,
            },
          });
        }
      } catch (error) {
        console.error(`❌ Error syncing LDAP group ${groupDN}:`, error);
      }
    }

    client.unbind();
  } catch (error) {
    console.error('❌ Error syncing LDAP groups:', error);
  }
}

/**
 * Hämtar gruppinformation från LDAP
 */
function getLdapGroupInfo(client, groupDN, baseDN) {
  return new Promise((resolve) => {
    const opts = {
      filter: `(distinguishedName=${groupDN})`,
      scope: 'sub',
      attributes: ['cn', 'displayName', 'description'],
    };

    client.search(baseDN, opts, (err, res) => {
      if (err) {
        return resolve(null);
      }

      let groupInfo = null;

      res.on('searchEntry', (entry) => {
        const attrs = entry.pojo.attributes.reduce((acc, attr) => {
          acc[attr.type] = attr.values[0];
          return acc;
        }, {});

        groupInfo = {
          cn: attrs.cn,
          displayName: attrs.displayName || attrs.cn,
          description: attrs.description,
        };
      });

      res.on('end', () => {
        resolve(groupInfo);
      });

      res.on('error', () => {
        resolve(null);
      });
    });
  });
}

/**
 * Synkroniserar alla LDAP-grupper (för admin-synkronisering)
 */
export async function syncAllLdapGroups(config) {
  try {
    const client = createLdapClient(config);
    const { baseDN, username: bindDN, password: bindPassword } = config;

    // Bind med service account
    await new Promise((resolve, reject) => {
      client.bind(bindDN, bindPassword, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Sök efter alla grupper
    const opts = {
      filter: '(objectClass=group)',
      scope: 'sub',
      attributes: ['cn', 'displayName', 'description', 'distinguishedName'],
    };

    return new Promise((resolve) => {
      const groups = [];

      client.search(baseDN, opts, (err, res) => {
        if (err) {
          client.unbind();
          return resolve({ success: false, error: err.message });
        }

        res.on('searchEntry', async (entry) => {
          const attrs = entry.pojo.attributes.reduce((acc, attr) => {
            acc[attr.type] = attr.values[0];
            return acc;
          }, {});

          const groupDN = entry.dn.toString();
          groups.push({
            dn: groupDN,
            cn: attrs.cn,
            displayName: attrs.displayName || attrs.cn,
            description: attrs.description,
          });
        });

        res.on('end', async () => {
          client.unbind();

          // Synkronisera till databasen
          for (const ldapGroup of groups) {
            await prisma.group.upsert({
              where: {
                source_externalId: {
                  source: 'ldap',
                  externalId: ldapGroup.dn,
                },
              },
              update: {
                name: ldapGroup.cn,
                displayName: ldapGroup.displayName,
                description: ldapGroup.description,
              },
              create: {
                name: ldapGroup.cn,
                displayName: ldapGroup.displayName,
                description: ldapGroup.description,
                source: 'ldap',
                externalId: ldapGroup.dn,
              },
            });
          }

          resolve({ success: true, count: groups.length });
        });

        res.on('error', (err) => {
          client.unbind();
          resolve({ success: false, error: err.message });
        });
      });
    });
  } catch (error) {
    console.error('❌ Error syncing all LDAP groups:', error);
    return { success: false, error: error.message };
  }
}

