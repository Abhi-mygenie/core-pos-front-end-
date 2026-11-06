// T-05 Test: axios.js should NOT have hardcoded preprod fallback
// and should fail fast when REACT_APP_API_BASE_URL is missing

describe('T-05 | axios.js — No hardcoded preprod URL', () => {
  const filePath = require('path').resolve(__dirname, '../../api/axios.js');
  const fs = require('fs');

  test('Source code should NOT contain preprod.mygenie.online', () => {
    const source = fs.readFileSync(filePath, 'utf-8');
    expect(source).not.toContain('preprod.mygenie.online');
  });

  test('Source code should contain env var guard for REACT_APP_API_BASE_URL', () => {
    const source = fs.readFileSync(filePath, 'utf-8');
    // Should reference the env var without a fallback
    expect(source).toContain('REACT_APP_API_BASE_URL');
    // Should have some form of error/throw when missing
    expect(source).toMatch(/throw new Error|throw Error/);
  });

  test('axios instance should use REACT_APP_API_BASE_URL when set', () => {
    // The env var is already set in our .env, so the module should load fine
    const api = require('../../api/axios').default;
    const expectedBase = process.env.REACT_APP_API_BASE_URL;
    expect(api.defaults.baseURL).toBe(expectedBase);
  });
});
