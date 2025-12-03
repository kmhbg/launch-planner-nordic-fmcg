import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const writeFileAsync = promisify(writeFile);
const readFileAsync = promisify(readFile);

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = 3001;

app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'launch-planner-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 timmar
  },
}));

// Helper för att läsa .env fil
async function readEnvFile() {
  const envPath = join(__dirname, '..', '.env');
  if (existsSync(envPath)) {
    const content = await readFileAsync(envPath, 'utf-8');
    const env = {};
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
        }
      }
    });
    return env;
  }
  return {};
}

// Helper för att skriva .env fil
async function writeEnvFile(env) {
  const envPath = join(__dirname, '..', '.env');
  const content = Object.entries(env)
    .map(([key, value]) => {
      // För DATABASE_URL, behåll som den är (redan URL-encoded från frontend)
      if (key === 'DATABASE_URL') {
        return `${key}="${value}"`;
      }
      return `${key}="${value}"`;
    })
    .join('\n');
  await writeFileAsync(envPath, content, 'utf-8');
}

// Helper för att uppdatera Prisma schema
async function updatePrismaSchema(provider) {
  const schemaPath = join(__dirname, '..', 'prisma', 'schema.prisma');
  const content = await readFileAsync(schemaPath, 'utf-8');
  
  // Uppdatera datasource provider (inte generator provider)
  const updated = content.replace(
    /datasource\s+db\s*\{[^}]*provider\s*=\s*"[^"]+"/,
    (match) => match.replace(/provider\s*=\s*"[^"]+"/, `provider = "${provider}"`)
  );
  
  await writeFileAsync(schemaPath, updated, 'utf-8');
}

// Authentication middleware (måste definieras före routes som använder den)
const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  res.status(401).json({ error: 'Ej autentiserad' });
};

// GS1 API Routes
// API: Hämta GS1-konfiguration
app.get('/api/gs1/config', requireAuth, async (req, res) => {
  try {
    const { getConfig } = await import('./gs1-api.js');
    const config = await getConfig();
    // Dölj känslig information
    const safeConfig = {
      ...config,
      clientSecret: config.clientSecret ? '***' : '',
      apiPassword: config.apiPassword ? '***' : '',
    };
    res.json(safeConfig);
  } catch (error) {
    console.error('❌ Get GS1 config error:', error);
    res.status(500).json({ error: 'Ett fel uppstod' });
  }
});

// API: Spara GS1-konfiguration
app.post('/api/gs1/config', requireAuth, async (req, res) => {
  try {
    const { saveConfig } = await import('./gs1-api.js');
    const config = await saveConfig(req.body);
    // Dölj känslig information i response
    const safeConfig = {
      ...config,
      clientSecret: config.clientSecret ? '***' : '',
      apiPassword: config.apiPassword ? '***' : '',
    };
    res.json(safeConfig);
  } catch (error) {
    console.error('❌ Save GS1 config error:', error);
    res.status(500).json({ error: error.message || 'Ett fel uppstod' });
  }
});

// API: Testa GS1-anslutning
app.post('/api/gs1/test', requireAuth, async (req, res) => {
  try {
    const { testConnection } = await import('./gs1-api.js');
    const result = await testConnection();
    res.json(result);
  } catch (error) {
    console.error('❌ GS1 test error:', error);
    res.status(500).json({ success: false, message: error.message || 'Ett fel uppstod' });
  }
});

// API: Validera produktattribut mot GS1
app.post('/api/gs1/validate-product', requireAuth, async (req, res) => {
  try {
    const { gtin } = req.body;
    if (!gtin) {
      return res.status(400).json({ error: 'GTIN krävs' });
    }
    
    const { validateProductAttributes } = await import('./gs1-api.js');
    const result = await validateProductAttributes(gtin);
    res.json(result);
  } catch (error) {
    console.error('❌ GS1 validate product error:', error);
    res.status(500).json({ error: error.message || 'Ett fel uppstod' });
  }
});

// API: Hämta produktdata från GS1
app.get('/api/gs1/product/:gtin', requireAuth, async (req, res) => {
  try {
    const { gtin } = req.params;
    const { dataType, allowInvalid } = req.query;
    
    const { getTradeItem } = await import('./gs1-api.js');
    const result = await getTradeItem(gtin, {
      dataType: dataType || 'Product',
      allowInvalid: allowInvalid === 'true',
    });
    
    if (!result) {
      return res.status(404).json({ error: 'Produkt hittades inte i GS1' });
    }
    
    res.json(result);
  } catch (error) {
    console.error('❌ GS1 get product error:', error);
    res.status(500).json({ error: error.message || 'Ett fel uppstod' });
  }
});

// API: Söka produkter i GS1
app.post('/api/gs1/search', requireAuth, async (req, res) => {
  try {
    const { searchTradeItems } = await import('./gs1-api.js');
    const result = await searchTradeItems(req.body);
    res.json(result);
  } catch (error) {
    console.error('❌ GS1 search error:', error);
    res.status(500).json({ error: error.message || 'Ett fel uppstod' });
  }
});

