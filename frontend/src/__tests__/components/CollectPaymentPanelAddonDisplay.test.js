/**
 * BUG-168 Iteration 3: CollectPaymentPanel addon display tests
 * 
 * Tests the addon qty display fix in CollectPaymentPanel.jsx:
 * - L1862-1881: View 1 customizations + fallback paths
 * - L2217-2236: View 2 customizations + fallback paths
 * 
 * The fix computes total addon qty as: (per-unit addon qty × item qty)
 * instead of showing per-unit only.
 */

// Helper function that mirrors the inline computation in CollectPaymentPanel.jsx L1866
const computeAddonDisplayText_CustomizationsPath = (item) => {
  // This mirrors the logic at L1866 and L2221:
  // {(item.selectedAddons?.length > 0 || item.addOns?.length > 0) 
  //   ? ` + ${(item.selectedAddons || item.addOns).filter(a => a.name).map(a => 
  //       `${a.name} x${(a.quantity || a.qty || 1) * (item.qty || 1)}`
  //     ).join(", ")}` 
  //   : (item.customizations.addons?.length > 0 ? ` + ${item.customizations.addons.join(", ")}` : '')}
  
  const addons = item.selectedAddons || item.addOns || [];
  const itemQty = item.qty || 1;
  
  if (addons.length > 0) {
    const addonTexts = addons
      .filter(a => a.name)
      .map(a => `${a.name} x${(a.quantity || a.qty || 1) * itemQty}`);
    return addonTexts.length > 0 ? ` + ${addonTexts.join(", ")}` : '';
  }
  
  // Fallback to static customizations.addons
  if (item.customizations?.addons?.length > 0) {
    return ` + ${item.customizations.addons.join(", ")}`;
  }
  
  return '';
};

// Helper function that mirrors the inline computation in CollectPaymentPanel.jsx L1877-1880
const computeAddonDisplayText_FallbackPath = (item) => {
  // This mirrors the logic at L1877-1880 and L2232-2235:
  // {item.addOns?.length > 0 && `${item.variation?.length > 0 ? ' + ' : ''}${item.addOns.map(a => {
  //   const totalQty = (a.quantity || a.qty || 1) * (item.qty || 1); // BUG-168
  //   return totalQty > 1 ? `${a.name} x${totalQty}` : a.name;
  // }).filter(Boolean).join(', ')}`}
  
  if (!item.addOns || item.addOns.length === 0) return '';
  
  const itemQty = item.qty || 1;
  const prefix = item.variation?.length > 0 ? ' + ' : '';
  
  const addonTexts = item.addOns.map(a => {
    const totalQty = (a.quantity || a.qty || 1) * itemQty;
    return totalQty > 1 ? `${a.name} x${totalQty}` : a.name;
  }).filter(Boolean);
  
  return addonTexts.length > 0 ? `${prefix}${addonTexts.join(', ')}` : '';
};

