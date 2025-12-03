import { create } from 'zustand';
import { Product, Activity, User, Template, ActivityTemplate, RetailerLaunch, Role } from '../types';
import { generateActivities, DEFAULT_ECR_TEMPLATE, getLaunchDate } from '../utils/timeline';
import { DELISTING_TEMPLATE } from '../utils/delisting-template';
import { getWeek, getYear } from 'date-fns';
import { calculateProductStatus } from '../utils/product-status';
import { apiToProduct, apiToActivity, apiToComment } from '../utils/api-helpers';

interface AppState {
  // Data
  products: Product[];
  users: User[];
  roles: Role[];
  templates: Template[];
  currentUser: User | null;
  isAuthenticated: boolean;
  
  // UI State
  selectedProductId: string | null;
  viewMode: 'dashboard' | 'product' | 'timeline' | 'sales' | 'settings';
  
  // Actions
  setCurrentUser: (user: User) => void;
  login: (username: string, password: string, authMethod?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'activities' | 'createdAt' | 'updatedAt' | 'launchWeek' | 'launchDate'> & { retailers?: RetailerLaunch[]; launchWeek?: number }) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  updateActivity: (productId: string, activityId: string, updates: Partial<Activity>) => void;
  addComment: (productId: string, activityId: string, comment: Activity['comments'][0]) => void;
  setSelectedProduct: (id: string | null) => void;
  setViewMode: (mode: AppState['viewMode']) => void;
  updateTemplate: (id: string, updates: Partial<Template>) => void;
  createTemplate: (template: Omit<Template, 'id'>) => void;
  deleteTemplate: (id: string) => void;
  addRole: (role: Omit<Role, 'id'>) => void;
  updateRole: (id: string, updates: Partial<Role>) => void;
  deleteRole: (id: string) => void;
  assignUserToRole: (userId: string, roleId: string) => void;
  removeUserFromRole: (userId: string, roleId: string) => void;
  loadProducts: () => Promise<void>;
  isLoading: boolean;
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
  isAuthenticated: false,
  selectedProductId: null,
  viewMode: 'dashboard',
  isLoading: false,
  
  // Actions
  setCurrentUser: (user) => set({ currentUser: user, isAuthenticated: true }),
  