// API: Skapa prenumeration
app.post('/api/gs1/subscriptions', requireAuth, async (req, res) => {
  try {
    const { createSubscription } = await import('./gs1-api.js');
    const result = await createSubscription(req.body);
    res.json(result);
  } catch (error) {
    console.error('❌ GS1 create subscription error:', error);
    res.status(500).json({ error: error.message || 'Ett fel uppstod' });
  }
});

// API: Hämta alla prenumerationer
app.get('/api/gs1/subscriptions', requireAuth, async (req, res) => {
  try {
    const { getSubscriptions } = await import('./gs1-api.js');
    const result = await getSubscriptions();
    res.json(result);
  } catch (error) {
    console.error('❌ GS1 get subscriptions error:', error);
    res.status(500).json({ error: error.message || 'Ett fel uppstod' });
  }
});

// API: Ta bort prenumeration
app.delete('/api/gs1/subscriptions/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { deleteSubscription } = await import('./gs1-api.js');
    const result = await deleteSubscription(id);
    res.json(result);
  } catch (error) {
    console.error('❌ GS1 delete subscription error:', error);
    res.status(500).json({ error: error.message || 'Ett fel uppstod' });
  }
});

// API: Testa databasanslutning
app.post('/api/database/test', async (req, res) => {
  console.log('🧪 [Backend] /api/database/test - Request mottagen');
  console.log('🧪 [Backend] Provider:', req.body.provider);
  console.log('🧪 [Backend] Connection string:', req.body.connectionString ? `${req.body.connectionString.substring(0, 50)}...` : 'TOM');
  
  try {
    const { connectionString, provider } = req.body;
    
    if (!connectionString || !provider) {
      console.error('❌ [Backend] Connection string eller provider saknas');
      return res.status(400).json({ 
        success: false, 
        message: 'Connection string och provider krävs' 
      });
    }
    
    console.log('🔧 [Backend] Läser nuvarande .env...');
    // Temporärt uppdatera .env
    const currentEnv = await readEnvFile();
    console.log('🔧 [Backend] Sparar ny DATABASE_URL till .env...');
    await writeEnvFile({ ...currentEnv, DATABASE_URL: connectionString });
    
    console.log('🔧 [Backend] Uppdaterar Prisma schema till provider:', provider);
    // Uppdatera schema
    await updatePrismaSchema(provider);
    
    // Generera Prisma Client
    try {
      console.log('🔧 [Backend] Genererar Prisma Client...');
      const { stdout, stderr } = await execAsync('npx prisma generate', { 
        cwd: join(__dirname, '..'),
        env: { ...process.env, DATABASE_URL: connectionString },
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });
      console.log('✅ [Backend] Prisma Client genererad');
      if (stdout) console.log('📋 [Backend] Generate stdout:', stdout.substring(0, 200));
      
      // Testa faktisk anslutning med Prisma
      try {
        console.log('🔌 [Backend] Testar databasanslutning med Prisma Client...');
        const { PrismaClient } = await import('@prisma/client');
        const testPrisma = new PrismaClient({
          datasources: {
            db: {
              url: connectionString
            }
          }
        });
        await testPrisma.$connect();
        console.log('✅ [Backend] Databasanslutning lyckades!');
        await testPrisma.$disconnect();
        console.log('✅ [Backend] Prisma Client disconnectad');
        res.json({ success: true, message: 'Anslutning testad och Prisma Client genererad - databasanslutning verifierad!' });
      } catch (connectError) {
        console.error('❌ [Backend] Databasanslutning misslyckades:', connectError.message);
        // Om anslutning failar, ge bättre felmeddelande
        let errorMsg = connectError.message;
        if (errorMsg.includes('P1000')) {
          errorMsg = 'Autentisering misslyckades. Kontrollera användarnamn och lösenord.';
        } else if (errorMsg.includes('P1001')) {
          errorMsg = 'Kan inte nå databasservern. Kontrollera nätverksanslutning.';
        } else if (errorMsg.includes('P1003')) {
          errorMsg = 'Databasen finns inte. Skapa den först: CREATE DATABASE launch_planner;';
        }
        res.status(400).json({
          success: false,
          message: `Prisma Client genererad men anslutning misslyckades: ${errorMsg}`
        });
      }
    } catch (error) {
      console.error('❌ [Backend] Prisma generate error:', error);
      const errorMessage = error.stderr || error.stdout || error.message;
      console.error('❌ [Backend] Error details:', errorMessage);
      res.status(400).json({ 
        success: false, 
        message: `Fel vid generering: ${errorMessage}` 
      });
    }
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ 
      success: false, 
      message: `Fel: ${error.message}` 
    });
  }
});

