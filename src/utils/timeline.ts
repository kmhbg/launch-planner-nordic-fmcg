import { getWeek, getYear, startOfWeek, addWeeks, subWeeks, format } from 'date-fns';
import sv from 'date-fns/locale/sv';
import { ActivityTemplate, Activity, Product, User } from '../types';

/**
 * Beräknar vecka och datum baserat på lanseringsvecka
 */
export function getLaunchDate(year: number, week: number): Date {
  // Skapa ett datum för första dagen i veckan (måndag)
  const jan4 = new Date(year, 0, 4);
  const jan4Week = getWeek(jan4);
  const daysToAdd = (week - jan4Week) * 7;
  const weekStart = addWeeks(jan4, week - jan4Week);
  return startOfWeek(weekStart, { weekStartsOn: 1 }); // Måndag som första dag
}

/**
 * Beräknar deadline-datum baserat på veckor före lansering
 */
export function calculateDeadline(
  launchDate: Date,
  weeksBeforeLaunch: number
): Date {
  return subWeeks(launchDate, Math.abs(weeksBeforeLaunch));
}

/**
 * Beräknar vecka för deadline
 */
export function calculateDeadlineWeek(
  launchYear: number,
  launchWeek: number,
  weeksBeforeLaunch: number
): number {
  const launchDate = getLaunchDate(launchYear, launchWeek);
  const deadlineDate = calculateDeadline(launchDate, weeksBeforeLaunch);
  return getWeek(deadlineDate);
}

/**
 * Genererar aktiviteter från mall baserat på lanseringsvecka
 * Automatiskt tilldelar ansvarig baserat på defaultAssigneeRole
 */
export function generateActivities(
  templates: ActivityTemplate[],
  product: Product,
  users: User[] = []
): Activity[] {
  const launchDate = getLaunchDate(product.launchYear, product.launchWeek);
  
  return templates
    .sort((a, b) => a.weeksBeforeLaunch - b.weeksBeforeLaunch) // Sortera från tidigast till senast
    .map((template, index) => {
      const weeksBefore = template.weeksBeforeLaunch;
      const deadline = calculateDeadline(launchDate, weeksBefore);
      const deadlineWeek = getWeek(deadline);
      
      // Hitta användare med rätt roll om defaultAssigneeRole är satt
      let assigneeId: string | undefined;
      let assigneeName: string | undefined;
      
      if (template.defaultAssigneeRole) {
        const assignedUser = users.find(u => 
          u.assignedRoles && u.assignedRoles.includes(template.defaultAssigneeRole!)
        );
        if (assignedUser) {
          assigneeId = assignedUser.id;
          assigneeName = assignedUser.name;
        }
      }
      
      return {
        id: `${product.id}-${template.id}-${Date.now()}-${index}`,
        templateId: template.id,
        productId: product.id,
        name: template.name,
        description: template.description,
        deadline,
        deadlineWeek,
        status: 'not_started' as const,
        assigneeId,
        assigneeName,
        comments: [],
        category: template.category,
        order: template.order,
      };
    });
}

/**
 * Standard ECR 16-veckorsmall
 */
export const DEFAULT_ECR_TEMPLATE: ActivityTemplate[] = [
  {
    id: 'notification',
    name: 'Avisering produkt + artikeldata påbörjas',
    description: 'Informera om ny produkt och börja samla artikeldata',
    weeksBeforeLaunch: -15,
    category: 'Artikeldata',
    required: true,
    order: 1,
  },
  {
    id: 'first-approval',
    name: 'Första intern godkännande + preliminär produktinfo',
    description: 'Intern granskning och godkännande av produktinformation',
    weeksBeforeLaunch: -13,
    category: 'Godkännande',
    required: true,
    order: 2,
  },
  {
    id: 'images-gs1',
    name: 'Bilder, GS1-validering, komplett artikelinformation',
    description: 'Produktbilder, GS1-kvalitetssäkring och komplett artikeldata',
    weeksBeforeLaunch: -12,
    defaultAssigneeRole: 'masterdata',
    category: 'Artikeldata',
    required: true,
    order: 3,
  },
  {
    id: 'packaging-approval',
    name: 'Förpackningsgodkännande',
    description: 'Godkännande av förpackningsdesign och -material',
    weeksBeforeLaunch: -11,
    category: 'Godkännande',
    required: true,
    order: 4,
  },
  {
    id: 'pricing',
    name: 'Pris & villkor',
    description: 'Fastställande av pris och handelsvillkor',
    weeksBeforeLaunch: -10,
    category: 'Kommersiell',
    required: true,
    order: 5,
  },
  {
    id: 'customer-presentation',
    name: 'Kundpresentation / offert',
    description: 'Presentation av produkt till kund med offert',
    weeksBeforeLaunch: -10,
    defaultAssigneeRole: 'kam',
    category: 'Kundrelation',
    required: true,
    order: 6,
  },
  {
    id: 'customer-decision',
    name: 'Kundbeslut, listing',
    description: 'Kundens beslut och listing-avtal',
    weeksBeforeLaunch: -8,
    category: 'Kundrelation',
    required: true,
    order: 7,
  },
  {
    id: 'forecast-logistics',
    name: 'Prognos, logistikplan',
    description: 'Försäljningsprognos och logistikplanering',
    weeksBeforeLaunch: -6,
    category: 'Logistik',
    required: true,
    order: 8,
  },
  {
    id: 'production-start',
    name: 'Produktionsstart, lagersaldo',
    description: 'Start av produktion och säkerställande av lagersaldo',
    weeksBeforeLaunch: -4,
    category: 'Produktion',
    required: true,
    order: 9,
  },
  {
    id: 'delivery-warehouse',
    name: 'Leverans till centrallager',
    description: 'Leverans av produkter till centrallager',
    weeksBeforeLaunch: -2,
    category: 'Logistik',
    required: true,
    order: 10,
  },
  {
    id: 'shelf-start',
    name: 'Hyllstart',
    description: 'Produkten placeras i hyllan och blir tillgänglig för konsument',
    weeksBeforeLaunch: 0,
    category: 'Lansering',
    required: true,
    order: 11,
  },
];

/**
 * Formaterar vecka och år för visning
 */
export function formatWeekYear(year: number, week: number): string {
  return `V${week} ${year}`;
}

/**
 * Formaterar datum för visning
 */
export function formatDate(date: Date): string {
  try {
    return format(date, 'd MMM yyyy', { locale: sv });
  } catch {
    return format(date, 'd MMM yyyy');
  }
}

/**
 * Hämtar vecka från datum
 */
export function getWeekFromDate(date: Date): { year: number; week: number } {
  return {
    year: getYear(date),
    week: getWeek(date),
  };
}

