// Testscript för att verifiera databasanslutning
import { PrismaClient } from '@prisma/client';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testDatabase() {
  console.log('🔍 Testar databasanslutning...\n');

  // Läs .env
  try {
    const envPath = join(__dirname, '..', '.env');
    const envContent = await readFile(envPath, 'utf-8');
    const dbUrlMatch = envContent.match(/DATABASE_URL="?([^"\n]+)"?/);
    
    if (dbUrlMatch) {
      const dbUrl = dbUrlMatch[1];
      console.log('📋 DATABASE_URL:', dbUrl.replace(/:[^:@]+@/, ':****@')); // Dölj lösenord
      
      // Detektera provider från URL
      let provider = 'unknown';
      if (dbUrl.startsWith('file:')) {
        provider = 'sqlite';
      } else if (dbUrl.startsWith('postgresql://')) {
        provider = 'postgresql';
      } else if (dbUrl.startsWith('mysql://')) {
        provider = 'mysql';
      } else if (dbUrl.startsWith('sqlserver://')) {
        provider = 'sqlserver';
      }
      console.log('🔧 Detekterad provider:', provider);
    } else {
      console.log('⚠️ Kunde inte läsa DATABASE_URL från .env');
    }
  } catch (error) {
    console.log('⚠️ Kunde inte läsa .env:', error.message);
  }

  // Testa Prisma
  console.log('\n📦 Testar Prisma Client...');
  try {
    const prisma = new PrismaClient({
      log: ['error', 'warn'],
    });

    console.log('🔌 Försöker ansluta...');
    await prisma.$connect();
    console.log('✅ Anslutning lyckades!');

    // Testa en enkel query
    console.log('🧪 Testar query...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Query fungerar!', result);

    // Testa om tabeller finns
    try {
      const tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `;
      console.log('📊 Tabeller i databasen:', tables);
    } catch (e) {
      // För SQLite, testa annat sätt
      try {
        await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table'`;
        console.log('📊 SQLite databas - tabeller finns');
      } catch (e2) {
        console.log('⚠️ Kunde inte lista tabeller:', e2.message);
      }
    }

    await prisma.$disconnect();
    console.log('\n✅ Alla tester passerade!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fel vid databastest:');
    console.error('Meddelande:', error.message);
    console.error('Kod:', error.code);
    
    if (error.code === 'P1001') {
      console.error('\n💡 Tips: Databasen kan inte nås. Kontrollera:');
      console.error('   - Är databasservern igång?');
      console.error('   - Är connection string korrekt?');
      console.error('   - Finns brandväggsregler som blockerar?');
    } else if (error.code === 'P1000') {
      console.error('\n💡 Tips: Autentisering misslyckades. Kontrollera:');
      console.error('   - Är användarnamn och lösenord korrekt?');
      console.error('   - Har användaren rätt behörigheter?');
    } else if (error.code === 'P1003') {
      console.error('\n💡 Tips: Databasen finns inte. Skapa den först:');
      console.error('   CREATE DATABASE launch_planner;');
    }
    
    process.exit(1);
  }
}

testDatabase();

