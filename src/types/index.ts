// Datamodell för Launch Planner

export type TaskStatus = 'not_started' | 'in_progress' | 'completed';

export type UserRole = 'admin' | 'user';

export interface Role {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  assignedRoles: string[]; // Array av Role IDs som användaren har
  avatar?: string;
}

export interface ActivityTemplate {
  id: string;
  name: string;
  description: string;
  weeksBeforeLaunch: number; // Negativt tal, t.ex. -15
  defaultAssigneeRole?: string;
  category: string;
  required: boolean;
  order: number;
}

export interface Activity {
  id: string;
  templateId: string;
  productId: string;
  name: string;
  description: string;
  deadline: Date;
  deadlineWeek: number; // Vecka relativt lanseringsvecka
  assigneeId?: string;
  assigneeName?: string;
  status: TaskStatus;
  comments: Comment[];
  category: string;
  order: number;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: Date;
}

export interface RetailerLaunch {
  retailer: string; // ICA, Axfood, Coop, etc.
  launchWeeks: number[]; // Array av veckor, t.ex. [3, 5, 8]
  launchYear: number;
}

export type ProductType = 'launch' | 'delisting';

export interface Product {
  id: string;
  gtin: string;
  name: string;
  productType: ProductType; // 'launch' eller 'delisting'
  launchWeek: number; // ISO vecka - tidigaste veckan från alla retailers (eller delistingsvecka)
  launchYear: number;
  launchDate: Date; // Datum för tidigaste veckan (eller delistingsdatum)
  category?: string;
  retailers?: RetailerLaunch[]; // Array av kedjor med deras lanseringsveckor (endast för lansering)
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  activities: Activity[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  delistingRequestedBy?: string; // Användare som begärt delisting
}

export interface Template {
  id: string;
  name: string;
  description: string;
  activities: ActivityTemplate[];
  isDefault: boolean;
  retailer?: string; // Om specifik för en kedja
}

export interface AppSettings {
  defaultTemplateId: string;
  defaultWeeksBeforeLaunch: number;
  retailerSpecificTemplates: Record<string, string>; // retailer -> templateId
}

