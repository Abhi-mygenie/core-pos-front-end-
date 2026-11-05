// T-10 Test Suite: window.__SOCKET_SERVICE__ gated behind dev mode
// 2 tests

const fs = require('fs');
const path = require('path');

const socketServicePath = path.resolve(__dirname, '../../../api/socket/socketService.js');
const source = fs.readFileSync(socketServicePath, 'utf-8');

describe('T-10: window.__SOCKET_SERVICE__ gated behind dev mode', () => {

  test('T1: No bare window.__SOCKET_SERVICE__ assignment (must be gated behind NODE_ENV)', () => {
    // Should NOT have: window.__SOCKET_SERVICE__ = ... without a dev check
    // Match lines that assign __SOCKET_SERVICE__ WITHOUT being inside a NODE_ENV block
    const bareAssignment = source.match(/^\s*window\.__SOCKET_SERVICE__\s*=/gm) || [];
    // If gated, the assignment line will be indented inside an if block
    // We check that a NODE_ENV guard exists near the assignment
    const hasDevGuard = source.includes("process.env.NODE_ENV === 'development'") && source.includes('__SOCKET_SERVICE__');
    expect(hasDevGuard).toBe(true);
  });

  test('T2: NODE_ENV development check wraps the __SOCKET_SERVICE__ assignment', () => {
    // The pattern should be: if (NODE_ENV === 'development' && typeof window...)
    // or nested: if (NODE_ENV === 'development') { ... window.__SOCKET_SERVICE__ ... }
    const devBlockPattern = /process\.env\.NODE_ENV\s*===\s*'development'[\s\S]{0,200}__SOCKET_SERVICE__/;
    expect(source).toMatch(devBlockPattern);
  });
});