describe('BUG-168 CollectPaymentPanel Addon Display - Customizations Path (L1866, L2221)', () => {
  
  test('owner scenario: item qty=4, addon qty=1 per unit → displays "Extra Shot x4"', () => {
    const item = {
      name: 'Latte',
      qty: 4,
      selectedAddons: [{ name: 'Extra Shot', quantity: 1 }],
      customizations: { size: 'Large' }
    };
    
    const result = computeAddonDisplayText_CustomizationsPath(item);
    expect(result).toBe(' + Extra Shot x4');
  });
  
  test('item qty=3, addon qty=2 per unit → displays "milk x6"', () => {
    const item = {
      name: 'Coffee',
      qty: 3,
      selectedAddons: [{ name: 'milk', quantity: 2 }],
      customizations: { size: 'Medium' }
    };
    
    const result = computeAddonDisplayText_CustomizationsPath(item);
    expect(result).toBe(' + milk x6');
  });
  
  test('item qty=1, addon qty=1 → displays "milk x1"', () => {
    const item = {
      name: 'Coffee',
      qty: 1,
      selectedAddons: [{ name: 'milk', quantity: 1 }],
      customizations: { size: 'Small' }
    };
    
    const result = computeAddonDisplayText_CustomizationsPath(item);
    expect(result).toBe(' + milk x1');
  });
  
  test('multiple addons: item qty=2, milk x1 and honey x2 per unit → displays "milk x2, honey x4"', () => {
    const item = {
      name: 'Tea',
      qty: 2,
      selectedAddons: [
        { name: 'milk', quantity: 1 },
        { name: 'honey', quantity: 2 }
      ],
      customizations: { size: 'Large' }
    };
    
    const result = computeAddonDisplayText_CustomizationsPath(item);
    expect(result).toBe(' + milk x2, honey x4');
  });
  
  test('uses addOns array when selectedAddons is not present', () => {
    const item = {
      name: 'Coffee',
      qty: 3,
      addOns: [{ name: 'sugar', qty: 1 }],
      customizations: { size: 'Medium' }
    };
    
    const result = computeAddonDisplayText_CustomizationsPath(item);
    expect(result).toBe(' + sugar x3');
  });
  
  test('falls back to customizations.addons when no structured data', () => {
    const item = {
      name: 'Coffee',
      qty: 2,
      customizations: { 
        size: 'Large',
        addons: ['Extra Shot', 'Whipped Cream']
      }
    };
    
    const result = computeAddonDisplayText_CustomizationsPath(item);
    expect(result).toBe(' + Extra Shot, Whipped Cream');
  });
  
  test('returns empty string when no addons', () => {
    const item = {
      name: 'Coffee',
      qty: 2,
      customizations: { size: 'Large' }
    };
    
    const result = computeAddonDisplayText_CustomizationsPath(item);
    expect(result).toBe('');
  });
  
  test('filters out addons without name', () => {
    const item = {
      name: 'Coffee',
      qty: 2,
      selectedAddons: [
        { name: 'milk', quantity: 1 },
        { quantity: 2 }, // no name
        { name: '', quantity: 1 } // empty name
      ],
      customizations: { size: 'Medium' }
    };
    
    const result = computeAddonDisplayText_CustomizationsPath(item);
    expect(result).toBe(' + milk x2');
  });
  
  test('defaults addon quantity to 1 when not specified', () => {
    const item = {
      name: 'Coffee',
      qty: 3,
      selectedAddons: [{ name: 'milk' }], // no quantity
      customizations: { size: 'Medium' }
    };
    
    const result = computeAddonDisplayText_CustomizationsPath(item);
    expect(result).toBe(' + milk x3');
  });
  
  test('defaults item qty to 1 when not specified', () => {
    const item = {
      name: 'Coffee',
      selectedAddons: [{ name: 'milk', quantity: 2 }],
      customizations: { size: 'Medium' }
    };
    
    const result = computeAddonDisplayText_CustomizationsPath(item);
    expect(result).toBe(' + milk x2');
  });
});

