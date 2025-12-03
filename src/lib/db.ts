import { PrismaClient } from '@prisma/client';
import { Product, Activity, User, Template, ActivityTemplate, Role, Comment } from '../types';

// Singleton pattern för Prisma Client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Helper functions för att konvertera mellan Prisma och app-typer

interface PrismaProduct {
  id: string;
  gtin: string;
  name: string;
  productType: string;
  launchWeek: number | null;
  launchYear: number | null;
  launchDate: Date | string;
  category: string | null;
  retailers?: Array<{
    retailer: string;
    launchWeeks: string;
    launchYear: number;
  }>;
  status: string;
  activities?: unknown[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export function prismaToProduct(prismaProduct: PrismaProduct): Product {
  return {
    id: prismaProduct.id,
    gtin: prismaProduct.gtin,
    name: prismaProduct.name,
    productType: prismaProduct.productType as 'launch' | 'delisting',
    launchWeek: prismaProduct.launchWeek,
    launchYear: prismaProduct.launchYear,
    launchDate: new Date(prismaProduct.launchDate),
    category: prismaProduct.category || undefined,
    retailers: prismaProduct.retailers?.map((r: { retailer: string; launchWeeks: string; launchYear: number }) => ({
      retailer: r.retailer,
      launchWeeks: JSON.parse(r.launchWeeks),
      launchYear: r.launchYear,
    })) || [],
    status: prismaProduct.status as Product['status'],
    activities: prismaProduct.activities?.map(prismaToActivity) || [],
    createdAt: new Date(prismaProduct.createdAt),
    updatedAt: new Date(prismaProduct.updatedAt),
    createdBy: prismaProduct.createdById,
    delistingRequestedBy: prismaProduct.delistingRequestedBy || undefined,
  };
}

export function prismaToActivity(prismaActivity: any): Activity {
  return {
    id: prismaActivity.id,
    templateId: prismaActivity.templateId,
    productId: prismaActivity.productId,
    name: prismaActivity.name,
    description: prismaActivity.description,
    deadline: new Date(prismaActivity.deadline),
    deadlineWeek: prismaActivity.deadlineWeek,
    status: prismaActivity.status as Activity['status'],
    assigneeId: prismaActivity.assigneeId || undefined,
    assigneeName: prismaActivity.assigneeName || undefined,
    comments: prismaActivity.comments?.map(prismaToComment) || [],
    category: prismaActivity.category,
    order: prismaActivity.order,
  };
}

export function prismaToComment(prismaComment: any): Comment {
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

export function prismaToUser(prismaUser: any): User {
  return {
    id: prismaUser.id,
    name: prismaUser.name,
    email: prismaUser.email,
    role: prismaUser.role as User['role'],
    avatar: prismaUser.avatar || undefined,
    assignedRoles: prismaUser.assignedRoles?.map((ur: any) => ur.roleId) || [],
  };
}

export function prismaToRole(prismaRole: any): Role {
  return {
    id: prismaRole.id,
    name: prismaRole.name,
    description: prismaRole.description || undefined,
    color: prismaRole.color || undefined,
  };
}

export function prismaToTemplate(prismaTemplate: any): Template {
  return {
    id: prismaTemplate.id,
    name: prismaTemplate.name,
    description: prismaTemplate.description || undefined,
    isDefault: prismaTemplate.isDefault,
    activities: prismaTemplate.activities?.map(prismaToActivityTemplate) || [],
  };
}

export function prismaToActivityTemplate(prismaTemplate: any): ActivityTemplate {
  return {
    id: prismaTemplate.id,
    name: prismaTemplate.name,
    description: prismaTemplate.description,
    weeksBeforeLaunch: prismaTemplate.weeksBeforeLaunch,
    defaultAssigneeRole: prismaTemplate.defaultAssigneeRole || undefined,
    category: prismaTemplate.category,
    required: prismaTemplate.required,
    order: prismaTemplate.order,
  };
}

