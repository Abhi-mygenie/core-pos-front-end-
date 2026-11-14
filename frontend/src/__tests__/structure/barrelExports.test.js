// T-12 & T-14 Test Suite: Barrel Exports Validation
// Verifies all barrel exports exist and export the expected components

const fs = require('fs');
const path = require('path');

describe('T-12: Barrel Exports for modals, panels, reports', () => {
  
  // =========================================================================
  // T-12a: modals/index.js
  // =========================================================================
  describe('modals/index.js', () => {
    const indexPath = path.resolve(__dirname, '../../components/modals/index.js');
    
    test('index.js file exists', () => {
      expect(fs.existsSync(indexPath)).toBe(true);
    });

    test('exports RoomCheckInModal', () => {
      const source = fs.readFileSync(indexPath, 'utf-8');
      expect(source).toMatch(/export\s+\{[^}]*RoomCheckInModal[^}]*\}/);
    });

    test('can import from barrel', () => {
      const modals = require('../../components/modals');
      expect(modals.RoomCheckInModal).toBeDefined();
    });
  });

  // =========================================================================
  // T-12b: panels/index.js
  // =========================================================================
  describe('panels/index.js', () => {
    const indexPath = path.resolve(__dirname, '../../components/panels/index.js');
    
    test('index.js file exists', () => {
      expect(fs.existsSync(indexPath)).toBe(true);
    });

    test('exports MenuManagementPanel', () => {
      const source = fs.readFileSync(indexPath, 'utf-8');
      expect(source).toMatch(/export\s+\{[^}]*MenuManagementPanel[^}]*\}/);
    });

    test('exports SettingsPanel', () => {
      const source = fs.readFileSync(indexPath, 'utf-8');
      expect(source).toMatch(/export\s+\{[^}]*SettingsPanel[^}]*\}/);
    });

    test('exports menu sub-components', () => {
      const source = fs.readFileSync(indexPath, 'utf-8');
      expect(source).toMatch(/CategoryList/);
      expect(source).toMatch(/ProductCard/);
      expect(source).toMatch(/ProductForm/);
      expect(source).toMatch(/ProductList/);
    });

    test('exports settings sub-components', () => {
      const source = fs.readFileSync(indexPath, 'utf-8');
      expect(source).toMatch(/TableManagementView/);
    });
  });

  // =========================================================================
  // T-12c: reports/index.js
  // =========================================================================
  describe('reports/index.js', () => {
    const indexPath = path.resolve(__dirname, '../../components/reports/index.js');
    
    test('index.js file exists', () => {
      expect(fs.existsSync(indexPath)).toBe(true);
    });

    const expectedExports = [
      'DatePicker',
      'ExportButtons',
      'FilterBar',
      'FilterTags',
      'OrderDetailSheet',
      'OrderTable',
      'ReportTabs',
      'SummaryBar'
    ];

    test.each(expectedExports)('exports %s', (componentName) => {
      const source = fs.readFileSync(indexPath, 'utf-8');
      expect(source).toMatch(new RegExp(componentName));
    });

    test('all report components match files in directory', () => {
      const reportsDir = path.resolve(__dirname, '../../components/reports');
      const files = fs.readdirSync(reportsDir)
        .filter(f => f.endsWith('.jsx'))
        .map(f => f.replace('.jsx', ''));
      
      const source = fs.readFileSync(indexPath, 'utf-8');
      
      files.forEach(file => {
        expect(source).toMatch(new RegExp(file));
      });
    });
  });
});

describe('T-14: Pages Barrel Export', () => {
  const indexPath = path.resolve(__dirname, '../../pages/index.js');
  
  test('index.js file exists', () => {
    expect(fs.existsSync(indexPath)).toBe(true);
  });

  const expectedPages = [
    'LoginPage',
    'LoadingPage',
    'DashboardPage',
    'OrderSummaryPage',
    'AllOrdersReportPage'
  ];

  test.each(expectedPages)('exports %s', (pageName) => {
    const source = fs.readFileSync(indexPath, 'utf-8');
    expect(source).toMatch(new RegExp(`export.*${pageName}`));
  });

  test('all page files are exported', () => {
    const pagesDir = path.resolve(__dirname, '../../pages');
    const pageFiles = fs.readdirSync(pagesDir)
      .filter(f => f.endsWith('.jsx'))
      .map(f => f.replace('.jsx', ''));
    
    const source = fs.readFileSync(indexPath, 'utf-8');
    
    pageFiles.forEach(page => {
      expect(source).toMatch(new RegExp(page));
    });
  });

  test('no duplicate exports', () => {
    const source = fs.readFileSync(indexPath, 'utf-8');
    const exports = source.match(/export\s+\{[^}]+\}/g) || [];
    const exportNames = exports.flatMap(e => 
      e.match(/\w+Page/g) || []
    );
    const uniqueNames = [...new Set(exportNames)];
    expect(exportNames.length).toBe(uniqueNames.length);
  });
});
