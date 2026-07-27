// CR-109 unit tests for computeAggregatorPrepTime (iteration_12 — post-fix)
// Run: node /app/backend/tests/test_cr109_aggregator_prep_time.js
import { computeAggregatorPrepTime } from '/app/frontend/src/utils/aggregatorPrepTime.js';

const results = [];
function test(name, actual, expected) {
  const pass = actual === expected;
  results.push({ name, expected, actual, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'} :: ${name} :: expected=${expected} got=${actual}`);
}

// Per review_request other_misc_info — API bracket field names + string values
const settingsFromAPI = {
  defaultPrepTime: 15,
  prepTimeBonusConfig: [
    { min_items: '1',  max_items: '3',   bonus_minutes: '0'  },
    { min_items: '4',  max_items: '6',   bonus_minutes: '5'  },
    { min_items: '7',  max_items: '10',  bonus_minutes: '10' },
    { min_items: '11', max_items: '15',  bonus_minutes: '15' },
    { min_items: '16', max_items: '999', bonus_minutes: '20' },
  ],
};

test('1 item → 15',   computeAggregatorPrepTime([{ qty: 1 }],  settingsFromAPI), 15);
test('3 items → 15',  computeAggregatorPrepTime([{ qty: 3 }],  settingsFromAPI), 15);
test('5 items → 20',  computeAggregatorPrepTime([{ qty: 5 }],  settingsFromAPI), 20);
test('8 items → 25',  computeAggregatorPrepTime([{ qty: 8 }],  settingsFromAPI), 25);
test('12 items → 30', computeAggregatorPrepTime([{ qty: 12 }], settingsFromAPI), 30);
test('20 items → 35', computeAggregatorPrepTime([{ qty: 20 }], settingsFromAPI), 35);

// Also test camelCase bracket variant (min/max/bonus)
const settingsCamel = {
  defaultPrepTime: 15,
  prepTimeBonusConfig: [
    { min: 1, max: 3, bonus: 0 }, { min: 4, max: 6, bonus: 5 },
    { min: 7, max: 10, bonus: 10 }, { min: 11, max: 15, bonus: 15 },
    { min: 16, max: 999, bonus: 20 },
  ],
};
test('CAMEL 5 items → 20', computeAggregatorPrepTime([{ qty: 5 }], settingsCamel), 20);

// Snake_case settings fallback
const settingsSnake = {
  default_prep_time: 15,
  prep_time_bonus_config: [
    { min_items: 1, max_items: 3, bonus_minutes: 0 },
    { min_items: 4, max_items: 6, bonus_minutes: 5 },
  ],
};
test('SNAKE 5 items → 20', computeAggregatorPrepTime([{ qty: 5 }], settingsSnake), 20);

// Multi-item aggregation (2+3 = 5 → 20)
test('MULTI qty 2+3 → 20', computeAggregatorPrepTime([{ qty: 2 }, { qty: 3 }], settingsFromAPI), 20);

// Empty brackets → base
test('Empty brackets → 15', computeAggregatorPrepTime([{ qty: 5 }], { defaultPrepTime: 15, prepTimeBonusConfig: [] }), 15);

const failed = results.filter(r => !r.pass).length;
console.log(`\nTotal: ${results.length}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