// API: Spara databaskonfiguration och kör migration
app.post('/api/database/save', async (req, res) => {
  console.log('💾 [Backend] /api/database/save - Request mottagen');
  console.log('💾 [Backend] Provider:', req.body.provider);
  console.log('💾 [Backend] Connection string:', req.body.connectionString ? `${req.body.connectionString.substring(0, 50)}...` : 'TOM');
  
  try {
    const { connectionString, provider } = req.body;

    if (!connectionString || !provider) {
      console.error('❌ [Backend] Connection string eller provider saknas');
      return res.status(400).json({
        success: false,
        message: 'Connection string och provider krävs'
      });
    }

    console.log('💾 [Backend] Sparar DATABASE_URL till .env...');
    // Spara till .env
    await writeEnvFile({ DATABASE_URL: connectionString });
    console.log('✅ [Backend] .env uppdaterad');

    console.log('💾 [Backend] Uppdaterar Prisma schema till provider:', provider);
    // Uppdatera Prisma schema
    await updatePrismaSchema(provider);
    console.log('✅ [Backend] Schema uppdaterat');
    
        // Generera Prisma Client
        try {
          console.log('💾 [Backend] Genererar Prisma Client...');
          const genResult = await execAsync('npx prisma generate', {
            cwd: join(__dirname, '..'),
            env: { ...process.env, DATABASE_URL: connectionString }
          });
          console.log('✅ [Backend] Prisma Client genererad');
          if (genResult.stdout) console.log('📋 [Backend] Generate stdout:', genResult.stdout.substring(0, 200));
        } catch (genError) {
          console.error('❌ [Backend] Prisma generate error:', genError.message);
          return res.status(400).json({
            success: false,
            message: `Fel vid generering av Prisma Client: ${genError.message}`
          });
        }
    
    // Kör migrations eller db push
    try {
        // För SQLite, använd db push (enklare för utveckling)
        if (provider === 'sqlite') {
          console.log('💾 [Backend] Kör db push för SQLite...');
          const { stdout } = await execAsync('npx prisma db push --accept-data-loss', { 
            cwd: join(__dirname, '..'),
            env: { ...process.env, DATABASE_URL: connectionString }
          });
          console.log('✅ [Backend] db push lyckades');
          if (stdout) console.log('📋 [Backend] db push output:', stdout.substring(0, 300));
          res.json({ 
            success: true, 
            message: 'Databas konfigurerad och schema pushat!',
            output: stdout 
          });
        } else {
          // För andra databaser, använd migrations
          console.log('💾 [Backend] Kör migrations för', provider, '...');
          const { stdout, stderr } = await execAsync('npx prisma migrate deploy', { 
            cwd: join(__dirname, '..'),
            env: { ...process.env, DATABASE_URL: connectionString }
          });
          console.log('✅ [Backend] Migrations körda');
          if (stdout) console.log('📋 [Backend] Migrate output:', stdout.substring(0, 300));
          
          res.json({ 
            success: true, 
            message: 'Databas konfigurerad och migrations körda!',
            output: stdout 
          });
        }
      } catch (error) {
        console.error('❌ [Backend] Migration error:', error.message);
        // Om migrations failar, försök med db push istället (för utveckling)
        console.log('💾 [Backend] Försöker med db push istället...');
        try {
          const { stdout } = await execAsync('npx prisma db push --accept-data-loss', { 
            cwd: join(__dirname, '..'),
            env: { ...process.env, DATABASE_URL: connectionString }
          });
          console.log('✅ [Backend] db push lyckades som fallback');
          res.json({ 
            success: true, 
            message: 'Databas konfigurerad och schema pushat!',
            output: stdout 
          });
        } catch (pushError) {
          console.error('❌ [Backend] db push error:', pushError);
        
        // Ge mer detaljerade felmeddelanden
        let errorMessage = pushError.message;
        if (pushError.stderr) {
          errorMessage += '\n' + pushError.stderr;
        }
        if (pushError.stdout) {
          errorMessage += '\n' + pushError.stdout;
        }
        
        // Specifika felmeddelanden baserat på Prisma error codes
        if (errorMessage.includes('P1000')) {
          errorMessage = 'Autentisering misslyckades. Kontrollera användarnamn och lösenord.';
        } else if (errorMessage.includes('P1001')) {
          errorMessage = 'Kan inte nå databasservern. Kontrollera nätverksanslutning och brandvägg.';
        } else if (errorMessage.includes('P1003')) {
          errorMessage = 'Databasen finns inte. Skapa den först: CREATE DATABASE launch_planner;';
        }
        
        res.status(400).json({ 
          success: false, 
          message: `Migration misslyckades: ${errorMessage}` 
        });
      }
    }
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ 
      success: false, 
      message: `Fel: ${error.message}` 
    });
  }
});

