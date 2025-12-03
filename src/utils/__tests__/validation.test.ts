import { describe, it, expect } from 'vitest';
import { validateEAN13, formatGTIN } from '../validation';

describe('validateEAN13', () => {
  it('should validate correct EAN-13 GTIN', () => {
    // Riktig EAN-13: 4006381333931 (känd giltig kod)
    const result = validateEAN13('4006381333931');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject GTIN with wrong length', () => {
    expect(validateEAN13('123456789012')).toEqual({
      valid: false,
      error: 'EAN-13 måste vara exakt 13 siffror',
    });
    expect(validateEAN13('12345678901234')).toEqual({
      valid: false,
      error: 'EAN-13 måste vara exakt 13 siffror',
    });
  });

  it('should reject GTIN with non-numeric characters', () => {
    // Efter cleaning blir '731086500000a' -> '731086500000' (12 siffror)
    expect(validateEAN13('731086500000a')).toEqual({
      valid: false,
      error: 'EAN-13 måste vara exakt 13 siffror',
    });
  });

  it('should reject GTIN with invalid checksum', () => {
    // 4006381333931 är giltig, så vi ändrar sista siffran
    expect(validateEAN13('4006381333932')).toEqual({
      valid: false,
      error: 'Ogiltig kontrollsiffra i EAN-13',
    });
  });

  it('should clean non-numeric characters before validation', () => {
    // Använd en riktig EAN-13-kod med bindestreck
    const result = validateEAN13('400-638-133-393-1');
    expect(result.valid).toBe(true);
  });

  it('should validate multiple known valid EAN-13 codes', () => {
    // Använd riktiga EAN-13-koder som är verifierade giltiga
    const validCodes = [
      '4006381333931', // Känd giltig EAN-13
      '5901234123457', // Känd giltig EAN-13
      '9780143007234', // Exempel på giltig EAN-13 (ISBN-13 format)
    ];
    
    validCodes.forEach(code => {
      const result = validateEAN13(code);
      expect(result.valid).toBe(true);
    });
  });
});

describe('formatGTIN', () => {
  it('should format 13-digit GTIN with spaces', () => {
    expect(formatGTIN('4006381333931')).toBe('4 006381 333931');
  });

  it('should clean non-numeric characters before formatting', () => {
    expect(formatGTIN('400-638-133-393-1')).toBe('4 006381 333931');
  });

  it('should return cleaned string if not 13 digits', () => {
    expect(formatGTIN('12345')).toBe('12345');
  });
});

