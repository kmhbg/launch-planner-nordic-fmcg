import { ActivityTemplate } from '../types';

/**
 * Delisting-mall för Validoo-process
 * Följer ECR-fönster men kortare process (ca 8-10 veckor)
 */
export const DELISTING_TEMPLATE: ActivityTemplate[] = [
  {
    id: 'delisting-notification',
    name: 'Delisting-beslut och avisering',
    description: 'Produktchef meddelar om delisting-beslut',
    weeksBeforeLaunch: -10,
    defaultAssigneeRole: 'kam', // Produktchef/KAM ansvarar
    category: 'Delisting',
    required: true,
    order: 1,
  },
  {
    id: 'validoo-notification',
    name: 'Avisering till Validoo',
    description: 'Meddela Validoo om delisting och påbörja process',
    weeksBeforeLaunch: -10,
    defaultAssigneeRole: 'masterdata', // Masterdata ansvarig för Validoo
    category: 'Delisting',
    required: true,
    order: 2,
  },
  {
    id: 'validoo-data-update',
    name: 'Uppdatera data i Validoo',
    description: 'Uppdatera produktdata i Validoo för delisting',
    weeksBeforeLaunch: -8,
    defaultAssigneeRole: 'masterdata',
    category: 'Delisting',
    required: true,
    order: 3,
  },
  {
    id: 'retailer-notification',
    name: 'Avisera kedjor',
    description: 'Meddela berörda kedjor om delisting',
    weeksBeforeLaunch: -6,
    defaultAssigneeRole: 'kam',
    category: 'Delisting',
    required: true,
    order: 4,
  },
  {
    id: 'final-stock-check',
    name: 'Slutlig lagersaldo-kontroll',
    description: 'Kontrollera att allt lager är sålt eller returnerat',
    weeksBeforeLaunch: -4,
    defaultAssigneeRole: 'logistics',
    category: 'Delisting',
    required: true,
    order: 5,
  },
  {
    id: 'validoo-finalization',
    name: 'Finalisera i Validoo',
    description: 'Slutför delisting-processen i Validoo',
    weeksBeforeLaunch: -2,
    defaultAssigneeRole: 'masterdata',
    category: 'Delisting',
    required: true,
    order: 6,
  },
  {
    id: 'delisting-complete',
    name: 'Delisting genomförd',
    description: 'Produkten är delistad och inte längre tillgänglig',
    weeksBeforeLaunch: 0,
    defaultAssigneeRole: 'kam',
    category: 'Delisting',
    required: true,
    order: 7,
  },
];

