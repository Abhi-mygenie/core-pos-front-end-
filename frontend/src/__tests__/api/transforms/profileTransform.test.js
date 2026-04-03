// T-05 Test: profileTransform.js should NOT have hardcoded preprod storage URL

describe('T-05 | profileTransform.js — No hardcoded preprod storage URL', () => {
  const filePath = require('path').resolve(__dirname, '../../../api/transforms/profileTransform.js');
  const fs = require('fs');

  test('Source code should NOT contain preprod.mygenie.online', () => {
    const source = fs.readFileSync(filePath, 'utf-8');
    expect(source).not.toContain('preprod.mygenie.online');
  });

  test('getImageUrl should return null for null/empty input', () => {
    const { fromAPI } = require('../../../api/transforms/profileTransform');
    
    const result = fromAPI.profileResponse({
      restaurants: [{ id: 1, name: 'Test', logo: null }],
    });
    expect(result.restaurant.logo).toBeNull();
  });

  test('getImageUrl should return full URL as-is when it starts with http', () => {
    const { fromAPI } = require('../../../api/transforms/profileTransform');
    
    const result = fromAPI.profileResponse({
      restaurants: [{ id: 1, name: 'Test', logo: 'https://cdn.example.com/logo.png' }],
    });
    expect(result.restaurant.logo).toBe('https://cdn.example.com/logo.png');
  });

  test('getImageUrl should prepend storage base for relative paths', () => {
    process.env.REACT_APP_API_BASE_URL = 'https://prod.mygenie.online';
    jest.resetModules();
    const { fromAPI } = require('../../../api/transforms/profileTransform');
    
    const result = fromAPI.profileResponse({
      restaurants: [{ id: 1, name: 'Test', logo: 'images/logo.png' }],
    });
    // Should use env var base, NOT hardcoded preprod
    expect(result.restaurant.logo).not.toContain('preprod.mygenie.online');
    expect(result.restaurant.logo).toContain('images/logo.png');
  });
});
