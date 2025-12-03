import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store';
import { Product, User, RetailerLaunch } from '../../types';

describe('Store - Product Management', () => {
  beforeEach(() => {
    // Reset store before each test
    useStore.setState({
      products: [],
      currentUser: null,
    });
  });

  it('should add a new product', () => {
    const { addProduct, products } = useStore.getState();
    
    const newProduct = {
      gtin: '7310865000000',
      name: 'Test Product',
      productType: 'launch' as const,
      launchYear: 2024,
      status: 'draft' as const,
      createdBy: 'user-1',
      retailers: [
        {
          retailer: 'ICA',
          launchWeeks: [15],
          launchYear: 2024,
        },
      ] as RetailerLaunch[],
    };

    addProduct(newProduct);

    const updatedProducts = useStore.getState().products;
    expect(updatedProducts).toHaveLength(1);
    expect(updatedProducts[0].name).toBe('Test Product');
    expect(updatedProducts[0].gtin).toBe('7310865000000');
  });

  it('should update a product', () => {
    const { addProduct, updateProduct } = useStore.getState();
    
    addProduct({
      gtin: '7310865000000',
      name: 'Test Product',
      productType: 'launch',
      launchYear: 2024,
      status: 'draft',
      createdBy: 'user-1',
      retailers: [],
    });

    const product = useStore.getState().products[0];
    updateProduct(product.id, { name: 'Updated Product' });

    const updatedProduct = useStore.getState().products[0];
    expect(updatedProduct.name).toBe('Updated Product');
  });

  it('should delete a product', () => {
    const { addProduct, deleteProduct } = useStore.getState();
    
    addProduct({
      gtin: '7310865000000',
      name: 'Test Product',
      productType: 'launch',
      launchYear: 2024,
      status: 'draft',
      createdBy: 'user-1',
      retailers: [],
    });

    const product = useStore.getState().products[0];
    deleteProduct(product.id);

    expect(useStore.getState().products).toHaveLength(0);
  });

  it('should calculate earliest week from multiple retailers', () => {
    const { addProduct } = useStore.getState();
    
    addProduct({
      gtin: '7310865000000',
      name: 'Test Product',
      productType: 'launch',
      launchYear: 2024,
      status: 'draft',
      createdBy: 'user-1',
      retailers: [
        {
          retailer: 'ICA',
          launchWeeks: [20],
          launchYear: 2024,
        },
        {
          retailer: 'Coop',
          launchWeeks: [15],
          launchYear: 2024,
        },
      ],
    });

    const product = useStore.getState().products[0];
    expect(product.launchWeek).toBe(15); // Earliest week
  });
});

describe('Store - Activity Management', () => {
  beforeEach(() => {
    useStore.setState({
      products: [],
    });
  });

  it('should update activity status', () => {
    const { addProduct, updateActivity } = useStore.getState();
    
    addProduct({
      gtin: '7310865000000',
      name: 'Test Product',
      productType: 'launch',
      launchYear: 2024,
      status: 'draft',
      createdBy: 'user-1',
      retailers: [],
    });

    const product = useStore.getState().products[0];
    const activity = product.activities[0];
    
    if (activity) {
      updateActivity(product.id, activity.id, { status: 'in_progress' });
      
      const updatedProduct = useStore.getState().products[0];
      const updatedActivity = updatedProduct.activities.find(a => a.id === activity.id);
      expect(updatedActivity?.status).toBe('in_progress');
    }
  });
});

describe('Store - User Management', () => {
  it('should set current user', () => {
    const { setCurrentUser } = useStore.getState();
    
    const user: User = {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin',
      assignedRoles: [],
    };

    setCurrentUser(user);
    expect(useStore.getState().currentUser).toEqual(user);
  });
});

