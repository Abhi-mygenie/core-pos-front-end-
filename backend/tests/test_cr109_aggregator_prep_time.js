// CR-109 unit tests for computeAggregatorPrepTime
// Run: node /app/backend/tests/test_cr109_aggregator_prep_time.js
import { computeAggregatorPrepTime } from '/app/frontend/src/utils/aggregatorPrepTime.js';

const results = [];
function test(name, actual, expected) {
  const pass = actual === expected;
  results.push({ name, expected, actual, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'} :: ${name} :: expected=${expected} got=${actual}`);
}

// Per review_request other_misc_info — actual API shape for restaurant 478
const settingsFromAPI = {
  default_prep_time: 15,
  prep_time_count_method: 'quantity',
  prep_time_bonus_config: [
    { min: 1, max: 3, bonus: 0 },
    { min: 4, max: 6, bonus: 5 },
    { min: 7, max: 10, bonus: 10 },
    { min: 11, max: 15, bonus: 15 },
    { min: 16, max: 999, bonus: 20 },
  ],
};

test('1 item → 15 min',  computeAggregatorPrepTime([{ qty: 1 }],  settingsFromAPI), 15);
test('3 items → 15 min', computeAggregatorPrepTime([{ qty: 3 }],  settingsFromAPI), 15);
test('5 items → 20 min', computeAggregatorPrepTime([{ qty: 5 }],  settingsFromAPI), 20);
test('8 items → 25 min', computeAggregatorPrepTime([{ qty: 8 }],  settingsFromAPI), 25);
test('12 items → 30 min',computeAggregatorPrepTime([{ qty: 12 }], settingsFromAPI), 30);
test('20 items → 35 min',computeAggregatorPrepTime([{ qty: 20 }], settingsFromAPI), 35);

// Also test camelCase (as transformed by profileTransform.js — hypothetical fix)
const settingsCamel = {
  defaultPrepTime: 15,
  prepTimeBonusConfig: [
    { min: 1, max: 3, bonus: 0 }, { min: 4, max: 6, bonus: 5 },
    { min: 7, max: 10, bonus: 10 }, { min: 11, max: 15, bonus: 15 },
    { min: 16, max: 999, bonus: 20 },
  ],
};
test('CAMEL 5 items → 20 min (hypothetical)', computeAggregatorPrepTime([{ qty: 5 }], settingsCamel), 20);

const failed = results.filter(r => !r.pass).length;
console.log(`\nTotal: ${results.length}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