  login: async (username, password, authMethod = 'local') => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Viktigt för cookies
        body: JSON.stringify({ username, password, authMethod }),
      });

      // Kontrollera om svaret är JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ [Store] Server returnerade inte JSON:', text.substring(0, 200));
        throw new Error('Servern svarade inte korrekt. Kontrollera att backend-servern körs på port 3001.');
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Inloggning misslyckades');
      }

      const result = await response.json();
      if (result.success && result.user) {
        set({ 
          currentUser: result.user, 
          isAuthenticated: true 
        });
      } else {
        throw new Error(result.message || 'Inloggning misslyckades');
      }
    } catch (error: any) {
      console.error('❌ [Store] Login error:', error);
      // Om det är ett JSON-parsing-fel, ge ett mer användbart meddelande
      if (error.message && error.message.includes('JSON')) {
        throw new Error('Servern svarade inte korrekt. Kontrollera att backend-servern körs på port 3001.');
      }
      throw error;
    }
  },
  
  logout: async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('❌ [Store] Logout error:', error);
    } finally {
      set({ 
        currentUser: null, 
        isAuthenticated: false,
        products: [], // Rensa data vid utloggning
      });
    }
  },
  
  checkAuth: async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.user) {
          set({ 
            currentUser: result.user, 
            isAuthenticated: true 
          });
        }
      } else {
        set({ currentUser: null, isAuthenticated: false });
      }
    } catch (error) {
      console.error('❌ [Store] Check auth error:', error);
      set({ currentUser: null, isAuthenticated: false });
    }
  },
  
  loadProducts: async () => {
    console.log('📥 [Store] loadProducts startar...');
    set({ isLoading: true });
    try {
      console.log('📥 [Store] Fetchar produkter från /api/products...');
      const response = await fetch('/api/products');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const productsData = await response.json();
      
      // Konvertera datumsträngar tillbaka till Date-objekt
      const products = productsData.map(apiToProduct);
      
      console.log('✅ [Store] Hämtade', products.length, 'produkter från API');
      set({ products, isLoading: false });
    } catch (error) {
      console.error('❌ [Store] Fel vid laddning av produkter:', error);
      set({ isLoading: false });
    }
  },
  
  addProduct: async (productData) => {
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
    
    try {
      console.log('💾 [Store] Sparar produkt till API...');
      // Spara till databas via API
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newProduct),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const savedProductData = await response.json();
      
      // Konvertera datumsträngar tillbaka till Date-objekt
      const savedProduct = apiToProduct(savedProductData);
      
      console.log('✅ [Store] Produkt sparad:', savedProduct.id);
      // Uppdatera store med produkt från databas
      set((state) => ({
        products: [...state.products, savedProduct],
      }));
    } catch (error) {
      console.error('❌ [Store] Fel vid skapande av produkt:', error);
      // Fallback: lägg till i store ändå (för offline/error-hantering)
      set((state) => ({
        products: [...state.products, newProduct],
      }));
    }
  },
  
  updateProduct: async (id, updates) => {
    const state = get();
    const product = state.products.find(p => p.id === id);
    if (!product) return;
    
    const updated = { ...product, ...updates, updatedAt: new Date() };
    
    // Om status ändras manuellt till 'cancelled', behåll det
    // Annars beräkna status automatiskt om aktiviteter finns
    if (updates.status !== 'cancelled' && product.activities.length > 0 && product.status !== 'cancelled') {
      const autoStatus = calculateProductStatus(updated);
      updated.status = autoStatus;
    }
    
    try {
      console.log('💾 [Store] Uppdaterar produkt via API, ID:', id);
      // Uppdatera i databas via API
      const response = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updated),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const savedProductData = await response.json();
      
      // Konvertera datumsträngar tillbaka till Date-objekt
      const savedProduct = apiToProduct(savedProductData);
      
      console.log('✅ [Store] Produkt uppdaterad:', id);
      // Uppdatera store
      set((state) => ({
        products: state.products.map((p) => p.id === id ? savedProduct : p),
      }));
    } catch (error) {
      console.error('❌ [Store] Fel vid uppdatering av produkt:', error);
      // Fallback: uppdatera i store ändå
      set((state) => ({
        products: state.products.map((p) => p.id === id ? updated : p),
      }));
    }
  },
  
  deleteProduct: async (id) => {
    try {
      console.log('🗑️ [Store] Tar bort produkt via API, ID:', id);
      // Ta bort från databas via API
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      console.log('✅ [Store] Produkt borttagen:', id);
      // Uppdatera store
      set((state) => ({
        products: state.products.filter((p) => p.id !== id),
        selectedProductId: state.selectedProductId === id ? null : state.selectedProductId,
      }));
    } catch (error) {
      console.error('❌ [Store] Fel vid borttagning av produkt:', error);
      // Fallback: ta bort från store ändå
      set((state) => ({
        products: state.products.filter((p) => p.id !== id),
        selectedProductId: state.selectedProductId === id ? null : state.selectedProductId,
      }));
    }
  },
  
  updateActivity: async (productId, activityId, updates) => {
    const state = get();
    const product = state.products.find(p => p.id === productId);
    if (!product) return;
    
    const updatedActivities = product.activities.map((activity) =>
      activity.id === activityId
        ? { ...activity, ...updates }
        : activity
    );
    
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
    
    try {
      console.log('💾 [Store] Uppdaterar aktivitet via API, Activity ID:', activityId);
      // Uppdatera aktivitet i databas via API
      const activityResponse = await fetch(`/api/activities/${activityId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!activityResponse.ok) {
        throw new Error(`HTTP error! status: ${activityResponse.status}`);
      }
      
      // Uppdatera produkt i databas (för status)
      console.log('💾 [Store] Uppdaterar produktstatus via API, Product ID:', productId);
      const productResponse = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: updatedProduct.status }),
      });
      
      if (!productResponse.ok) {
        throw new Error(`HTTP error! status: ${productResponse.status}`);
      }
      
      console.log('✅ [Store] Aktivitet och produktstatus uppdaterade');
      // Uppdatera store
      set((state) => ({
        products: state.products.map((p) => p.id === productId ? updatedProduct : p),
      }));
    } catch (error) {
      console.error('❌ [Store] Fel vid uppdatering av aktivitet:', error);
      // Fallback: uppdatera i store ändå
      set((state) => ({
        products: state.products.map((p) => p.id === productId ? updatedProduct : p),
      }));
    }
  },
  
  addComment: async (productId, activityId, comment) => {
    try {
      console.log('💾 [Store] Lägger till kommentar via API, Activity ID:', activityId);
      // Lägg till kommentar i databas via API
      const response = await fetch(`/api/activities/${activityId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(comment),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const savedCommentData = await response.json();
      
      // Konvertera datumsträngar tillbaka till Date-objekt
      const savedComment = apiToComment(savedCommentData);
      
      console.log('✅ [Store] Kommentar tillagd');
      // Uppdatera store
      set((state) => ({
        products: state.products.map((product) => {
          if (product.id !== productId) return product;
          return {
            ...product,
            activities: product.activities.map((activity) =>
              activity.id === activityId
                ? { ...activity, comments: [...activity.comments, savedComment] }
                : activity
            ),
            updatedAt: new Date(),
          };
        }),
      }));
    } catch (error) {
      console.error('❌ [Store] Fel vid tillägg av kommentar:', error);
      // Fallback: lägg till i store ändå
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
    }
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
  
  deleteTemplate: (id) => {
    set((state) => ({
      templates: state.templates.filter((t) => t.id !== id),
      // Om den borttagna mallen var vald, välj första tillgängliga
      selectedProductId: state.selectedProductId,
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

