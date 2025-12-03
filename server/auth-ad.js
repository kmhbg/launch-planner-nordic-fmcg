// Active Directory Authentication (använder LDAP-protokollet)
import ldap from 'ldapjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Skapar AD LDAP-klient
 */
function createAdClient(config) {
  const { url } = config;
  return ldap.createClient({ url });
}

/**
 * Autentiserar användare med Active Directory
 */
export async function authenticateAdUser(username, password, config) {
  return new Promise((resolve) => {
    try {
      const { url, baseDN, username: serviceAccountDN, password: serviceAccountPassword } = config;
      
      if (!url || !baseDN) {
        return resolve({ success: false, message: 'Active Directory-konfiguration saknas' });
      }

      const client = createAdClient(config);

      // Bind med service account för att söka efter användaren
      client.bind(serviceAccountDN, serviceAccountPassword, async (err) => {
        if (err) {
          client.unbind();
          return resolve({ success: false, message: 'Kunde inte ansluta till Active Directory' });
        }

        // Sök efter användaren (kan vara sAMAccountName eller userPrincipalName)
        const searchFilter = `(|(sAMAccountName=${username})(userPrincipalName=${username}))`;
        const opts = {
          filter: searchFilter,
          scope: 'sub',
          attributes: ['distinguishedName', 'sAMAccountName', 'userPrincipalName', 'displayName', 'mail', 'memberOf'],
        };

        client.search(baseDN, opts, async (searchErr, res) => {
          if (searchErr) {
            client.unbind();
            return resolve({ success: false, message: 'AD-sökning misslyckades' });
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
            const userClient = createAdClient(config);
            userClient.bind(userDN, password, async (verifyErr) => {
              if (verifyErr) {
                userClient.unbind();
                client.unbind();
                return resolve({ success: false, message: 'Ogiltigt lösenord' });
              }

              const userInfo = {
                dn: userDN,
                username: userAttrs.sAMAccountName || username,
                email: userAttrs.mail || userAttrs.userPrincipalName || `${username}@example.com`,
                name: userAttrs.displayName || userAttrs.sAMAccountName || username,
                groups: Array.isArray(userAttrs.memberOf) ? userAttrs.memberOf : [userAttrs.memberOf].filter(Boolean),
              };

              userClient.unbind();
              client.unbind();

              // Hämta eller skapa användare och synkronisera grupper
              handleAdUser(userInfo, config).then((result) => {
                resolve(result);
              });
            });
          });

          res.on('error', (err) => {
            client.unbind();
            resolve({ success: false, message: `AD-fel: ${err.message}` });
          });
        });
      });
    } catch (error) {
      console.error('❌ AD authentication error:', error);
      resolve({ success: false, message: 'AD-autentisering misslyckades' });
    }
  });
}

/**
 * Hanterar AD-användare och synkroniserar grupper
 */
async function handleAdUser(userInfo, config) {
  try {
    // Hitta eller skapa användare
    let user = await prisma.user.findUnique({
      where: { email: userInfo.email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: `ad-${userInfo.dn.replace(/[^a-zA-Z0-9]/g, '-')}`,
          name: userInfo.name,
          email: userInfo.email,
          role: 'user',
          authMethod: 'ad',
        },
      });
    } else if (user.authMethod !== 'ad') {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          authMethod: 'ad',
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
    await syncAdGroups(user.id, userInfo.groups, config);

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
    console.error('❌ Error handling AD user:', error);
    return { success: false, message: 'Kunde inte skapa/uppdatera användare' };
  }
}

/**
 * Synkroniserar AD-grupper till databasen
 */
async function syncAdGroups(userId, adGroups, config) {
  try {
    const client = createAdClient(config);
    const { baseDN, username: serviceAccountDN, password: serviceAccountPassword } = config;

    // Bind med service account
    await new Promise((resolve, reject) => {
      client.bind(serviceAccountDN, serviceAccountPassword, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    for (const groupDN of adGroups) {
      try {
        // Hämta gruppinformation
        const groupInfo = await getAdGroupInfo(client, groupDN, baseDN);

        if (!groupInfo) continue;

        // Hitta eller skapa grupp
        let group = await prisma.group.findFirst({
          where: {
            source: 'ad',
            externalId: groupDN,
          },
        });

        if (!group) {
          group = await prisma.group.create({
            data: {
              name: groupInfo.sAMAccountName || groupInfo.cn || groupDN,
              displayName: groupInfo.displayName || groupInfo.name || groupInfo.cn,
              description: groupInfo.description,
              source: 'ad',
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
        console.error(`❌ Error syncing AD group ${groupDN}:`, error);
      }
    }

    client.unbind();
  } catch (error) {
    console.error('❌ Error syncing AD groups:', error);
  }
}

/**
 * Hämtar gruppinformation från AD
 */
function getAdGroupInfo(client, groupDN, baseDN) {
  return new Promise((resolve) => {
    const opts = {
      filter: `(distinguishedName=${groupDN})`,
      scope: 'sub',
      attributes: ['sAMAccountName', 'cn', 'name', 'displayName', 'description'],
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
          sAMAccountName: attrs.sAMAccountName,
          cn: attrs.cn,
          name: attrs.name,
          displayName: attrs.displayName || attrs.name || attrs.cn,
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
 * Synkroniserar alla AD-grupper (för admin-synkronisering)
 */
export async function syncAllAdGroups(config) {
  try {
    const client = createAdClient(config);
    const { baseDN, username: serviceAccountDN, password: serviceAccountPassword } = config;

    // Bind med service account
    await new Promise((resolve, reject) => {
      client.bind(serviceAccountDN, serviceAccountPassword, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Sök efter alla grupper
    const opts = {
      filter: '(&(objectClass=group)(objectCategory=group))',
      scope: 'sub',
      attributes: ['sAMAccountName', 'cn', 'name', 'displayName', 'description', 'distinguishedName'],
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
            sAMAccountName: attrs.sAMAccountName,
            cn: attrs.cn,
            name: attrs.name,
            displayName: attrs.displayName || attrs.name || attrs.cn,
            description: attrs.description,
          });
        });

        res.on('end', async () => {
          client.unbind();

          // Synkronisera till databasen
          for (const adGroup of groups) {
            await prisma.group.upsert({
              where: {
                source_externalId: {
                  source: 'ad',
                  externalId: adGroup.dn,
                },
              },
              update: {
                name: adGroup.sAMAccountName || adGroup.cn || adGroup.name,
                displayName: adGroup.displayName,
                description: adGroup.description,
              },
              create: {
                name: adGroup.sAMAccountName || adGroup.cn || adGroup.name,
                displayName: adGroup.displayName,
                description: adGroup.description,
                source: 'ad',
                externalId: adGroup.dn,
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
    console.error('❌ Error syncing all AD groups:', error);
    return { success: false, error: error.message };
  }
}

