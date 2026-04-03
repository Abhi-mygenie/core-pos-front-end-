// T-05 Test: categoryTransform.js should NOT have hardcoded preprod storage URL

describe('T-05 | categoryTransform.js — No hardcoded preprod storage URL', () => {
  const filePath = require('path').resolve(__dirname, '../../../api/transforms/categoryTransform.js');
  const fs = require('fs');

  test('Source code should NOT contain preprod.mygenie.online', () => {
    const source = fs.readFileSync(filePath, 'utf-8');
    expect(source).not.toContain('preprod.mygenie.online');
  });

  test('getCategoryImageUrl should return null for null input', () => {
    const { fromAPI } = require('../../../api/transforms/categoryTransform');
    const result = fromAPI.category({ id: 1, name: 'Test', image: null, status: 'Yes' });
    expect(result.categoryImage).toBeNull();
  });

  test('getCategoryImageUrl should return null for def.png placeholder', () => {
    const { fromAPI } = require('../../../api/transforms/categoryTransform');
    const result = fromAPI.category({ id: 1, name: 'Test', image: 'def.png', status: 'Yes' });
    expect(result.categoryImage).toBeNull();
  });

  test('getCategoryImageUrl should return full URL as-is', () => {
    const { fromAPI } = require('../../../api/transforms/categoryTransform');
    const result = fromAPI.category({ id: 1, name: 'Test', image: 'https://cdn.example.com/cat.png', status: 'Yes' });
    expect(result.categoryImage).toBe('https://cdn.example.com/cat.png');
  });

  test('getCategoryImageUrl should prepend env-based storage URL for relative paths', () => {
    process.env.REACT_APP_API_BASE_URL = 'https://prod.mygenie.online';
    jest.resetModules();
    const { fromAPI } = require('../../../api/transforms/categoryTransform');
    const result = fromAPI.category({ id: 1, name: 'Test', image: 'pizza.jpg', status: 'Yes' });
    expect(result.categoryImage).not.toContain('preprod.mygenie.online');
    expect(result.categoryImage).toBe('https://prod.mygenie.online/storage/category/pizza.jpg');
  });
});
