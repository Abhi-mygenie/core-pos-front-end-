// T-05 Test: socketEvents.js should NOT have hardcoded presocket fallback

describe('T-05 | socketEvents.js — No hardcoded presocket URL', () => {
  const filePath = require('path').resolve(__dirname, '../../../api/socket/socketEvents.js');
  const fs = require('fs');

  test('Source code should NOT contain presocket.mygenie.online', () => {
    const source = fs.readFileSync(filePath, 'utf-8');
    expect(source).not.toContain('presocket.mygenie.online');
  });

  test('Source code should reference REACT_APP_SOCKET_URL env var', () => {
    const source = fs.readFileSync(filePath, 'utf-8');
    expect(source).toContain('REACT_APP_SOCKET_URL');
  });

  test('SOCKET_CONFIG.URL should not be undefined when env var is set', () => {
    // Set the env var for this test
    process.env.REACT_APP_SOCKET_URL = 'https://test-socket.mygenie.online';
    // Clear module cache to re-evaluate
    jest.resetModules();
    const { SOCKET_CONFIG } = require('../../../api/socket/socketEvents');
    expect(SOCKET_CONFIG.URL).toBe('https://test-socket.mygenie.online');
    // Cleanup
    delete process.env.REACT_APP_SOCKET_URL;
  });
});
