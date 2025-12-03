import { describe, it, expect } from 'vitest';
import { getLaunchDate, calculateDeadline, formatWeekYear, generateActivities } from '../timeline';
import { ActivityTemplate, Product, User } from '../../types';

describe('getLaunchDate', () => {
  it('should calculate correct launch date for week 1', () => {
    const date = getLaunchDate(2024, 1);
    expect(date.getFullYear()).toBe(2024);
    expect(date.getDay()).toBe(1); // Måndag
  });

  it('should calculate correct launch date for week 52', () => {
    const date = getLaunchDate(2024, 52);
    expect(date.getFullYear()).toBe(2024);
    expect(date.getDay()).toBe(1); // Måndag
  });

  it('should handle year boundaries correctly', () => {
    const date = getLaunchDate(2024, 53);
    // Vecka 53 kan vara i slutet av året eller början av nästa
    expect(date.getFullYear()).toBeGreaterThanOrEqual(2024);
  });
});

describe('calculateDeadline', () => {
  it('should calculate deadline correctly for weeks before launch', () => {
    const launchDate = new Date(2024, 2, 1); // 1 mars 2024
    const deadline = calculateDeadline(launchDate, -4);
    
    // Deadline ska vara 4 veckor före lansering
    const weeksDiff = Math.round((launchDate.getTime() - deadline.getTime()) / (7 * 24 * 60 * 60 * 1000));
    expect(weeksDiff).toBeCloseTo(4, 0);
  });

  it('should handle negative weeks correctly', () => {
    const launchDate = new Date(2024, 2, 1);
    const deadline = calculateDeadline(launchDate, -16);
    
    expect(deadline.getTime()).toBeLessThan(launchDate.getTime());
  });
});

describe('formatWeekYear', () => {
  it('should format week and year correctly', () => {
    expect(formatWeekYear(2024, 15)).toBe('V15 2024');
    expect(formatWeekYear(2023, 1)).toBe('V1 2023');
  });
});

describe('generateActivities', () => {
  const mockTemplate: ActivityTemplate[] = [
    {
      id: 'test-1',
      name: 'Test Activity 1',
      description: 'Test',
      weeksBeforeLaunch: -4,
      category: 'Test',
      required: true,
      order: 1,
    },
    {
      id: 'test-2',
      name: 'Test Activity 2',
      description: 'Test',
      weeksBeforeLaunch: -2,
      category: 'Test',
      required: true,
      order: 2,
    },
  ];

  const mockProduct: Product = {
    id: 'product-1',
    gtin: '7310865000000',
    name: 'Test Product',
    productType: 'launch',
    launchWeek: 15,
    launchYear: 2024,
    launchDate: new Date(2024, 3, 8),
    status: 'draft',
    activities: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-1',
  };

  const mockUsers: User[] = [
    {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'user',
      assignedRoles: [],
    },
  ];

  it('should generate correct number of activities', () => {
    const activities = generateActivities(mockTemplate, mockProduct, mockUsers);
    expect(activities).toHaveLength(2);
  });

  it('should set correct deadlines', () => {
    const activities = generateActivities(mockTemplate, mockProduct, mockUsers);
    expect(activities[0].deadline.getTime()).toBeLessThan(mockProduct.launchDate.getTime());
    expect(activities[1].deadline.getTime()).toBeLessThan(mockProduct.launchDate.getTime());
  });

  it('should assign activities to users with matching roles', () => {
    const templateWithRole: ActivityTemplate[] = [
      {
        ...mockTemplate[0],
        defaultAssigneeRole: 'masterdata',
      },
    ];
    
    const usersWithRole: User[] = [
      {
        ...mockUsers[0],
        assignedRoles: ['masterdata'],
      },
    ];

    const activities = generateActivities(templateWithRole, mockProduct, usersWithRole);
    expect(activities[0].assigneeId).toBe(usersWithRole[0].id);
    expect(activities[0].assigneeName).toBe(usersWithRole[0].name);
  });
});

