import { prisma, prismaToProduct, prismaToUser, prismaToRole, prismaToTemplate, prismaToActivity, prismaToComment } from '../lib/db';
import { Product, Activity, User, Template, ActivityTemplate, RetailerLaunch, Role, Comment } from '../types';

export class DatabaseService {
  // Products
  async getAllProducts(): Promise<Product[]> {
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

  async getProductById(id: string): Promise<Product | null> {
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

  async createProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const product = await prisma.product.create({
      data: {
        gtin: productData.gtin,
        name: productData.name,
        productType: productData.productType,
        launchWeek: productData.launchWeek,
        launchYear: productData.launchYear,
        launchDate: productData.launchDate,
        category: productData.category,
        status: productData.status,
        createdById: productData.createdBy,
        delistingRequestedBy: productData.delistingRequestedBy,
        retailers: {
          create: productData.retailers?.map(r => ({
            retailer: r.retailer,
            launchWeeks: JSON.stringify(r.launchWeeks),
            launchYear: r.launchYear,
          })) || [],
        },
        activities: {
          create: productData.activities.map(a => ({
            templateId: a.templateId,
            name: a.name,
            description: a.description,
            deadline: a.deadline,
            deadlineWeek: a.deadlineWeek,
            status: a.status,
            assigneeId: a.assigneeId,
            assigneeName: a.assigneeName,
            category: a.category,
            order: a.order,
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
    return prismaToProduct(product);
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const updateData: any = {};
    
    if (updates.gtin) updateData.gtin = updates.gtin;
    if (updates.name) updateData.name = updates.name;
    if (updates.productType) updateData.productType = updates.productType;
    if (updates.launchWeek) updateData.launchWeek = updates.launchWeek;
    if (updates.launchYear) updateData.launchYear = updates.launchYear;
    if (updates.launchDate) updateData.launchDate = updates.launchDate;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.status) updateData.status = updates.status;
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
        },
      },
    });

    // Uppdatera retailers om de finns
    if (updates.retailers) {
      // Ta bort gamla retailers
      await prisma.retailerLaunch.deleteMany({
        where: { productId: id },
      });
      // Lägg till nya retailers
      await prisma.retailerLaunch.createMany({
        data: updates.retailers.map(r => ({
          productId: id,
          retailer: r.retailer,
          launchWeeks: JSON.stringify(r.launchWeeks),
          launchYear: r.launchYear,
        })),
      });
    }

    const updatedProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        retailers: true,
        activities: {
          include: {
            comments: true,
          },
        },
      },
    });

    return prismaToProduct(updatedProduct!);
  }

  async deleteProduct(id: string): Promise<void> {
    await prisma.product.delete({
      where: { id },
    });
  }

  // Activities
  async updateActivity(productId: string, activityId: string, updates: Partial<Activity>): Promise<Activity> {
    const updateData: any = {};
    if (updates.status) updateData.status = updates.status;
    if (updates.assigneeId !== undefined) updateData.assigneeId = updates.assigneeId;
    if (updates.assigneeName !== undefined) updateData.assigneeName = updates.assigneeName;

    const activity = await prisma.activity.update({
      where: { id: activityId },
      data: updateData,
      include: {
        comments: true,
      },
    });
    return prismaToActivity(activity);
  }

  async addComment(productId: string, activityId: string, comment: Comment): Promise<Comment> {
    const newComment = await prisma.comment.create({
      data: {
        activityId,
        userId: comment.userId,
        userName: comment.userName,
        text: comment.text,
      },
    });
    return prismaToComment(newComment);
  }

  // Users
  async getAllUsers(): Promise<User[]> {
    const users = await prisma.user.findMany({
      include: {
        assignedRoles: {
          include: {
            role: true,
          },
        },
      },
    });
    return users.map(u => ({
      ...prismaToUser(u),
      assignedRoles: u.assignedRoles.map(ur => ur.roleId),
    }));
  }

  async getUserById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        assignedRoles: {
          include: {
            role: true,
          },
        },
      },
    });
    return user ? {
      ...prismaToUser(user),
      assignedRoles: user.assignedRoles.map(ur => ur.roleId),
    } : null;
  }

  async createUser(userData: Omit<User, 'id'>): Promise<User> {
    const user = await prisma.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        role: userData.role,
        avatar: userData.avatar,
        assignedRoles: {
          create: userData.assignedRoles.map(roleId => ({
            roleId,
          })),
        },
      },
      include: {
        assignedRoles: true,
      },
    });
    return {
      ...prismaToUser(user),
      assignedRoles: user.assignedRoles.map(ur => ur.roleId),
    };
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.email) updateData.email = updates.email;
    if (updates.role) updateData.role = updates.role;
    if (updates.avatar !== undefined) updateData.avatar = updates.avatar;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        assignedRoles: true,
      },
    });

    // Uppdatera roller om de finns
    if (updates.assignedRoles) {
      await prisma.userRole.deleteMany({
        where: { userId: id },
      });
      await prisma.userRole.createMany({
        data: updates.assignedRoles.map(roleId => ({
          userId: id,
          roleId,
        })),
      });
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id },
      include: {
        assignedRoles: true,
      },
    });

    return {
      ...prismaToUser(updatedUser!),
      assignedRoles: updatedUser!.assignedRoles.map(ur => ur.roleId),
    };
  }

  // Roles
  async getAllRoles(): Promise<Role[]> {
    const roles = await prisma.role.findMany({
      orderBy: {
        name: 'asc',
      },
    });
    return roles.map(prismaToRole);
  }

  async createRole(roleData: Omit<Role, 'id'>): Promise<Role> {
    const role = await prisma.role.create({
      data: {
        name: roleData.name,
        description: roleData.description,
        color: roleData.color,
      },
    });
    return prismaToRole(role);
  }

  async updateRole(id: string, updates: Partial<Role>): Promise<Role> {
    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.color !== undefined) updateData.color = updates.color;

    const role = await prisma.role.update({
      where: { id },
      data: updateData,
    });
    return prismaToRole(role);
  }

  async deleteRole(id: string): Promise<void> {
    await prisma.role.delete({
      where: { id },
    });
  }

  // Templates
  async getAllTemplates(): Promise<Template[]> {
    const templates = await prisma.template.findMany({
      include: {
        activities: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });
    return templates.map(prismaToTemplate);
  }

  async createTemplate(templateData: Omit<Template, 'id'>): Promise<Template> {
    const template = await prisma.template.create({
      data: {
        name: templateData.name,
        description: templateData.description,
        isDefault: templateData.isDefault,
        activities: {
          create: templateData.activities.map(a => ({
            name: a.name,
            description: a.description,
            weeksBeforeLaunch: a.weeksBeforeLaunch,
            defaultAssigneeRole: a.defaultAssigneeRole,
            category: a.category,
            required: a.required,
            order: a.order,
          })),
        },
      },
      include: {
        activities: true,
      },
    });
    return prismaToTemplate(template);
  }

  async updateTemplate(id: string, updates: Partial<Template>): Promise<Template> {
    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.isDefault !== undefined) updateData.isDefault = updates.isDefault;

    const template = await prisma.template.update({
      where: { id },
      data: updateData,
      include: {
        activities: true,
      },
    });
    return prismaToTemplate(template);
  }
}

export const dbService = new DatabaseService();

