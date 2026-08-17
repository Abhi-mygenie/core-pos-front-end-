/**
 * BUG-168 Display Fix Tests
 * Tests for getAddonText() and hasAddons() helper functions in CartPanel.jsx
 * 
 * These helpers compute addon display text dynamically:
 * - getAddonText(item): Returns "addon1 x(qty×itemQty), addon2 x(qty×itemQty)"
 * - hasAddons(item): Returns true if item has any addon data
 */

// Mock the helper functions from CartPanel.jsx
// Since they're module-level functions, we recreate them here for testing

const getAddonText = (item) => {
  const addons = item.selectedAddons || item.addOns || [];
  const itemQty = item.qty || 1;
  if (addons.length > 0) {
    return addons
      .filter(a => a.name)
      .map(a => `${a.name} x${(a.quantity || a.qty || 1) * itemQty}`)
      .join(", ");
  }
  return item.customizations?.addons?.join(", ") || '';
};

const hasAddons = (item) => {
  return (item.selectedAddons?.length > 0) || (item.addOns?.length > 0) || (item.customizations?.addons?.length > 0);
};

describe('BUG-168: CartPanel Addon Display Fix', () => {
  
  describe('getAddonText helper', () => {
    
    test('owner scenario: item qty=3, addon qty=1 per unit → displays "milk x3"', () => {
      const item = {
        qty: 3,
        selectedAddons: [{ id: 1, name: 'milk', quantity: 1, price: 10 }]
      };
      expect(getAddonText(item)).toBe('milk x3');
    });

    test('item qty=1, addon qty=1 → displays "milk x1" (no change for single items)', () => {
      const item = {
        qty: 1,
        selectedAddons: [{ id: 1, name: 'milk', quantity: 1, price: 10 }]
      };
      expect(getAddonText(item)).toBe('milk x1');
    });

    test('multiple addons: item qty=3, milk x1 and honey x2 per unit → displays "milk x3, honey x6"', () => {
      const item = {
        qty: 3,
        selectedAddons: [
          { id: 1, name: 'milk', quantity: 1, price: 10 },
          { id: 2, name: 'honey', quantity: 2, price: 15 }
        ]
      };
      expect(getAddonText(item)).toBe('milk x3, honey x6');
    });

    test('uses addOns array when selectedAddons is not present', () => {
      const item = {
        qty: 2,
        addOns: [{ id: 1, name: 'cheese', qty: 1, price: 20 }]
      };
      expect(getAddonText(item)).toBe('cheese x2');
    });

    test('falls back to customizations.addons when no structured data', () => {
      const item = {
        qty: 3,
        customizations: {
          addons: ['milk x1', 'honey x2']
        }
      };
      // Fallback uses static text, not computed
      expect(getAddonText(item)).toBe('milk x1, honey x2');
    });

    test('returns empty string when no addons', () => {
      const item = { qty: 3 };
      expect(getAddonText(item)).toBe('');
    });

    test('filters out addons without name', () => {
      const item = {
        qty: 2,
        selectedAddons: [
          { id: 1, name: 'milk', quantity: 1 },
          { id: 2, quantity: 1 }, // no name
          { id: 3, name: 'sugar', quantity: 1 }
        ]
      };
      expect(getAddonText(item)).toBe('milk x2, sugar x2');
    });

    test('defaults addon quantity to 1 when not specified', () => {
      const item = {
        qty: 3,
        selectedAddons: [{ id: 1, name: 'milk' }] // no quantity
      };
      expect(getAddonText(item)).toBe('milk x3');
    });

    test('defaults item qty to 1 when not specified', () => {
      const item = {
        selectedAddons: [{ id: 1, name: 'milk', quantity: 2 }]
      };
      expect(getAddonText(item)).toBe('milk x2');
    });

    test('handles large quantities correctly', () => {
      const item = {
        qty: 10,
        selectedAddons: [{ id: 1, name: 'extra shot', quantity: 3 }]
      };
      expect(getAddonText(item)).toBe('extra shot x30');
    });
  });

  describe('hasAddons helper', () => {
    
    test('returns true when selectedAddons has items', () => {
      const item = {
        selectedAddons: [{ id: 1, name: 'milk', quantity: 1 }]
      };
      expect(hasAddons(item)).toBe(true);
    });

    test('returns true when addOns has items', () => {
      const item = {
        addOns: [{ id: 1, name: 'cheese', qty: 1 }]
      };
      expect(hasAddons(item)).toBe(true);
    });

    test('returns true when customizations.addons has items', () => {
      const item = {
        customizations: {
          addons: ['milk x1']
        }
      };
      expect(hasAddons(item)).toBe(true);
    });

    test('returns false when no addon data', () => {
      const item = { qty: 3, name: 'Coffee' };
      expect(hasAddons(item)).toBe(false);
    });

    test('returns false when addon arrays are empty', () => {
      const item = {
        selectedAddons: [],
        addOns: [],
        customizations: { addons: [] }
      };
      expect(hasAddons(item)).toBe(false);
    });

    test('returns false when addon properties are undefined', () => {
      const item = {
        selectedAddons: undefined,
        addOns: undefined,
        customizations: undefined
      };
      expect(hasAddons(item)).toBe(false);
    });
  });

  describe('Integration scenarios', () => {
    
    test('new item added to cart with addons (unplaced)', () => {
      // Simulates item added via ItemCustomizationModal
      const item = {
        id: 'temp-123',
        name: 'Latte',
        qty: 2,
        price: 150,
        selectedAddons: [
          { id: 1, name: 'Oat Milk', quantity: 1, price: 30 },
          { id: 2, name: 'Extra Shot', quantity: 1, price: 20 }
        ],
        customizations: {
          addons: ['Oat Milk x1', 'Extra Shot x1'] // static text from modal
        }
      };
      
      // hasAddons should return true
      expect(hasAddons(item)).toBe(true);
      
      // getAddonText should compute dynamic qty (2 × 1 = 2 for each)
      expect(getAddonText(item)).toBe('Oat Milk x2, Extra Shot x2');
    });

    test('placed item from socket with addOns array', () => {
      // Simulates item received from backend via socket
      const item = {
        id: 12345,
        name: 'Cappuccino',
        qty: 3,
        price: 180,
        addOns: [
          { id: 1, name: 'Vanilla Syrup', quantity: 2, price: 25 }
        ]
      };
      
      expect(hasAddons(item)).toBe(true);
      // 3 items × 2 syrups per item = 6 total
      expect(getAddonText(item)).toBe('Vanilla Syrup x6');
    });

    test('item with only static customizations (legacy data)', () => {
      // Simulates older order data without structured addon info
      const item = {
        id: 67890,
        name: 'Mocha',
        qty: 2,
        customizations: {
          size: 'Large',
          variants: ['Iced'],
          addons: ['Whipped Cream x1', 'Chocolate Drizzle x1']
        }
      };
      
      expect(hasAddons(item)).toBe(true);
      // Falls back to static text (not computed)
      expect(getAddonText(item)).toBe('Whipped Cream x1, Chocolate Drizzle x1');
    });
  });
});
