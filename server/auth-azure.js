// Azure AD SSO Authentication
import { ConfidentialClientApplication } from '@azure/msal-node';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Konfigurerar Azure AD MSAL-applikation
 */
export function createAzureApp(config) {
  const { tenantId, clientId, clientSecret } = config;
  
  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Azure AD-konfiguration saknas');
  }

  const msalConfig = {
    auth: {
      clientId: clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
      clientSecret: clientSecret,
    },
  };

  return new ConfidentialClientApplication(msalConfig);
}

/**
 * Autentiserar användare med Azure AD via authorization code flow
 */
export async function authenticateAzureUser(code, redirectUri, config) {
  try {
    const app = createAzureApp(config);
    
    const tokenRequest = {
      code: code,
      scopes: ['user.read'],
      redirectUri: redirectUri,
    };

    const response = await app.acquireTokenByCode(tokenRequest);
    
    if (!response || !response.account) {
      return { success: false, message: 'Azure AD-autentisering misslyckades' };
    }

    const account = response.account;
    const userInfo = {
      id: account.homeAccountId,
      email: account.username,
      name: account.name || account.username,
    };

    // Hämta eller skapa användare i databasen
    let user = await prisma.user.findUnique({
      where: { email: userInfo.email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: `azure-${userInfo.id}`,
          name: userInfo.name,
          email: userInfo.email,
          role: 'user',
          authMethod: 'azure',
        },
      });
    } else if (user.authMethod !== 'azure') {
      // Uppdatera om användaren bytt autentiseringsmetod
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          authMethod: 'azure',
          lastLogin: new Date(),
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });
    }

    // Hämta grupper från Azure AD
    const groups = await fetchAzureGroups(response.accessToken, config);
    await syncAzureGroups(user.id, groups, config);

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
    console.error('❌ Azure AD authentication error:', error);
    return { success: false, message: 'Azure AD-autentisering misslyckades' };
  }
}

/**
 * Hämtar grupper från Azure AD
 */
async function fetchAzureGroups(accessToken, config) {
  try {
    const response = await fetch('https://graph.microsoft.com/v1.0/me/memberOf', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error('❌ Failed to fetch Azure AD groups:', response.status);
      return [];
    }

    const data = await response.json();
    return data.value || [];
  } catch (error) {
    console.error('❌ Error fetching Azure AD groups:', error);
    return [];
  }
}

/**
 * Synkroniserar Azure AD-grupper till databasen
 */
async function syncAzureGroups(userId, azureGroups, config) {
  try {
    for (const azureGroup of azureGroups) {
      if (azureGroup['@odata.type'] !== '#microsoft.graph.group') {
        continue;
      }

      // Hitta eller skapa grupp
      let group = await prisma.group.findFirst({
        where: {
          source: 'azure',
          externalId: azureGroup.id,
        },
      });

      if (!group) {
        group = await prisma.group.create({
          data: {
            name: azureGroup.displayName || azureGroup.mailNickname,
            displayName: azureGroup.displayName,
            description: azureGroup.description,
            source: 'azure',
            externalId: azureGroup.id,
          },
        });
      }

      // Lägg till användare i gruppen om den inte redan är medlem
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
    }
  } catch (error) {
    console.error('❌ Error syncing Azure AD groups:', error);
  }
}

/**
 * Hämtar alla grupper från Azure AD (för admin-synkronisering)
 */
export async function syncAllAzureGroups(config) {
  try {
    const app = createAzureApp(config);
    
    // Hämta access token för applikationen
    const tokenRequest = {
      scopes: ['https://graph.microsoft.com/.default'],
    };

    const response = await app.acquireTokenByClientCredential(tokenRequest);
    
    if (!response || !response.accessToken) {
      throw new Error('Kunde inte hämta access token');
    }

    // Hämta alla grupper
    const groupsResponse = await fetch('https://graph.microsoft.com/v1.0/groups', {
      headers: {
        Authorization: `Bearer ${response.accessToken}`,
      },
    });

    if (!groupsResponse.ok) {
      throw new Error(`Failed to fetch groups: ${groupsResponse.status}`);
    }

    const data = await groupsResponse.json();
    const groups = data.value || [];

    // Synkronisera till databasen
    for (const azureGroup of groups) {
      await prisma.group.upsert({
        where: {
          source_externalId: {
            source: 'azure',
            externalId: azureGroup.id,
          },
        },
        update: {
          name: azureGroup.displayName || azureGroup.mailNickname,
          displayName: azureGroup.displayName,
          description: azureGroup.description,
        },
        create: {
          name: azureGroup.displayName || azureGroup.mailNickname,
          displayName: azureGroup.displayName,
          description: azureGroup.description,
          source: 'azure',
          externalId: azureGroup.id,
        },
      });
    }

    return { success: true, count: groups.length };
  } catch (error) {
    console.error('❌ Error syncing all Azure AD groups:', error);
    return { success: false, error: error.message };
  }
}