// API: Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password, authMethod = 'local', code, redirectUri } = req.body;
    
    if (authMethod === 'local') {
      if (!username || !password) {
        return res.status(400).json({ error: 'Användarnamn och lösenord krävs' });
      }

      const { authenticateUser } = await import('./auth.js');
      const result = await authenticateUser(username, password);
      
      if (result.success) {
        req.session.userId = result.user.id;
        req.session.userEmail = result.user.email;
        res.json({ success: true, user: result.user });
      } else {
        res.status(401).json({ success: false, message: result.message });
      }
    } else if (authMethod === 'azure') {
      // Azure AD SSO via authorization code
      if (!code || !redirectUri) {
        return res.status(400).json({ error: 'Authorization code och redirect URI krävs för Azure AD' });
      }

      // Hämta Azure AD-konfiguration
      const { getAuthConfig } = await import('./auth-config.js');
      const config = await getAuthConfig('azure');
      
      if (!config || !config.enabled) {
        return res.status(400).json({ error: 'Azure AD är inte konfigurerad' });
      }

      const { authenticateAzureUser } = await import('./auth-azure.js');
      const result = await authenticateAzureUser(code, redirectUri, config);
      
      if (result.success) {
        req.session.userId = result.user.id;
        req.session.userEmail = result.user.email;
        res.json({ success: true, user: result.user });
      } else {
        res.status(401).json({ success: false, message: result.message });
      }
    } else if (authMethod === 'ldap') {
      if (!username || !password) {
        return res.status(400).json({ error: 'Användarnamn och lösenord krävs' });
      }

      // Hämta LDAP-konfiguration
      const { getAuthConfig } = await import('./auth-config.js');
      const config = await getAuthConfig('ldap');
      
      if (!config || !config.enabled) {
        return res.status(400).json({ error: 'LDAP är inte konfigurerad' });
      }

      const { authenticateLdapUser } = await import('./auth-ldap.js');
      const result = await authenticateLdapUser(username, password, config);
      
      if (result.success) {
        req.session.userId = result.user.id;
        req.session.userEmail = result.user.email;
        res.json({ success: true, user: result.user });
      } else {
        res.status(401).json({ success: false, message: result.message });
      }
    } else if (authMethod === 'ad') {
      if (!username || !password) {
        return res.status(400).json({ error: 'Användarnamn och lösenord krävs' });
      }

      // Hämta AD-konfiguration
      const { getAuthConfig } = await import('./auth-config.js');
      const config = await getAuthConfig('ad');
      
      if (!config || !config.enabled) {
        return res.status(400).json({ error: 'Active Directory är inte konfigurerad' });
      }

      const { authenticateAdUser } = await import('./auth-ad.js');
      const result = await authenticateAdUser(username, password, config);
      
      if (result.success) {
        req.session.userId = result.user.id;
        req.session.userEmail = result.user.email;
        res.json({ success: true, user: result.user });
      } else {
        res.status(401).json({ success: false, message: result.message });
      }
    } else {
      res.status(400).json({ error: 'Ogiltig inloggningsmetod' });
    }
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Ett fel uppstod vid inloggning' });
  }
});

// API: Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Logout error:', err);
      return res.status(500).json({ error: 'Ett fel uppstod vid utloggning' });
    }
    res.json({ success: true });
  });
});

// API: Hämta aktuell användare
app.get('/api/auth/me', async (req, res) => {
  try {
    const { getUserFromSession } = await import('./auth.js');
    const user = await getUserFromSession(req.session);
    
    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, message: 'Ej autentiserad' });
    }
  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({ error: 'Ett fel uppstod' });
  }
});

// API: Hämta tillgängliga inloggningsmetoder
app.get('/api/auth/methods', async (req, res) => {
  try {
    const { getAuthConfig } = await import('./auth-config.js');
    
    const methods = [
      { id: 'local', name: 'Lokal inloggning', enabled: true },
      { id: 'azure', name: 'Azure AD SSO', enabled: false },
      { id: 'ldap', name: 'LDAP', enabled: false },
      { id: 'ad', name: 'Active Directory', enabled: false },
    ];

    // Kontrollera vilka metoder som är konfigurerade och aktiverade
    for (const method of methods) {
      if (method.id !== 'local') {
        try {
          const config = await getAuthConfig(method.id);
          // En metod är aktiverad om den har konfiguration OCH enabled är true
          method.enabled = !!(config && config.enabled === true && 
            ((method.id === 'azure' && config.tenantId && config.clientId && config.clientSecret) ||
             ((method.id === 'ldap' || method.id === 'ad') && config.url && config.baseDN)));
        } catch (err) {
          // Om det inte finns någon konfiguration, är metoden inte aktiverad
          method.enabled = false;
        }
      }
    }

    res.json({ methods });
  } catch (error) {
    console.error('❌ Error getting auth methods:', error);
    res.json({
      methods: [
        { id: 'local', name: 'Lokal inloggning', enabled: true },
        { id: 'azure', name: 'Azure AD SSO', enabled: false },
        { id: 'ldap', name: 'LDAP', enabled: false },
        { id: 'ad', name: 'Active Directory', enabled: false },
      ],
    });
  }
});

