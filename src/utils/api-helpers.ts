/**
 * Helper-funktioner för att konvertera API-data till korrekta typer
 * När data kommer från API:et via JSON blir Date-objekt till strängar,
 * så vi behöver konvertera dem tillbaka till Date-objekt.
 */

import { Product, Activity, Comment } from '../types';

/**
 * Konverterar en produkt från API-format (med datumsträngar) till korrekt typ (med Date-objekt)
 */
export function apiToProduct(productData: any): Product {
  return {
    ...productData,
    launchDate: new Date(productData.launchDate),
    createdAt: new Date(productData.createdAt),
    updatedAt: new Date(productData.updatedAt),
    activities: productData.activities?.map(apiToActivity) || [],
  };
}

/**
 * Konverterar en aktivitet från API-format till korrekt typ
 */
export function apiToActivity(activityData: any): Activity {
  return {
    ...activityData,
    deadline: new Date(activityData.deadline),
    comments: activityData.comments?.map(apiToComment) || [],
  };
}

/**
 * Konverterar en kommentar från API-format till korrekt typ
 */
export function apiToComment(commentData: any): Comment {
  return {
    ...commentData,
    createdAt: new Date(commentData.createdAt),
  };
}

/**
 * Säker konvertering av datum - hanterar både Date-objekt och strängar
 */
export function toDate(value: Date | string): Date {
  if (value instanceof Date) {
    return value;
  }
  return new Date(value);
}

