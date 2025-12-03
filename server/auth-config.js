// Auth configuration management
import { PrismaClient } from '@prisma/client';
import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const configPath = join(__dirname, '..', 'auth-config.json');

// Default config structure
const defaultConfigs = {
  azure: {
    enabled: false,
    tenantId: '',
    clientId: '',
    clientSecret: '',
  },
  ldap: {
    enabled: false,
    url: '',
    baseDN: '',
    username: '',
    password: '',
  },
  ad: {
    enabled: false,
    url: '',
    baseDN: '',
    username: '',
    password: '',
  },
};

/**
 * Läser auth-konfiguration från fil
 */
async function readConfigFile() {
  try {
    const content = await readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // Om filen inte finns, returnera default
    return { ...defaultConfigs };
  }
}

/**
 * Sparar auth-konfiguration till fil
 */
async function writeConfigFile(configs) {
  await writeFile(configPath, JSON.stringify(configs, null, 2), 'utf-8');
}

/**
 * Hämtar konfiguration för en specifik metod
 */
export async function getAuthConfig(method) {
  const configs = await readConfigFile();
  return configs[method] || defaultConfigs[method];
}

/**
 * Sparar konfiguration för en specifik metod
 */
export async function saveAuthConfig(method, config) {
  const configs = await readConfigFile();
  
  // Behåll befintlig konfiguration och uppdatera med nya värden
  const existingConfig = configs[method] || {};
  
  if (method === 'azure') {
    configs[method] = {
      ...defaultConfigs.azure,
      ...existingConfig,
      enabled: config.enabled !== false,
      tenantId: config.azure?.tenantId || existingConfig.tenantId || '',
      clientId: config.azure?.clientId || existingConfig.clientId || '',
      clientSecret: config.azure?.clientSecret || existingConfig.clientSecret || '',
    };
  } else if (method === 'ldap') {
    configs[method] = {
      ...defaultConfigs.ldap,
      ...existingConfig,
      enabled: config.enabled !== false,
      url: config.ldap?.url || existingConfig.url || '',
      baseDN: config.ldap?.baseDN || existingConfig.baseDN || '',
      username: config.ldap?.username || existingConfig.username || '',
      password: config.ldap?.password || existingConfig.password || '',
    };
  } else if (method === 'ad') {
    configs[method] = {
      ...defaultConfigs.ad,
      ...existingConfig,
      enabled: config.enabled !== false,
      url: config.ad?.url || existingConfig.url || '',
      baseDN: config.ad?.baseDN || existingConfig.baseDN || '',
      username: config.ad?.username || existingConfig.username || '',
      password: config.ad?.password || existingConfig.password || '',
    };
  }
  
  await writeConfigFile(configs);
  return configs[method];
}

