import { Product } from '../types';

/**
 * Beräknar produktstatus automatiskt baserat på aktiviteternas status
 */
export function calculateProductStatus(product: Product): Product['status'] {
  // Om produkten är manuellt inställd, behåll den statusen
  // (eller vi kan ta bort denna check om vi vill att det alltid ska vara automatiskt)
  
  if (product.activities.length === 0) {
    return 'draft';
  }

  const completedCount = product.activities.filter(a => a.status === 'completed').length;
  const inProgressCount = product.activities.filter(a => a.status === 'in_progress').length;
  const notStartedCount = product.activities.filter(a => a.status === 'not_started').length;
  const totalCount = product.activities.length;

  // Om alla aktiviteter är klara
  if (completedCount === totalCount) {
    return 'completed';
  }

  // Om minst en aktivitet är påbörjad eller klar
  if (inProgressCount > 0 || completedCount > 0) {
    return 'active';
  }

  // Om alla aktiviteter är ej påbörjade
  if (notStartedCount === totalCount) {
    return 'draft';
  }

  // Fallback
  return 'draft';
}

/**
 * Uppdaterar produktstatus automatiskt baserat på aktiviteter
 */
export function shouldUpdateProductStatus(
  oldStatus: Product['status'],
  newStatus: Product['status']
): boolean {
  // Tillåt manuell ändring till 'cancelled', men annars använd automatisk status
  // Om användaren manuellt sätter till cancelled, behåll det
  if (oldStatus === 'cancelled') {
    return false; // Behåll cancelled om det är manuellt satt
  }
  
  return true; // Uppdatera automatiskt
}

