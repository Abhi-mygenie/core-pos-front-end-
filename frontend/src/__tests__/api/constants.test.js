// T-08 Test Suite: API Constants — No duplicate keys, valid values
// 4 tests

const fs = require('fs');
const path = require('path');

const constantsPath = path.resolve(__dirname, '../../api/constants.js');
const source = fs.readFileSync(constantsPath, 'utf-8');

// Import the actual exported object
const { API_ENDPOINTS } = require('../../api/constants');

describe('T-08: API Constants — No duplicate keys', () => {

  test('T1: EDIT_ORDER_ITEM key exists exactly once in source (no duplicate)', () => {
    // Count occurrences of "EDIT_ORDER_ITEM:" (with colon, to match key definitions)
    // Exclude EDIT_ORDER_ITEM_QTY to avoid false match
    const matches = source.match(/^\s*EDIT_ORDER_ITEM\s*:/gm) || [];
    expect(matches.length).toBe(1);
  });

  test('T2: EDIT_ORDER_ITEM_QTY key exists as a new distinct key', () => {
    const matches = source.match(/^\s*EDIT_ORDER_ITEM_QTY\s*:/gm) || [];
    expect(matches.length).toBe(1);
    expect(API_ENDPOINTS.EDIT_ORDER_ITEM_QTY).toBeDefined();
  });

  test('T3: All API_ENDPOINTS values are valid URL paths (/api/...) or TBD', () => {
    for (const [key, value] of Object.entries(API_ENDPOINTS)) {
      const isValidPath = value.startsWith('/api/');
      const isTBD = value === 'TBD';
      expect(
        isValidPath || isTBD
      ).toBe(true);
    }
  });

  test('T4: No duplicate keys exist anywhere in API_ENDPOINTS source', () => {
    // Extract all key definitions from the API_ENDPOINTS object block
    // Match lines like "  KEY_NAME:  'value',"
    const keyPattern = /^\s+([A-Z_]+)\s*:/gm;
    const keys = [];
    let match;
    
    // Only scan the API_ENDPOINTS block
    const endpointsBlock = source.match(/export const API_ENDPOINTS\s*=\s*\{([\s\S]*?)\};/);
    expect(endpointsBlock).not.toBeNull();
    
    const block = endpointsBlock[1];
    while ((match = keyPattern.exec(block)) !== null) {
      keys.push(match[1]);
    }

    // Check for duplicates
    const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
    expect(duplicates).toEqual([]);
  });
});
