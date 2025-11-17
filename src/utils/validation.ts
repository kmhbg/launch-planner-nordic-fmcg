/**
 * Validerar EAN-13 GTIN
 * EAN-13 består av 13 siffror med en kontrollsiffra
 */
export function validateEAN13(gtin: string): { valid: boolean; error?: string } {
  // Ta bort alla icke-siffror
  const cleaned = gtin.replace(/\D/g, '');

  // Kontrollera längd
  if (cleaned.length !== 13) {
    return {
      valid: false,
      error: 'EAN-13 måste vara exakt 13 siffror',
    };
  }

  // Kontrollera att alla tecken är siffror
  if (!/^\d{13}$/.test(cleaned)) {
    return {
      valid: false,
      error: 'EAN-13 får endast innehålla siffror',
    };
  }

  // Validera kontrollsiffra (checksum)
  const digits = cleaned.split('').map(Number);
  let sum = 0;

  for (let i = 0; i < 12; i++) {
    // Multiplicera varannan siffra med 1, varannan med 3
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }

  const checkDigit = (10 - (sum % 10)) % 10;

  if (checkDigit !== digits[12]) {
    return {
      valid: false,
      error: 'Ogiltig kontrollsiffra i EAN-13',
    };
  }

  return { valid: true };
}

/**
 * Formaterar GTIN med mellanslag för läsbarhet
 */
export function formatGTIN(gtin: string): string {
  const cleaned = gtin.replace(/\D/g, '');
  if (cleaned.length === 13) {
    return `${cleaned.slice(0, 1)} ${cleaned.slice(1, 7)} ${cleaned.slice(7, 13)}`;
  }
  return cleaned;
}

