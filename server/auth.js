// Authentication middleware och helpers
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Skapar default admin-användare vid första start
 */
export async function ensureAdminUser() {
  try {
    // Försök hitta admin-användare med email eller användarnamn "admin"
    const adminUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'admin@launchplanner.local' },
          { email: 'admin' },
          { name: 'admin' },
        ],
      },
    });

    if (!adminUser) {
      // Hasha lösenordet 'admin'
      const hashedPassword = await bcrypt.hash('admin', 10);
      
      await prisma.user.create({
        data: {
          id: 'admin',
          name: 'Administratör',
          email: 'admin@launchplanner.local',
          password: hashedPassword,
          role: 'admin',
          authMethod: 'local',
        },
      });
      console.log('✅ Default admin-användare skapad (användarnamn: admin, lösenord: admin)');
    } else if (!adminUser.password) {
      // Om admin-användaren finns men saknar lösenord, lägg till det
      const hashedPassword = await bcrypt.hash('admin', 10);
      await prisma.user.update({
        where: { id: adminUser.id },
        data: { password: hashedPassword },
      });
      console.log('✅ Admin-användarens lösenord uppdaterat');
    }
  } catch (error) {
    console.error('❌ Fel vid skapande av admin-användare:', error);
  }
}

/**
 * Verifierar lösenord för lokal inloggning
 */
export async function verifyPassword(plainPassword, hashedPassword) {
  return await bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Hashar ett lösenord
 */
export async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

/**
 * Autentiserar användare med användarnamn och lösenord
 */
export async function authenticateUser(username, password) {
  try {
    // Försök hitta användare med email eller användarnamn
    // För admin, acceptera både "admin" och "admin@launchplanner.local"
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: username },
          { name: username },
        ],
        authMethod: 'local',
      },
    });

    // Special case: om användaren skriver "admin", hitta admin-användaren
    if (!user && (username.toLowerCase() === 'admin')) {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: 'admin@launchplanner.local' },
            { id: 'admin' },
            { name: 'Administratör' },
          ],
          authMethod: 'local',
        },
      });
    }

    if (!user || !user.password) {
      return { success: false, message: 'Ogiltigt användarnamn eller lösenord' };
    }

    const isValid = await verifyPassword(password, user.password);
    
    if (!isValid) {
      return { success: false, message: 'Ogiltigt användarnamn eller lösenord' };
    }

    // Uppdatera lastLogin
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

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
    console.error('❌ Fel vid autentisering:', error);
    return { success: false, message: 'Ett fel uppstod vid inloggning' };
  }
}

/**
 * Hämtar användare från session
 */
export async function getUserFromSession(session) {
  if (!session || !session.userId) {
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        assignedRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      assignedRoles: user.assignedRoles.map(ur => ur.roleId),
    };
  } catch (error) {
    console.error('❌ Fel vid hämtning av användare:', error);
    return null;
  }
}

