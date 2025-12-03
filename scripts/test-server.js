// Testscript för att verifiera att servern fungerar
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ success: true, message: 'Server fungerar!' });
});

// Test Prisma
app.get('/test-prisma', async (req, res) => {
  try {
    const prisma = new PrismaClient();
    await prisma.$connect();
    await prisma.$disconnect();
    res.json({ success: true, message: 'Prisma fungerar!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Testserver körs på http://localhost:${PORT}`);
  console.log(`   Test: http://localhost:${PORT}/test`);
  console.log(`   Prisma: http://localhost:${PORT}/test-prisma`);
});

