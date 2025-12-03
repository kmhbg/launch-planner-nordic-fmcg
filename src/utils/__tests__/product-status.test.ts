import { describe, it, expect } from 'vitest';
import { calculateProductStatus } from '../product-status';
import { Product } from '../../types';

describe('calculateProductStatus', () => {
  const baseProduct: Omit<Product, 'status' | 'activities'> = {
    id: 'test-1',
    gtin: '7310865000000',
    name: 'Test Product',
    productType: 'launch',
    launchWeek: 15,
    launchYear: 2024,
    launchDate: new Date(2024, 3, 8),
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-1',
  };

  it('should return draft when no activities exist', () => {
    const product: Product = {
      ...baseProduct,
      status: 'draft',
      activities: [],
    };
    expect(calculateProductStatus(product)).toBe('draft');
  });

  it('should return completed when all activities are completed', () => {
    const product: Product = {
      ...baseProduct,
      status: 'draft',
      activities: [
        {
          id: 'act-1',
          templateId: 'tpl-1',
          productId: 'test-1',
          name: 'Activity 1',
          description: 'Test',
          deadline: new Date(),
          deadlineWeek: 10,
          status: 'completed',
          category: 'Test',
          order: 1,
          comments: [],
        },
        {
          id: 'act-2',
          templateId: 'tpl-2',
          productId: 'test-1',
          name: 'Activity 2',
          description: 'Test',
          deadline: new Date(),
          deadlineWeek: 11,
          status: 'completed',
          category: 'Test',
          order: 2,
          comments: [],
        },
      ],
    };
    expect(calculateProductStatus(product)).toBe('completed');
  });

  it('should return active when at least one activity is in progress', () => {
    const product: Product = {
      ...baseProduct,
      status: 'draft',
      activities: [
        {
          id: 'act-1',
          templateId: 'tpl-1',
          productId: 'test-1',
          name: 'Activity 1',
          description: 'Test',
          deadline: new Date(),
          deadlineWeek: 10,
          status: 'in_progress',
          category: 'Test',
          order: 1,
          comments: [],
        },
        {
          id: 'act-2',
          templateId: 'tpl-2',
          productId: 'test-1',
          name: 'Activity 2',
          description: 'Test',
          deadline: new Date(),
          deadlineWeek: 11,
          status: 'not_started',
          category: 'Test',
          order: 2,
          comments: [],
        },
      ],
    };
    expect(calculateProductStatus(product)).toBe('active');
  });

  it('should return active when at least one activity is completed', () => {
    const product: Product = {
      ...baseProduct,
      status: 'draft',
      activities: [
        {
          id: 'act-1',
          templateId: 'tpl-1',
          productId: 'test-1',
          name: 'Activity 1',
          description: 'Test',
          deadline: new Date(),
          deadlineWeek: 10,
          status: 'completed',
          category: 'Test',
          order: 1,
          comments: [],
        },
        {
          id: 'act-2',
          templateId: 'tpl-2',
          productId: 'test-1',
          name: 'Activity 2',
          description: 'Test',
          deadline: new Date(),
          deadlineWeek: 11,
          status: 'not_started',
          category: 'Test',
          order: 2,
          comments: [],
        },
      ],
    };
    expect(calculateProductStatus(product)).toBe('active');
  });

  it('should return draft when all activities are not started', () => {
    const product: Product = {
      ...baseProduct,
      status: 'draft',
      activities: [
        {
          id: 'act-1',
          templateId: 'tpl-1',
          productId: 'test-1',
          name: 'Activity 1',
          description: 'Test',
          deadline: new Date(),
          deadlineWeek: 10,
          status: 'not_started',
          category: 'Test',
          order: 1,
          comments: [],
        },
      ],
    };
    expect(calculateProductStatus(product)).toBe('draft');
  });
});