// API: Hämta auth-konfiguration
app.get('/api/auth/config', requireAuth, async (req, res) => {
  try {
    const { getAuthConfig } = await import('./auth-config.js');
    const { method } = req.query;
    
    if (method) {
      const config = await getAuthConfig(method);
      res.json({ config: config || {} });
    } else {
      // Returnera alla konfigurationer
      const configs = {
        azure: await getAuthConfig('azure'),
        ldap: await getAuthConfig('ldap'),
        ad: await getAuthConfig('ad'),
      };
      res.json({ configs });
    }
  } catch (error) {
    console.error('❌ Get auth config error:', error);
    res.status(500).json({ error: 'Ett fel uppstod' });
  }
});

// API: Spara auth-konfiguration
app.post('/api/auth/config', requireAuth, async (req, res) => {
  try {
    const { method, config } = req.body;
    
    if (!method || !config) {
      return res.status(400).json({ error: 'Metod och konfiguration krävs' });
    }

    const { saveAuthConfig } = await import('./auth-config.js');
    await saveAuthConfig(method, config);
    
    res.json({ success: true, message: 'Konfiguration sparad' });
  } catch (error) {
    console.error('❌ Save auth config error:', error);
    res.status(500).json({ error: 'Ett fel uppstod' });
  }
});

// API: Synkronisera grupper från externt system
app.post('/api/auth/sync-groups', requireAuth, async (req, res) => {
  try {
    const { method } = req.body;
    const { getAuthConfig } = await import('./auth-config.js');
    const config = await getAuthConfig(method);
    
    if (!config || !config.enabled) {
      return res.status(400).json({ error: `${method} är inte konfigurerad` });
    }

    let result;
    if (method === 'azure') {
      const { syncAllAzureGroups } = await import('./auth-azure.js');
      result = await syncAllAzureGroups(config);
    } else if (method === 'ldap') {
      const { syncAllLdapGroups } = await import('./auth-ldap.js');
      result = await syncAllLdapGroups(config);
    } else if (method === 'ad') {
      const { syncAllAdGroups } = await import('./auth-ad.js');
      result = await syncAllAdGroups(config);
    } else {
      return res.status(400).json({ error: 'Ogiltig metod' });
    }

    if (result.success) {
      res.json({ success: true, count: result.count });
    } else {
      res.status(500).json({ error: result.error || 'Synkronisering misslyckades' });
    }
  } catch (error) {
    console.error('❌ Sync groups error:', error);
    res.status(500).json({ error: 'Ett fel uppstod' });
  }
});