describe('BUG-168 CollectPaymentPanel Addon Display - Fallback Path (L1877-1880, L2232-2235)', () => {
  
  test('owner scenario: item qty=4, addon qty=1 per unit → displays "Extra Shot x4"', () => {
    const item = {
      name: 'Latte',
      qty: 4,
      addOns: [{ name: 'Extra Shot', quantity: 1 }]
      // No customizations - uses fallback path
    };
    
    const result = computeAddonDisplayText_FallbackPath(item);
    expect(result).toBe('Extra Shot x4');
  });
  
  test('item qty=3, addon qty=2 per unit → displays "milk x6"', () => {
    const item = {
      name: 'Coffee',
      qty: 3,
      addOns: [{ name: 'milk', quantity: 2 }]
    };
    
    const result = computeAddonDisplayText_FallbackPath(item);
    expect(result).toBe('milk x6');
  });
  
  test('item qty=1, addon qty=1 → displays just addon name (no x1)', () => {
    const item = {
      name: 'Coffee',
      qty: 1,
      addOns: [{ name: 'milk', quantity: 1 }]
    };
    
    const result = computeAddonDisplayText_FallbackPath(item);
    expect(result).toBe('milk');
  });
  
  test('multiple addons: item qty=2, milk x1 and honey x2 per unit → displays "milk x2, honey x4"', () => {
    const item = {
      name: 'Tea',
      qty: 2,
      addOns: [
        { name: 'milk', quantity: 1 },
        { name: 'honey', quantity: 2 }
      ]
    };
    
    const result = computeAddonDisplayText_FallbackPath(item);
    expect(result).toBe('milk x2, honey x4');
  });
  
  test('with variation present, adds " + " prefix', () => {
    const item = {
      name: 'Coffee',
      qty: 2,
      addOns: [{ name: 'milk', quantity: 1 }],
      variation: [{ name: 'Size', values: [{ label: 'Large' }] }]
    };
    
    const result = computeAddonDisplayText_FallbackPath(item);
    expect(result).toBe(' + milk x2');
  });
  
  test('without variation, no prefix', () => {
    const item = {
      name: 'Coffee',
      qty: 2,
      addOns: [{ name: 'milk', quantity: 1 }]
    };
    
    const result = computeAddonDisplayText_FallbackPath(item);
    expect(result).toBe('milk x2');
  });
  
  test('returns empty string when no addOns', () => {
    const item = {
      name: 'Coffee',
      qty: 2
    };
    
    const result = computeAddonDisplayText_FallbackPath(item);
    expect(result).toBe('');
  });
  
  test('uses qty property when quantity is not present', () => {
    const item = {
      name: 'Coffee',
      qty: 3,
      addOns: [{ name: 'milk', qty: 2 }] // uses qty instead of quantity
    };
    
    const result = computeAddonDisplayText_FallbackPath(item);
    expect(result).toBe('milk x6');
  });
  
  test('defaults addon quantity to 1 when not specified', () => {
    const item = {
      name: 'Coffee',
      qty: 3,
      addOns: [{ name: 'milk' }] // no quantity
    };
    
    const result = computeAddonDisplayText_FallbackPath(item);
    expect(result).toBe('milk x3');
  });
  
  test('defaults item qty to 1 when not specified', () => {
    const item = {
      name: 'Coffee',
      addOns: [{ name: 'milk', quantity: 2 }]
    };
    
    const result = computeAddonDisplayText_FallbackPath(item);
    expect(result).toBe('milk x2');
  });
  
  test('handles large quantities correctly', () => {
    const item = {
      name: 'Party Order',
      qty: 10,
      addOns: [{ name: 'Extra Cheese', quantity: 3 }]
    };
    
    const result = computeAddonDisplayText_FallbackPath(item);
    expect(result).toBe('Extra Cheese x30');
  });
});

describe('BUG-168 CollectPaymentPanel - Integration scenarios', () => {
  
  test('QSR flow: item with customizations and selectedAddons', () => {
    const item = {
      name: 'Cappuccino',
      qty: 4,
      selectedAddons: [
        { name: 'Extra Shot', quantity: 1 },
        { name: 'Vanilla Syrup', quantity: 1 }
      ],
      customizations: {
        size: 'Large',
        variants: ['Oat Milk']
      }
    };
    
    const result = computeAddonDisplayText_CustomizationsPath(item);
    expect(result).toBe(' + Extra Shot x4, Vanilla Syrup x4');
  });
  
  test('Socket fallback: item with variation and addOns (no customizations)', () => {
    const item = {
      name: 'Pizza',
      qty: 2,
      variation: [
        { name: 'Size', values: [{ label: 'Large', optionPrice: '100' }] }
      ],
      addOns: [
        { name: 'Extra Cheese', quantity: 2 },
        { name: 'Olives', quantity: 1 }
      ]
    };
    
    const result = computeAddonDisplayText_FallbackPath(item);
    expect(result).toBe(' + Extra Cheese x4, Olives x2');
  });
  
  test('Collect bill screen: placed item from API with addOns array', () => {
    const item = {
      name: 'Burger',
      qty: 3,
      addOns: [
        { name: 'Bacon', qty: 1 },
        { name: 'Cheese', qty: 2 }
      ]
    };
    
    const result = computeAddonDisplayText_FallbackPath(item);
    expect(result).toBe('Bacon x3, Cheese x6');
  });
});
