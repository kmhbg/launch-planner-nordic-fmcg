import { create } from 'zustand';
import { Product, Activity, User, Template, ActivityTemplate, RetailerLaunch, Role } from '../types';
import { generateActivities, DEFAULT_ECR_TEMPLATE, getLaunchDate } from '../utils/timeline';
import { DELISTING_TEMPLATE } from '../utils/delisting-template';
import { getWeek, getYear } from 'date-fns';
import { calculateProductStatus } from '../utils/product-status';

interface AppState {
  // Data
  products: Product[];
  users: User[];
  roles: Role[];
  templates: Template[];
  currentUser: User | null;
  
  // UI State
  selectedProductId: string | null;
  viewMode: 'dashboard' | 'product' | 'timeline' | 'sales' | 'settings';
  
  // Actions
  setCurrentUser: (user: User) => void;
  addProduct: (product: Omit<Product, 'id' | 'activities' | 'createdAt' | 'updatedAt' | 'launchWeek' | 'launchDate'> & { retailers?: RetailerLaunch[]; launchWeek?: number }) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  updateActivity: (productId: string, activityId: string, updates: Partial<Activity>) => void;
  addComment: (productId: string, activityId: string, comment: Activity['comments'][0]) => void;
  setSelectedProduct: (id: string | null) => void;
  setViewMode: (mode: AppState['viewMode']) => void;
  updateTemplate: (id: string, updates: Partial<Template>) => void;
  createTemplate: (template: Omit<Template, 'id'>) => void;
  addRole: (role: Omit<Role, 'id'>) => void;
  updateRole: (id: string, updates: Partial<Role>) => void;
  deleteRole: (id: string) => void;
  assignUserToRole: (userId: string, roleId: string) => void;
  removeUserFromRole: (userId: string, roleId: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  products: [],
  roles: [
    { id: 'masterdata', name: 'Masterdata ansvarig', description: 'Ansvarig för artikeldata och GS1-validering' },
    { id: 'kam', name: 'KAM', description: 'Key Account Manager - ansvarig för kundrelationer' },
    { id: 'logistics', name: 'Logistikansvarig', description: 'Ansvarig för logistik och leveranser' },
    { id: 'production', name: 'Produktionsansvarig', description: 'Ansvarig för produktion' },
    { id: 'commercial', name: 'Kommersiell ansvarig', description: 'Ansvarig för pris och villkor' },
  ],
  users: [
    {
      id: '1',
      name: 'Admin Användare',
      email: 'admin@example.com',
      role: 'admin',
      assignedRoles: [],
    },
    {
      id: '2',
      name: 'Produktchef',
      email: 'produktchef@example.com',
      role: 'user',
      assignedRoles: ['masterdata'],
    },
    {
      id: '3',
      name: 'Logistikansvarig',
      email: 'logistik@example.com',
      role: 'user',
      assignedRoles: ['logistics'],
    },
    {
      id: '4',
      name: 'KAM Användare',
      email: 'kam@example.com',
      role: 'user',
      assignedRoles: ['kam'],
    },
  ],
  templates: [
    {
      id: 'ecr-16w',
      name: 'ECR 16-veckorsprocess',
      description: 'Standardprocess för produktlansering i dagligvaruhandel',
      activities: DEFAULT_ECR_TEMPLATE,
      isDefault: true,
    },
    {
      id: 'delisting',
      name: 'Delisting-process (Validoo)',
      description: 'Process för att delista produkter via Validoo',
      activities: DELISTING_TEMPLATE,
      isDefault: false,
    },
  ],
  currentUser: null,
  selectedProductId: null,
  viewMode: 'dashboard',
  
  // Actions
  setCurrentUser: (user) => set({ currentUser: user }),
  
  addProduct: (productData) => {
    // Välj mall baserat på produkttyp
    let template;
    if (productData.productType === 'delisting') {
      template = get().templates.find(t => t.id === 'delisting') || get().templates.find(t => t.name.includes('Delisting'));
    } else {
      template = get().templates.find(t => t.isDefault) || get().templates[0];
    }
    
    if (!template) {
      console.error('Ingen mall hittades');
      return;
    }
    
    // Hitta tidigaste veckan från alla retailers
    let earliestWeek = 53;
    let earliestYear = productData.launchYear;
    
    if (productData.retailers && productData.retailers.length > 0) {
      productData.retailers.forEach((r: RetailerLaunch) => {
        r.launchWeeks.forEach(week => {
          if (week < earliestWeek) {
            earliestWeek = week;
            earliestYear = r.launchYear;
          }
        });
      });
    } else {
      // För delisting kan vi använda launchYear och launchWeek direkt om inga retailers
      earliestWeek = productData.launchWeek || getWeek(new Date());
      earliestYear = productData.launchYear || getYear(new Date());
    }
    
    // För delisting, sätt retailers till tom array om det inte finns
    if (productData.productType === 'delisting' && !productData.retailers) {
      productData.retailers = [];
    }
    
    const launchDate = getLaunchDate(earliestYear, earliestWeek);
    
    const tempProduct: Product = {
      ...productData,
      launchWeek: earliestWeek,
      launchYear: earliestYear,
      launchDate,
      retailers: productData.retailers || [],
      id: `product-${Date.now()}`,
      activities: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const activities = generateActivities(template.activities, tempProduct, get().users);
    
    const newProduct: Product = {
      ...tempProduct,
      activities,
    };
    
    set((state) => ({
      products: [...state.products, newProduct],
    }));
  },
  
  updateProduct: (id, updates) => {
    set((state) => {
      const updatedProducts = state.products.map((p) => {
        if (p.id !== id) return p;
        
        const updated = { ...p, ...updates, updatedAt: new Date() };
        
        // Om status ändras manuellt till 'cancelled', behåll det
        // Annars beräkna status automatiskt om aktiviteter finns
        if (updates.status === 'cancelled') {
          return updated; // Behåll manuell cancelled-status
        }
        
        // Om aktiviteter uppdateras eller om status inte är cancelled, beräkna automatiskt
        if (p.activities.length > 0 && p.status !== 'cancelled') {
          const autoStatus = calculateProductStatus(updated);
          updated.status = autoStatus;
        }
        
        return updated;
      });
      
      return { products: updatedProducts };
    });
  },
  
  deleteProduct: (id) => {
    set((state) => ({
      products: state.products.filter((p) => p.id !== id),
      selectedProductId: state.selectedProductId === id ? null : state.selectedProductId,
    }));
  },
  
  updateActivity: (productId, activityId, updates) => {
    set((state) => {
      const updatedProducts = state.products.map((product) => {
        if (product.id !== productId) return product;
        
        const updatedActivities = product.activities.map((activity) =>
          activity.id === activityId
            ? { ...activity, ...updates }
            : activity
        );
        
        // Beräkna ny produktstatus baserat på aktiviteternas status
        const updatedProduct = {
          ...product,
          activities: updatedActivities,
          updatedAt: new Date(),
        };
        
        // Uppdatera produktstatus automatiskt (behåll 'cancelled' om det är manuellt satt)
        if (product.status !== 'cancelled') {
          const autoStatus = calculateProductStatus(updatedProduct);
          updatedProduct.status = autoStatus;
        }
        
        return updatedProduct;
      });
      
      return { products: updatedProducts };
    });
  },
  
  addComment: (productId, activityId, comment) => {
    set((state) => ({
      products: state.products.map((product) => {
        if (product.id !== productId) return product;
        return {
          ...product,
          activities: product.activities.map((activity) =>
            activity.id === activityId
              ? { ...activity, comments: [...activity.comments, comment] }
              : activity
          ),
          updatedAt: new Date(),
        };
      }),
    }));
  },
  
  setSelectedProduct: (id) => set({ selectedProductId: id }),
  
  setViewMode: (mode) => set({ viewMode: mode }),
  
  updateTemplate: (id, updates) => {
    set((state) => ({
      templates: state.templates.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    }));
  },
  
  createTemplate: (templateData) => {
    const newTemplate: Template = {
      ...templateData,
      id: `template-${Date.now()}`,
    };
    set((state) => ({
      templates: [...state.templates, newTemplate],
    }));
  },
  
  addRole: (roleData) => {
    const newRole: Role = {
      ...roleData,
      id: `role-${Date.now()}`,
    };
    set((state) => ({
      roles: [...state.roles, newRole],
    }));
  },
  
  updateRole: (id, updates) => {
    set((state) => ({
      roles: state.roles.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    }));
  },
  
  deleteRole: (id) => {
    set((state) => ({
      roles: state.roles.filter((r) => r.id !== id),
      users: state.users.map((u) => ({
        ...u,
        assignedRoles: u.assignedRoles.filter((rid) => rid !== id),
      })),
    }));
  },
  
  assignUserToRole: (userId, roleId) => {
    set((state) => ({
      users: state.users.map((u) =>
        u.id === userId
          ? {
              ...u,
              assignedRoles: u.assignedRoles.includes(roleId)
                ? u.assignedRoles
                : [...u.assignedRoles, roleId],
            }
          : u
      ),
    }));
  },
  
  removeUserFromRole: (userId, roleId) => {
    set((state) => ({
      users: state.users.map((u) =>
        u.id === userId
          ? {
              ...u,
              assignedRoles: u.assignedRoles.filter((rid) => rid !== roleId),
            }
          : u
      ),
    }));
  },
}));