// API: Hämta alla grupper
app.get('/api/groups', requireAuth, async (req, res) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const { source } = req.query;
    const where = source ? { source } : {};
    
    const groups = await prisma.group.findMany({
      where,
      include: {
        _count: {
          select: { members: true, groupRoles: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    await prisma.$disconnect();
    res.json(groups);
  } catch (error) {
    console.error('❌ Get groups error:', error);
    res.status(500).json({ error: 'Ett fel uppstod' });
  }
});

// API: Skapa lokal grupp
app.post('/api/groups', requireAuth, async (req, res) => {
  console.log('💾 [Backend] /api/groups POST - Request mottagen');
  try {
    const { name, displayName, description } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Gruppnamn krävs' });
    }

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    try {
      const group = await prisma.group.create({
        data: {
          name: name.trim(),
          displayName: (displayName && displayName.trim()) || name.trim(),
          description: description && description.trim() ? description.trim() : null,
          source: 'local',
        },
      });

      console.log('✅ [Backend] Grupp skapad:', group.id);
      await prisma.$disconnect();
      res.json(group);
    } catch (dbError) {
      await prisma.$disconnect();
      console.error('❌ Create group database error:', dbError);
      
      // Om det är ett unikt constraint-fel (gruppnamn finns redan)
      if (dbError.code === 'P2002' || dbError.meta?.target?.includes('name')) {
        return res.status(400).json({ error: 'En grupp med detta namn finns redan' });
      }
      
      throw dbError;
    }
  } catch (error) {
    console.error('❌ Create group error:', error);
    res.status(500).json({ error: error.message || 'Ett fel uppstod vid skapande av grupp' });
  }
});

// API: Uppdatera grupp
app.put('/api/groups/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, displayName, description } = req.body;
    
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const group = await prisma.group.findUnique({ where: { id } });
    
    if (!group) {
      await prisma.$disconnect();
      return res.status(404).json({ error: 'Grupp hittades inte' });
    }

    // Lokala grupper kan uppdateras, externa grupper kan bara uppdatera displayName och description
    const updateData = {};
    if (group.source === 'local') {
      if (name) updateData.name = name;
    }
    if (displayName) updateData.displayName = displayName;
    if (description !== undefined) updateData.description = description;

    const updatedGroup = await prisma.group.update({
      where: { id },
      data: updateData,
    });

    await prisma.$disconnect();
    res.json(updatedGroup);
  } catch (error) {
    console.error('❌ Update group error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Ta bort grupp (endast lokala grupper)
app.delete('/api/groups/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const group = await prisma.group.findUnique({ where: { id } });
    
    if (!group) {
      await prisma.$disconnect();
      return res.status(404).json({ error: 'Grupp hittades inte' });
    }

    if (group.source !== 'local') {
      await prisma.$disconnect();
      return res.status(400).json({ error: 'Kan bara ta bort lokala grupper' });
    }

    await prisma.group.delete({ where: { id } });
    await prisma.$disconnect();
    
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Delete group error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Lägg till användare i grupp
app.post('/api/groups/:groupId/members', requireAuth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'Användar-ID krävs' });
    }

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const member = await prisma.groupMember.create({
      data: {
        userId,
        groupId,
      },
      include: {
        user: true,
      },
    });

    await prisma.$disconnect();
    res.json(member);
  } catch (error) {
    console.error('❌ Add group member error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Ta bort användare från grupp
app.delete('/api/groups/:groupId/members/:userId', requireAuth, async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    await prisma.groupMember.deleteMany({
      where: {
        userId,
        groupId,
      },
    });

    await prisma.$disconnect();
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Remove group member error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Lägg till roll till grupp
app.post('/api/groups/:groupId/roles', requireAuth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { roleId } = req.body;
    
    if (!roleId) {
      return res.status(400).json({ error: 'Roll-ID krävs' });
    }

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const groupRole = await prisma.groupRole.create({
      data: {
        groupId,
        roleId,
      },
      include: {
        role: true,
      },
    });

    await prisma.$disconnect();
    res.json(groupRole);
  } catch (error) {
    console.error('❌ Add group role error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Ta bort roll från grupp
app.delete('/api/groups/:groupId/roles/:roleId', requireAuth, async (req, res) => {
  try {
    const { groupId, roleId } = req.params;
    
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    await prisma.groupRole.deleteMany({
      where: {
        groupId,
        roleId,
      },
    });

    await prisma.$disconnect();
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Remove group role error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Hämta gruppmedlemmar
app.get('/api/groups/:id/members', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const members = await prisma.groupMember.findMany({
      where: { groupId: id },
      include: {
        user: true,
      },
    });

    await prisma.$disconnect();
    res.json(members.map(m => m.user));
  } catch (error) {
    console.error('❌ Get group members error:', error);
    res.status(500).json({ error: 'Ett fel uppstod' });
  }
});

// API: Hämta grupproller
app.get('/api/groups/:id/roles', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const groupRoles = await prisma.groupRole.findMany({
      where: { groupId: id },
      include: {
        role: true,
      },
    });

    await prisma.$disconnect();
    res.json(groupRoles.map(gr => gr.role));
  } catch (error) {
    console.error('❌ Get group roles error:', error);
    res.status(500).json({ error: 'Ett fel uppstod' });
  }
});

// API: Skapa lokal användare
app.post('/api/users', requireAuth, async (req, res) => {
  try {
    const { name, email, password, role, authMethod } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Namn, e-post och lösenord krävs' });
    }

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    // Kontrollera om e-post redan finns
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      await prisma.$disconnect();
      return res.status(400).json({ error: 'En användare med denna e-post finns redan' });
    }

    // Hasha lösenord
    const { hashPassword } = await import('./auth.js');
    const hashedPassword = await hashPassword(password);
    
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role: role || 'user',
        authMethod: authMethod || 'local',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        authMethod: true,
        createdAt: true,
      },
    });

    await prisma.$disconnect();
    console.log('✅ [Backend] Användare skapad:', user.id);
    res.json(user);
  } catch (error) {
    console.error('❌ Create user error:', error);
    res.status(500).json({ error: error.message || 'Ett fel uppstod' });
  }
});

// API: Hämta alla användare
app.get('/api/users', requireAuth, async (req, res) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        authMethod: true,
        createdAt: true,
        assignedRoles: {
          select: {
            roleId: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    await prisma.$disconnect();
    
    // Formatera användare med assignedRoles som array av IDs
    const formattedUsers = users.map(user => ({
      ...user,
      assignedRoles: user.assignedRoles.map(ur => ur.roleId),
    }));
    
    res.json(formattedUsers);
  } catch (error) {
    console.error('❌ Get users error:', error);
    res.status(500).json({ error: 'Ett fel uppstod' });
  }
});

// API: Ta bort användare
app.delete('/api/users/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.session.userId;
    
    // Förhindra att användaren tar bort sig själv
    if (id === currentUserId) {
      return res.status(400).json({ error: 'Du kan inte ta bort din egen användare' });
    }

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    // Kontrollera om användaren finns
    const user = await prisma.user.findUnique({ where: { id } });
    
    if (!user) {
      await prisma.$disconnect();
      return res.status(404).json({ error: 'Användare hittades inte' });
    }

    // Ta bort användaren (cascade tar bort relaterade poster)
    await prisma.user.delete({ where: { id } });
    await prisma.$disconnect();
    
    console.log('✅ [Backend] Användare borttagen:', id);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Delete user error:', error);
    res.status(500).json({ error: error.message || 'Ett fel uppstod' });
  }
});

