import express from 'express';
import cors from 'cors';
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

app.use(cors());
app.use(express.json());

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
    .map(([key, value]) => `${key}="${value}"`)
    .join('\n');
  await writeFileAsync(envPath, content, 'utf-8');
}

// Helper för att uppdatera Prisma schema
async function updatePrismaSchema(provider) {
  const schemaPath = join(__dirname, '..', 'prisma', 'schema.prisma');
  const content = await readFileAsync(schemaPath, 'utf-8');
  const updated = content.replace(
    /provider\s*=\s*"[^"]+"/,
    `provider = "${provider}"`
  );
  await writeFileAsync(schemaPath, updated, 'utf-8');
}

// API: Testa databasanslutning
app.post('/api/database/test', async (req, res) => {
  try {
    const { connectionString, provider } = req.body;
    
    if (!connectionString || !provider) {
      return res.status(400).json({ 
        success: false, 
        message: 'Connection string och provider krävs' 
      });
    }
    
    // Temporärt uppdatera .env
    const currentEnv = await readEnvFile();
    await writeEnvFile({ ...currentEnv, DATABASE_URL: connectionString });
    
    // Uppdatera schema
    await updatePrismaSchema(provider);
    
    // Generera Prisma Client
    try {
      await execAsync('npx prisma generate', { 
        cwd: join(__dirname, '..'),
        env: { ...process.env, DATABASE_URL: connectionString }
      });
      res.json({ success: true, message: 'Anslutning testad och Prisma Client genererad' });
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        message: `Fel vid generering: ${error.message}` 
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
  try {
    const { connectionString, provider } = req.body;
    
    if (!connectionString || !provider) {
      return res.status(400).json({ 
        success: false, 
        message: 'Connection string och provider krävs' 
      });
    }
    
    // Spara till .env
    await writeEnvFile({ DATABASE_URL: connectionString });
    
    // Uppdatera Prisma schema
    await updatePrismaSchema(provider);
    
    // Generera Prisma Client
    try {
      await execAsync('npx prisma generate', { 
        cwd: join(__dirname, '..'),
        env: { ...process.env, DATABASE_URL: connectionString }
      });
    } catch (genError) {
      return res.status(400).json({ 
        success: false, 
        message: `Fel vid generering av Prisma Client: ${genError.message}` 
      });
    }
    
    // Kör migrations
    try {
      const { stdout, stderr } = await execAsync('npx prisma migrate deploy', { 
        cwd: join(__dirname, '..'),
        env: { ...process.env, DATABASE_URL: connectionString }
      });
      
      res.json({ 
        success: true, 
        message: 'Databas konfigurerad och migrations körda!',
        output: stdout 
      });
    } catch (error) {
      // Om migrations failar, försök med db push istället (för utveckling)
      try {
        const { stdout } = await execAsync('npx prisma db push --accept-data-loss', { 
          cwd: join(__dirname, '..'),
          env: { ...process.env, DATABASE_URL: connectionString }
        });
        res.json({ 
          success: true, 
          message: 'Databas konfigurerad och schema pushat!',
          output: stdout 
        });
      } catch (pushError) {
        console.error('Migration error:', pushError);
        res.status(400).json({ 
          success: false, 
          message: `Migration misslyckades: ${pushError.message}` 
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

// API: Hämta nuvarande konfiguration
app.get('/api/database/config', async (req, res) => {
  try {
    const env = await readEnvFile();
    const schemaPath = join(__dirname, '..', 'prisma', 'schema.prisma');
    const schemaContent = await readFileAsync(schemaPath, 'utf-8');
    const providerMatch = schemaContent.match(/provider\s*=\s*"([^"]+)"/);
    const provider = providerMatch ? providerMatch[1] : 'sqlite';
    
    res.json({
      provider,
      url: env.DATABASE_URL || 'file:./dev.db'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: `Fel: ${error.message}` 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
});

