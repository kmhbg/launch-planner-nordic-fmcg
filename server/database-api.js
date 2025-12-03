// Database API wrapper för backend
// Använder Prisma Client direkt (körs på servern där Prisma fungerar)

import { PrismaClient } from '@prisma/client';

// Singleton pattern för Prisma Client
const globalForPrisma = globalThis;
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Helper functions (kopierade från src/lib/db.ts)
function prismaToProduct(prismaProduct) {
  return {
    id: prismaProduct.id,
    gtin: prismaProduct.gtin,
    name: prismaProduct.name,
    productType: prismaProduct.productType,
    launchWeek: prismaProduct.launchWeek,
    launchYear: prismaProduct.launchYear,
    launchDate: new Date(prismaProduct.launchDate),
    category: prismaProduct.category || undefined,
    retailers: prismaProduct.retailers?.map((r) => ({
      retailer: r.retailer,
      launchWeeks: JSON.parse(r.launchWeeks),
      launchYear: r.launchYear,
    })) || [],
    status: prismaProduct.status,
    activities: prismaProduct.activities?.map(prismaToActivity) || [],
    createdAt: new Date(prismaProduct.createdAt),
    updatedAt: new Date(prismaProduct.updatedAt),
    createdBy: prismaProduct.createdById,
    delistingRequestedBy: prismaProduct.delistingRequestedBy || undefined,
  };
}

function prismaToActivity(prismaActivity) {
  return {
    id: prismaActivity.id,
    templateId: prismaActivity.templateId,
    productId: prismaActivity.productId,
    name: prismaActivity.name,
    description: prismaActivity.description,
    deadline: new Date(prismaActivity.deadline),
    deadlineWeek: prismaActivity.deadlineWeek,
    status: prismaActivity.status,
    assigneeId: prismaActivity.assigneeId || undefined,
    assigneeName: prismaActivity.assigneeName || undefined,
    comments: prismaActivity.comments?.map(prismaToComment) || [],
    category: prismaActivity.category,
    order: prismaActivity.order,
  };
}

function prismaToComment(prismaComment) {
  return {
    id: prismaComment.id,
    userId: prismaComment.userId,
    userName: prismaComment.userName,
    text: prismaComment.text,
    createdAt: prismaComment.createdAt instanceof Date 
      ? prismaComment.createdAt 
      : new Date(prismaComment.createdAt),
  };
}

export async function getAllProducts() {
  const products = await prisma.product.findMany({
    include: {
      retailers: true,
      activities: {
        include: {
          comments: true,
        },
        orderBy: {
          order: 'asc',
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  return products.map(prismaToProduct);
}

export async function getProductById(id) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      retailers: true,
      activities: {
        include: {
          comments: true,
        },
        orderBy: {
          order: 'asc',
        },
      },
    },
  });
  return product ? prismaToProduct(product) : null;
}

export async function createProduct(productData) {
  console.log('🔧 [database-api] createProduct - Input data:', {
    gtin: productData.gtin,
    name: productData.name,
    productType: productData.productType,
    activitiesCount: productData.activities?.length || 0,
    retailersCount: productData.retailers?.length || 0,
  });
  
  try {
    // Säkerställ att användaren finns i databasen
    const userId = productData.createdBy || 'unknown';
    let user = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!user) {
      // Skapa default-användare om den inte finns
      console.log('👤 [database-api] Skapar default-användare:', userId);
      user = await prisma.user.create({
        data: {
          id: userId,
          name: userId === 'unknown' ? 'Okänd användare' : userId,
          email: userId === 'unknown' ? 'unknown@example.com' : `${userId}@example.com`,
          role: 'user',
        },
      });
    }
    
    // Konvertera datum till Date-objekt om de är strings
    const launchDate = productData.launchDate 
      ? (productData.launchDate instanceof Date ? productData.launchDate : new Date(productData.launchDate))
      : new Date();
    
    const product = await prisma.product.create({
      data: {
        gtin: productData.gtin,
        name: productData.name,
        productType: productData.productType || 'launch',
        launchWeek: productData.launchWeek,
        launchYear: productData.launchYear,
        launchDate: launchDate,
        category: productData.category || null,
        status: productData.status || 'draft',
        createdById: userId,
        delistingRequestedBy: productData.delistingRequestedBy || null,
        retailers: {
          create: (productData.retailers || []).map(r => ({
            retailer: r.retailer,
            launchWeeks: JSON.stringify(r.launchWeeks || []),
            launchYear: r.launchYear,
          })),
        },
        activities: {
          create: (productData.activities || []).map(a => ({
            templateId: a.templateId || null,
            name: a.name,
            description: a.description || null,
            deadline: a.deadline ? (a.deadline instanceof Date ? a.deadline : new Date(a.deadline)) : new Date(),
            deadlineWeek: a.deadlineWeek || null,
            status: a.status || 'not_started',
            assigneeId: a.assigneeId || null,
            assigneeName: a.assigneeName || null,
            category: a.category || null,
            order: a.order || 0,
          })),
        },
      },
      include: {
        retailers: true,
        activities: {
          include: {
            comments: true,
          },
        },
      },
    });
    console.log('✅ [database-api] Produkt skapad i databas:', product.id);
    return prismaToProduct(product);
  } catch (error) {
    console.error('❌ [database-api] Error i createProduct:', error);
    console.error('❌ [database-api] Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
    });
    throw error;
  }
}

export async function updateProduct(id, updates) {
  const updateData = {};
  
  if (updates.gtin) updateData.gtin = updates.gtin;
  if (updates.name) updateData.name = updates.name;
  if (updates.productType) updateData.productType = updates.productType;
  if (updates.launchWeek) updateData.launchWeek = updates.launchWeek;
  if (updates.launchYear) updateData.launchYear = updates.launchYear;
  if (updates.launchDate) updateData.launchDate = updates.launchDate;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.status) updateData.status = updates.status;
  if (updates.createdBy) updateData.createdById = updates.createdBy;
  if (updates.delistingRequestedBy !== undefined) updateData.delistingRequestedBy = updates.delistingRequestedBy;
  
  const product = await prisma.product.update({
    where: { id },
    data: updateData,
    include: {
      retailers: true,
      activities: {
        include: {
          comments: true,
        },
        orderBy: {
          order: 'asc',
        },
      },
    },
  });
  return prismaToProduct(product);
}

export async function deleteProduct(id) {
  await prisma.product.delete({
    where: { id },
  });
}

export async function updateActivity(id, updates) {
  const updateData = {};
  if (updates.status) updateData.status = updates.status;
  if (updates.assigneeId !== undefined) updateData.assigneeId = updates.assigneeId;
  if (updates.assigneeName !== undefined) updateData.assigneeName = updates.assigneeName;
  
  const activity = await prisma.activity.update({
    where: { id },
    data: updateData,
    include: {
      comments: true,
    },
  });
  return prismaToActivity(activity);
}

export async function addComment(activityId, comment) {
  // Säkerställ att användaren finns i databasen
  const userId = comment.userId;
  let user = await prisma.user.findUnique({ where: { id: userId } });
  
  if (!user) {
    // Skapa användare om den inte finns
    console.log('👤 [database-api] Skapar användare för kommentar:', userId);
    user = await prisma.user.create({
      data: {
        id: userId,
        name: comment.userName || userId,
        email: `${userId}@example.com`,
        role: 'user',
      },
    });
  }
  
  const createdComment = await prisma.comment.create({
    data: {
      activityId: activityId,
      userId: userId,
      userName: comment.userName,
      text: comment.text,
    },
  });
  return prismaToComment(createdComment);
}