// API: Tilldela roll till användare
app.post('/api/users/:userId/roles', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { roleId } = req.body;
    
    if (!roleId) {
      return res.status(400).json({ error: 'Roll-ID krävs' });
    }

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    // Kontrollera om användaren och rollen finns
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    
    if (!user) {
      await prisma.$disconnect();
      return res.status(404).json({ error: 'Användare hittades inte' });
    }
    
    if (!role) {
      await prisma.$disconnect();
      return res.status(404).json({ error: 'Roll hittades inte' });
    }

    // Skapa relation om den inte redan finns
    const userRole = await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
      update: {},
      create: {
        userId,
        roleId,
      },
    });

    await prisma.$disconnect();
    res.json({ success: true, userRole });
  } catch (error) {
    console.error('❌ Assign role to user error:', error);
    res.status(500).json({ error: error.message || 'Ett fel uppstod' });
  }
});

// API: Ta bort roll från användare
app.delete('/api/users/:userId/roles/:roleId', requireAuth, async (req, res) => {
  try {
    const { userId, roleId } = req.params;
    
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    await prisma.userRole.deleteMany({
      where: {
        userId,
        roleId,
      },
    });

    await prisma.$disconnect();
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Remove role from user error:', error);
    res.status(500).json({ error: error.message || 'Ett fel uppstod' });
  }
});

// API: Hämta alla roller
app.get('/api/roles', requireAuth, async (req, res) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const roles = await prisma.role.findMany({
      include: {
        users: {
          select: {
            userId: true,
          },
        },
        groupRoles: {
          select: {
            groupId: true,
            group: {
              select: {
                id: true,
                name: true,
                displayName: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    await prisma.$disconnect();
    
    // Formatera roller med användare och grupper
    const formattedRoles = roles.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description,
      color: role.color,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      userIds: role.users.map(ur => ur.userId),
      groupIds: role.groupRoles.map(gr => gr.groupId),
      groups: role.groupRoles.map(gr => gr.group),
    }));
    
    res.json(formattedRoles);
  } catch (error) {
    console.error('❌ Get roles error:', error);
    res.status(500).json({ error: 'Ett fel uppstod' });
  }
});

// API: Hämta en specifik roll med detaljer
app.get('/api/roles/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            userId: true,
          },
        },
        groupRoles: {
          select: {
            groupId: true,
            group: {
              select: {
                id: true,
                name: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    if (!role) {
      await prisma.$disconnect();
      return res.status(404).json({ error: 'Roll hittades inte' });
    }

    await prisma.$disconnect();
    
    const formattedRole = {
      id: role.id,
      name: role.name,
      description: role.description,
      color: role.color,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      userIds: role.users.map(ur => ur.userId),
      groupIds: role.groupRoles.map(gr => gr.groupId),
      groups: role.groupRoles.map(gr => gr.group),
    };
    
    res.json(formattedRole);
  } catch (error) {
    console.error('❌ Get role error:', error);
    res.status(500).json({ error: 'Ett fel uppstod' });
  }
});

// API: Hämta nuvarande konfiguration
app.get('/api/database/config', async (req, res) => {
  console.log('📥 [Backend] /api/database/config - Request mottagen');
  try {
    console.log('📥 [Backend] Läser .env fil...');
    const env = await readEnvFile();
    console.log('📥 [Backend] DATABASE_URL från .env:', env.DATABASE_URL ? `${env.DATABASE_URL.substring(0, 50)}...` : 'SAKNAS');
    
    console.log('📥 [Backend] Läser schema.prisma...');
    const schemaPath = join(__dirname, '..', 'prisma', 'schema.prisma');
    const schemaContent = await readFileAsync(schemaPath, 'utf-8');
    
    // Hitta datasource provider (inte generator provider)
    const datasourceMatch = schemaContent.match(/datasource\s+db\s*\{[^}]*provider\s*=\s*"([^"]+)"/);
    const provider = datasourceMatch ? datasourceMatch[1] : 'sqlite';
    console.log('📥 [Backend] Provider från schema:', provider);

    const config = {
      provider,
      url: env.DATABASE_URL || 'file:./prisma/dev.db'
    };
    console.log('📥 [Backend] Returnerar config:', { provider: config.provider, url: config.url ? `${config.url.substring(0, 50)}...` : 'SAKNAS' });
    
    res.json(config);
  } catch (error) {
    console.error('❌ [Backend] Error in /api/database/config:', error);
    res.status(500).json({
      success: false,
      message: `Fel: ${error.message}`
    });
  }
});

// Funktion för att säkerställa att databasen är skapad
async function ensureDatabase() {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    // Försök ansluta till databasen - detta skapar filen om den inte finns (för SQLite)
    await prisma.$connect();
    console.log('✅ Databas anslutning verifierad');
    
    // För SQLite, kontrollera om tabellerna finns, annars kör migrations
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ Databas är redo');
    } catch (error) {
      console.log('⚠️ Databas behöver migrations, kör: npm run db:push');
    }
    
    // Säkerställ att default-användare finns
    try {
      const defaultUser = await prisma.user.findUnique({ where: { id: 'unknown' } });
      if (!defaultUser) {
        await prisma.user.create({
          data: {
            id: 'unknown',
            name: 'Okänd användare',
            email: 'unknown@example.com',
            role: 'user',
            authMethod: 'local',
          },
        });
        console.log('✅ Default-användare skapad');
      }
    } catch (error) {
      console.log('⚠️ Kunde inte skapa default-användare:', error.message);
    }
    
    // Säkerställ att admin-användare finns
    try {
      const { ensureAdminUser } = await import('./auth.js');
      await ensureAdminUser();
    } catch (error) {
      console.log('⚠️ Kunde inte skapa admin-användare:', error.message);
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Fel vid databasanslutning:', error.message);
    console.log('💡 Tips: Kör "npm run db:push" för att skapa databasen');
  }
}

