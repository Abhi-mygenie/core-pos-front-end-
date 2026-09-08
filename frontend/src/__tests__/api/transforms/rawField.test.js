// T-11 Test Suite: _raw fields gated behind development mode
// 3 tests

const fs = require('fs');
const path = require('path');

const reportTransformPath = path.resolve(__dirname, '../../../api/transforms/reportTransform.js');
const reportServicePath = path.resolve(__dirname, '../../../api/services/reportService.js');
const transformSource = fs.readFileSync(reportTransformPath, 'utf-8');
const serviceSource = fs.readFileSync(reportServicePath, 'utf-8');

describe('T-11: _raw fields gated behind development mode', () => {

  test('T1: No bare _raw: api or _raw: data lines (all must be gated)', () => {
    // Match lines like "    _raw: api," or "    _raw: data," that are NOT inside a spread
    // Bare pattern: line starts with whitespace, then "_raw:" directly
    const bareRawInTransform = transformSource.match(/^\s+_raw:\s*(api|data)\s*,/gm) || [];
    const bareRawInService = serviceSource.match(/^\s+_raw:\s*(api|data)\s*,/gm) || [];

    expect(bareRawInTransform).toEqual([]);
    expect(bareRawInService).toEqual([]);
  });

  test('T2: Exactly 9 NODE_ENV development guards for _raw across both files', () => {
    const guardPattern = /process\.env\.NODE_ENV\s*===\s*'development'\s*\?\s*\{\s*_raw:/g;
    const transformGuards = (transformSource.match(guardPattern) || []).length;
    const serviceGuards = (serviceSource.match(guardPattern) || []).length;

    // 7 in reportTransform.js + 2 in reportService.js = 9
    expect(transformGuards).toBe(7);
    expect(serviceGuards).toBe(2);
    expect(transformGuards + serviceGuards).toBe(9);
  });

  test('T3: No component or page file references ._raw or destructures _raw', () => {
    const componentsDir = path.resolve(__dirname, '../../../components');
    const pagesDir = path.resolve(__dirname, '../../../pages');

    const scanDir = (dir) => {
      const files = [];
      const walk = (d) => {
        const entries = fs.readdirSync(d, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(d, entry.name);
          if (entry.isDirectory() && entry.name !== 'ui') {
            walk(fullPath);
          } else if (entry.isFile() && /\.(jsx|js)$/.test(entry.name)) {
            files.push(fullPath);
          }
        }
      };
      walk(dir);
      return files;
    };

    const allFiles = [...scanDir(componentsDir), ...scanDir(pagesDir)];

    for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const relPath = path.relative(path.resolve(__dirname, '../../..'), file);

      // Check for ._raw access (e.g., order._raw, item._raw)
      const dotRaw = content.match(/\._raw\b/g) || [];
      expect(dotRaw.length).toBe(0);

      // Check for destructuring _raw (e.g., { _raw } = order)
      const destructureRaw = content.match(/\{\s*_raw\b/g) || [];
      expect(destructureRaw.length).toBe(0);
    }
  });
});
