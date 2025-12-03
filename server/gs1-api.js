/**
 * GS1 API Integration
 * Hanterar kommunikation med GS1 Swedens API:er
 */

import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const configPath = join(__dirname, '..', 'gs1-config.json');

// GS1 API Base URLs
const GS1_API_BASE = 'https://validoopwe-apimanagement.azure-api.net';
const GS1_AUTH_URL = `${GS1_API_BASE}/connect/token`;

// Default config structure
const defaultConfig = {
  enabled: false,
  clientId: '',
  clientSecret: '',
  subscriptionKey: '',
  gln: '', // Global Location Number
  apiUsername: '', // API user name från MyGS1
  apiPassword: '', // API user password (skickas via SMS från GS1)
};

/**
 * Läser GS1-konfiguration från fil
 */
async function readConfig() {
  try {
    const content = await readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return { ...defaultConfig };
  }
}

/**
 * Sparar GS1-konfiguration till fil
 */
async function writeConfig(config) {
  await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Hämtar access token från GS1
 */
export async function getAccessToken() {
  const config = await readConfig();
  
  if (!config.enabled || !config.clientId || !config.clientSecret || !config.subscriptionKey || !config.apiUsername || !config.apiPassword) {
    throw new Error('GS1 är inte konfigurerad korrekt. Kontrollera att alla fält är ifyllda (Client ID, Client Secret, Subscription Key, API Username, API Password)');
  }

  try {
    // OAuth2 password grant flow för GS1 (enligt dokumentation)
    // Endpoint: https://validoopwe-apimanagement.azure-api.net/connect/token
    // Grant type: "password" (INTE "client_credentials")
    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('client_id', config.clientId);
    params.append('client_secret', config.clientSecret);
    params.append('username', config.apiUsername);
    params.append('password', config.apiPassword);
    params.append('scope', 'api offline_access'); // offline_access för att få refresh token

    console.log('🔐 [GS1] Försöker autentisera med Client ID:', config.clientId.substring(0, 20) + '...');
    console.log('🔐 [GS1] API Username:', config.apiUsername);
    
    const response = await fetch(GS1_AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Ocp-Apim-Subscription-Key': config.subscriptionKey,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [GS1] Auth response:', response.status, errorText);
      
      // Ge mer specifik information för olika fel
      if (response.status === 400 && errorText.includes('unauthorized_client')) {
        throw new Error(
          'GS1 autentisering misslyckades: unauthorized_client\n\n' +
          'Detta kan bero på:\n' +
          '1. Client ID eller Client Secret är felaktiga\n' +
          '2. API Username eller API Password är felaktiga\n' +
          '3. Subscription Key är felaktig\n' +
          '4. Klienten är inte aktiverad eller har inte rätt behörigheter\n\n' +
          'Kontrollera dina autentiseringsuppgifter i MyGS1 (Technical Integration page) eller kontakta GS1 support.'
        );
      }
      
      if (response.status === 401) {
        throw new Error(
          'GS1 autentisering misslyckades: Ogiltiga autentiseringsuppgifter\n\n' +
          'Kontrollera att:\n' +
          '1. API Username och API Password är korrekta\n' +
          '2. API Password skickades till dig via SMS från GS1\n' +
          '3. Du har rätt behörigheter i MyGS1'
        );
      }
      
      throw new Error(`GS1 autentisering misslyckades: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ [GS1] Autentisering lyckades');
    console.log('✅ [GS1] Token expires in:', data.expires_in, 'seconds');
    return data.access_token || data.accessToken || data.token;
  } catch (error) {
    console.error('❌ [GS1] Auth error:', error);
    throw error;
  }
}

/**
 * Hämtar produktdata från GS1 TradeItem API
 */
export async function getTradeItem(gtin, options = {}) {
  const { dataType = 'Product', allowInvalid = false } = options;
  const token = await getAccessToken();
  const config = await readConfig();

  try {
    const url = `${GS1_API_BASE}/tradeitem/tradeitem.api/TradeItemInformation/getItemByIdentification`;
    const params = new URLSearchParams({
      gtin,
      dataType,
      allowInvalid: allowInvalid.toString(),
    });

    const response = await fetch(`${url}?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Ocp-Apim-Subscription-Key': config.subscriptionKey,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Produkt finns inte
      }
      const errorText = await response.text();
      throw new Error(`GS1 API fel: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('GS1 getTradeItem error:', error);
    throw error;
  }
}

/**
 * Söker efter produkter i GS1
 */
export async function searchTradeItems(searchParams) {
  const token = await getAccessToken();
  const config = await readConfig();

  try {
    const url = `${GS1_API_BASE}/tradeitem/tradeitem.api/TradeItemInformation/search`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': config.subscriptionKey,
      },
      body: JSON.stringify(searchParams),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GS1 search error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('GS1 search error:', error);
    throw error;
  }
}

/**
 * Validerar produktattribut mot GS1-regler
 */
export async function validateProductAttributes(gtin) {
  try {
    const tradeItem = await getTradeItem(gtin, { dataType: 'GDSN', allowInvalid: true });
    
    if (!tradeItem || !tradeItem[0]) {
      return {
        valid: false,
        errors: ['Produkt hittades inte i GS1'],
        missingAttributes: [],
        warnings: [],
      };
    }

    const item = tradeItem[0];
    const errors = [];
    const warnings = [];
    const missingAttributes = [];

    // Kritiska attribut som måste finnas
    const requiredAttributes = [
      { key: 'gtin', name: 'GTIN', value: item.gtin },
      { key: 'functionalName', name: 'Funktionellt namn', value: item.functionalName },
      { key: 'descriptionShort', name: 'Kort beskrivning', value: item.descriptionShort },
      { key: 'brandName', name: 'Varumärke', value: item.brandName },
      { key: 'gpcCode', name: 'GPC-kod', value: item.gpcCode },
      { key: 'targetMarketCountryCode', name: 'Målmarknad', value: item.targetMarketCountryCode },
    ];

    requiredAttributes.forEach(attr => {
      if (!attr.value || attr.value.trim() === '') {
        missingAttributes.push(attr.name);
        errors.push(`${attr.name} saknas`);
      }
    });

    // Varningar för viktiga men inte kritiska attribut
    const importantAttributes = [
      { key: 'descriptiveSizeDimension', name: 'Storlek', value: item.descriptiveSizeDimension },
      { key: 'brandOwnerGln', name: 'Varumärkesägare GLN', value: item.brandOwnerGln },
      { key: 'informationProviderGln', name: 'Informationsleverantör GLN', value: item.informationProviderGln },
    ];

    importantAttributes.forEach(attr => {
      if (!attr.value || attr.value.trim() === '') {
        warnings.push(`${attr.name} saknas (rekommenderas)`);
      }
    });

    // Kontrollera QA-status
    if (item.qaStatus) {
      if (item.qaStatus.digitalQAStatus === 'ActionRequired') {
        warnings.push('Digital QA kräver åtgärd');
      }
      if (item.qaStatus.measurementQAStatus === 'ActionRequired') {
        warnings.push('Mätnings-QA kräver åtgärd');
      }
      if (item.qaStatus.barcodeQAStatus === 'ActionRequired') {
        warnings.push('Streckkods-QA kräver åtgärd');
      }
      if (item.qaStatus.digitalQAStatus === 'Booked') {
        warnings.push('Digital QA är bokad');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      missingAttributes,
      tradeItem: item,
    };
  } catch (error) {
    console.error('GS1 validation error:', error);
    return {
      valid: false,
      errors: [`Valideringsfel: ${error.message}`],
      missingAttributes: [],
      warnings: [],
    };
  }
}

/**
 * Skapar en prenumeration för att få notifikationer om ändringar
 */
export async function createSubscription(subscriptionData) {
  const token = await getAccessToken();
  const config = await readConfig();

  try {
    const url = `${GS1_API_BASE}/subscriptions/subscriptions.api/Subscription/create`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': config.subscriptionKey,
      },
      body: JSON.stringify({
        ...subscriptionData,
        subscriberGln: config.gln,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GS1 subscription error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('GS1 createSubscription error:', error);
    throw error;
  }
}

/**
 * Hämtar alla prenumerationer
 */
export async function getSubscriptions() {
  const token = await getAccessToken();
  const config = await readConfig();

  try {
    const url = `${GS1_API_BASE}/subscriptions/subscriptions.api/Subscription/search`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': config.subscriptionKey,
      },
      body: JSON.stringify({
        subscriberGln: config.gln,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GS1 getSubscriptions error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('GS1 getSubscriptions error:', error);
    throw error;
  }
}

/**
 * Tar bort en prenumeration
 */
export async function deleteSubscription(subscriptionId) {
  const token = await getAccessToken();
  const config = await readConfig();

  try {
    const url = `${GS1_API_BASE}/subscriptions/subscriptions.api/Subscription/${subscriptionId}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Ocp-Apim-Subscription-Key': config.subscriptionKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GS1 deleteSubscription error: ${response.status} - ${errorText}`);
    }

    return { success: true };
  } catch (error) {
    console.error('GS1 deleteSubscription error:', error);
    throw error;
  }
}

/**
 * Hämtar GS1-konfiguration
 */
export async function getConfig() {
  return await readConfig();
}

/**
 * Sparar GS1-konfiguration
 */
export async function saveConfig(newConfig) {
  const currentConfig = await readConfig();
  
  // Behåll befintligt clientSecret om det nya är "***" (dolt värde) eller saknas
  const updatedConfig = {
    ...currentConfig,
    ...newConfig,
  };
  
  // Om clientSecret är "***", saknas eller är tomt, behåll det befintliga värdet
  if (!newConfig.clientSecret || newConfig.clientSecret === '***' || newConfig.clientSecret.trim() === '') {
    updatedConfig.clientSecret = currentConfig.clientSecret || '';
  }
  
  // Behåll befintligt apiPassword om det nya är "***" eller saknas
  if (!newConfig.apiPassword || newConfig.apiPassword === '***' || newConfig.apiPassword.trim() === '') {
    updatedConfig.apiPassword = currentConfig.apiPassword || '';
  }
  
  await writeConfig(updatedConfig);
  return updatedConfig;
}

/**
 * Testar GS1-anslutningen
 */
export async function testConnection() {
  try {
    const token = await getAccessToken();
    return {
      success: true,
      message: 'Anslutning till GS1 lyckades',
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Anslutning till GS1 misslyckades',
    };
  }
}

