/**
 * Integrationstester för databas-API:et från frontend-perspektiv
 * 
 * Dessa tester simulerar hur frontend använder API:et för att:
 * - Skapa produkter
 * - Hämta produkter
 * - Uppdatera produkter
 * - Ta bort produkter
 * - Lägga till kommentarer
 * 
 * OBS: Backend-servern måste köras för att dessa tester ska fungera!
 * Kör: npm run server (i ett separat terminalfönster)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const API_BASE_URL = 'http://localhost:3001/api';

// Helper för att vänta lite mellan tester
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('Database API Integration Tests (Frontend Perspective)', () => {
  let createdProductId: string | null = null;
  let createdActivityId: string | null = null;

  beforeAll(async () => {
    // Kontrollera att backend-servern körs
    try {
      const response = await fetch(`${API_BASE_URL}/products`);
      if (!response.ok && response.status !== 200) {
        throw new Error('Backend-servern körs inte! Starta den med: npm run server');
      }
    } catch {
      throw new Error('Kunde inte ansluta till backend-servern. Starta den med: npm run server');
    }
  });

  describe('GET /api/products', () => {
    it('ska kunna hämta alla produkter', async () => {
      const response = await fetch(`${API_BASE_URL}/products`);
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);

      const products = await response.json();
      expect(Array.isArray(products)).toBe(true);
    });

    it('ska returnera en array även om det inte finns några produkter', async () => {
      const response = await fetch(`${API_BASE_URL}/products`);
      const products = await response.json();
      expect(Array.isArray(products)).toBe(true);
    });
  });

  describe('POST /api/products', () => {
    it('ska kunna skapa en produkt', async () => {
      const productData = {
        gtin: '1234567890123',
        name: 'Test Produkt',
        productType: 'launch',
        launchWeek: 1,
        launchYear: 2025,
        launchDate: '2025-01-01T00:00:00Z',
        status: 'draft',
        createdBy: 'test-user-123',
        retailers: [
          {
            retailer: 'ICA',
            launchWeeks: [1, 2, 3],
            launchYear: 2025,
          },
        ],
        activities: [
          {
            templateId: 'test-template',
            name: 'Test Aktivitet',
            description: 'Beskrivning av testaktivitet',
            deadline: '2025-01-15T00:00:00Z',
            deadlineWeek: 2,
            status: 'not_started',
            category: 'test',
            order: 0,
          },
        ],
      };

      const response = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);

      const product = await response.json();
      expect(product).toHaveProperty('id');
      expect(product.name).toBe(productData.name);
      expect(product.gtin).toBe(productData.gtin);
      expect(product.productType).toBe(productData.productType);

      createdProductId = product.id;
      createdActivityId = product.activities?.[0]?.id || null;

      // Vänta lite för att säkerställa att databasen har uppdaterats
      await delay(100);
    });

    it('ska automatiskt skapa användare om den inte finns', async () => {
      const productData = {
        gtin: '9876543210987',
        name: 'Produkt med ny användare',
        productType: 'launch',
        launchWeek: 5,
        launchYear: 2025,
        launchDate: '2025-02-01T00:00:00Z',
        status: 'draft',
        createdBy: 'ny-anvandare-' + Date.now(), // Unikt ID
        retailers: [],
        activities: [],
      };

      const response = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      expect(response.ok).toBe(true);
      const product = await response.json();
      expect(product).toHaveProperty('id');

      // Rensa upp - ta bort testprodukten
      if (product.id) {
        await fetch(`${API_BASE_URL}/products/${product.id}`, {
          method: 'DELETE',
        });
      }

      await delay(100);
    });

    it('ska kunna skapa en delisting-produkt', async () => {
      const productData = {
        gtin: '1111111111111',
        name: 'Delisting Test Produkt',
        productType: 'delisting',
        launchWeek: 10,
        launchYear: 2025,
        launchDate: '2025-03-01T00:00:00Z',
        status: 'draft',
        createdBy: 'test-user-123',
        retailers: [], // Delisting behöver inga retailers
        activities: [],
      };

      const response = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      expect(response.ok).toBe(true);
      const product = await response.json();
      expect(product.productType).toBe('delisting');

      // Rensa upp
      if (product.id) {
        await fetch(`${API_BASE_URL}/products/${product.id}`, {
          method: 'DELETE',
        });
      }

      await delay(100);
    });
  });

  describe('GET /api/products/:id', () => {
    it('ska kunna hämta en specifik produkt', async () => {
      if (!createdProductId) {
        throw new Error('Ingen produkt skapad i tidigare test');
      }

      const response = await fetch(`${API_BASE_URL}/products/${createdProductId}`);
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);

      const product = await response.json();
      expect(product.id).toBe(createdProductId);
      expect(product.name).toBe('Test Produkt');
    });

    it('ska returnera 404 för produkt som inte finns', async () => {
      const response = await fetch(`${API_BASE_URL}/products/non-existent-id`);
      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/products/:id', () => {
    it('ska kunna uppdatera en produkt', async () => {
      if (!createdProductId) {
        throw new Error('Ingen produkt skapad i tidigare test');
      }

      const updates = {
        name: 'Uppdaterad Test Produkt',
        status: 'active',
      };

      const response = await fetch(`${API_BASE_URL}/products/${createdProductId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      expect(response.ok).toBe(true);
      const updatedProduct = await response.json();
      expect(updatedProduct.name).toBe(updates.name);
      expect(updatedProduct.status).toBe(updates.status);
    });
  });

  describe('PUT /api/activities/:id', () => {
    it('ska kunna uppdatera en aktivitet', async () => {
      if (!createdActivityId) {
        throw new Error('Ingen aktivitet skapad i tidigare test');
      }

      const updates = {
        status: 'in_progress',
        assigneeId: 'test-assignee',
        assigneeName: 'Test Assignee',
      };

      const response = await fetch(`${API_BASE_URL}/activities/${createdActivityId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      expect(response.ok).toBe(true);
      const updatedActivity = await response.json();
      expect(updatedActivity.status).toBe(updates.status);
      expect(updatedActivity.assigneeId).toBe(updates.assigneeId);
    });
  });

  describe('POST /api/activities/:id/comments', () => {
    it('ska kunna lägga till en kommentar', async () => {
      if (!createdActivityId) {
        throw new Error('Ingen aktivitet skapad i tidigare test');
      }

      const comment = {
        userId: 'comment-user-' + Date.now(),
        userName: 'Test Kommentator',
        text: 'Detta är en testkommentar',
      };

      const response = await fetch(`${API_BASE_URL}/activities/${createdActivityId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(comment),
      });

      expect(response.ok).toBe(true);
      const createdComment = await response.json();
      expect(createdComment).toHaveProperty('id');
      expect(createdComment.text).toBe(comment.text);
      expect(createdComment.userName).toBe(comment.userName);

      // Comment created successfully
    });

    it('ska automatiskt skapa användare för kommentar om den inte finns', async () => {
      if (!createdActivityId) {
        throw new Error('Ingen aktivitet skapad i tidigare test');
      }

      const comment = {
        userId: 'ny-kommentar-user-' + Date.now(),
        userName: 'Ny Kommentator',
        text: 'Kommentar från ny användare',
      };

      const response = await fetch(`${API_BASE_URL}/activities/${createdActivityId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(comment),
      });

      expect(response.ok).toBe(true);
      const createdComment = await response.json();
      expect(createdComment).toHaveProperty('id');
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('ska kunna ta bort en produkt', async () => {
      if (!createdProductId) {
        throw new Error('Ingen produkt skapad i tidigare test');
      }

      const response = await fetch(`${API_BASE_URL}/products/${createdProductId}`, {
        method: 'DELETE',
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result.success).toBe(true);

      // Verifiera att produkten är borttagen
      const getResponse = await fetch(`${API_BASE_URL}/products/${createdProductId}`);
      expect(getResponse.status).toBe(404);
    });
  });

  describe('Felhantering', () => {
    it('ska hantera ogiltig produktdata', async () => {
      const invalidData = {
        // Saknar obligatoriska fält
        name: 'Ogiltig produkt',
      };

      const response = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      });

      // Bör returnera ett fel
      expect(response.ok).toBe(false);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('ska hantera ogiltigt produkt-ID vid uppdatering', async () => {
      const response = await fetch(`${API_BASE_URL}/products/invalid-id`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Test' }),
      });

      expect(response.ok).toBe(false);
    });
  });

  afterAll(async () => {
    // Rensa upp eventuella testprodukter som inte togs bort
    if (createdProductId) {
      try {
        await fetch(`${API_BASE_URL}/products/${createdProductId}`, {
          method: 'DELETE',
        });
      } catch {
        // Ignorera fel vid cleanup
      }
    }
  });
});