// Skydda API-routes (kräver inloggning)
// API: Hämta alla produkter
app.get('/api/products', requireAuth, async (req, res) => {
  console.log('📥 [Backend] /api/products - Request mottagen');
  try {
    const { getAllProducts } = await import('./database-api.js');
    const products = await getAllProducts();
    console.log('✅ [Backend] Hämtade', products.length, 'produkter');
    res.json(products);
  } catch (error) {
    console.error('❌ [Backend] Error fetching products:', error);
    console.error('❌ [Backend] Error stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

// API: Hämta produkt efter ID
app.get('/api/products/:id', requireAuth, async (req, res) => {
  console.log('📥 [Backend] /api/products/:id - Request mottagen, ID:', req.params.id);
  try {
    const { getProductById } = await import('./database-api.js');
    const product = await getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Produkt hittades inte' });
    }
    console.log('✅ [Backend] Produkt hittad:', product.name);
    res.json(product);
  } catch (error) {
    console.error('❌ [Backend] Error fetching product:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Skapa produkt
app.post('/api/products', requireAuth, async (req, res) => {
  console.log('💾 [Backend] /api/products POST - Request mottagen');
  console.log('💾 [Backend] Product data:', { 
    name: req.body.name, 
    gtin: req.body.gtin,
    productType: req.body.productType,
    activitiesCount: req.body.activities?.length || 0,
    retailersCount: req.body.retailers?.length || 0
  });
  try {
    const { createProduct } = await import('./database-api.js');
    const product = await createProduct(req.body);
    console.log('✅ [Backend] Produkt skapad:', product.id);
    res.json(product);
  } catch (error) {
    console.error('❌ [Backend] Error creating product:', error);
    console.error('❌ [Backend] Error message:', error.message);
    console.error('❌ [Backend] Error stack:', error.stack);
    res.status(500).json({ 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// API: Uppdatera produkt
app.put('/api/products/:id', requireAuth, async (req, res) => {
  console.log('💾 [Backend] /api/products/:id PUT - Request mottagen, ID:', req.params.id);
  try {
    const { updateProduct } = await import('./database-api.js');
    const product = await updateProduct(req.params.id, req.body);
    console.log('✅ [Backend] Produkt uppdaterad:', req.params.id);
    res.json(product);
  } catch (error) {
    console.error('❌ [Backend] Error updating product:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Ta bort produkt
app.delete('/api/products/:id', requireAuth, async (req, res) => {
  console.log('🗑️ [Backend] /api/products/:id DELETE - Request mottagen, ID:', req.params.id);
  try {
    const { deleteProduct } = await import('./database-api.js');
    await deleteProduct(req.params.id);
    console.log('✅ [Backend] Produkt borttagen:', req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ [Backend] Error deleting product:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Uppdatera aktivitet
app.put('/api/activities/:id', requireAuth, async (req, res) => {
  console.log('💾 [Backend] /api/activities/:id PUT - Request mottagen, ID:', req.params.id);
  try {
    const { updateActivity } = await import('./database-api.js');
    const activity = await updateActivity(req.params.id, req.body);
    console.log('✅ [Backend] Aktivitet uppdaterad:', req.params.id);
    res.json(activity);
  } catch (error) {
    console.error('❌ [Backend] Error updating activity:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Lägg till kommentar
app.post('/api/activities/:id/comments', requireAuth, async (req, res) => {
  console.log('💾 [Backend] /api/activities/:id/comments POST - Request mottagen, Activity ID:', req.params.id);
  try {
    const { addComment } = await import('./database-api.js');
    const comment = await addComment(req.params.id, req.body);
    console.log('✅ [Backend] Kommentar tillagd till aktivitet:', req.params.id);
    res.json(comment);
  } catch (error) {
    console.error('❌ [Backend] Error adding comment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Säkerställ databas vid start
ensureDatabase();

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} är redan upptagen!`);
    console.error(`💡 Lösning: Stoppa den process som kör på port ${PORT}:`);
    console.error(`   lsof -ti:${PORT} | xargs kill -9`);
    console.error(`   eller hitta processen manuellt: lsof -i:${PORT}`);
  } else {
    console.error('❌ Serverfel:', err);
  }
  process.exit(1);
});

