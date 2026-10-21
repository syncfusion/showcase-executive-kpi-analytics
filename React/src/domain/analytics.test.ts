import assert from 'node:assert/strict';
import test from 'node:test';
import {
  datasetInfo,
  dateRangePeriod,
  facts,
  formatChartMonth,
  formatCurrencyAxis,
  getTotals,
  matchesFilters,
  money,
  periods,
  periodDateRange,
  defaultFilters,
  validateDataset,
} from './analytics';
import { reportingPresets } from './periods';
import dataset from '../data/analytics.v1.json';

test('calculates US software December revenue, profit and weighted margin', () => {
  const records = facts.filter((item) => item.id === '2025-12:US:software');
  const result = getTotals(records);
  assert.equal(result.revenue, 120000);
  assert.equal(result.profit, 36000);
  assert.equal(result.margin, 0.3);
});

test('calculates North America December software margin as a ratio of totals', () => {
  const result = getTotals(
    facts.filter(
      (item) => item.month === '2025-12' && item.region === 'North America' && item.unit === 'Software'
    )
  );
  assert.equal(result.revenue, 200000);
  assert.equal(result.profit, 52000);
  assert.equal(result.margin, 0.26);
});

test('does not treat a zero-revenue record as a valid margin', () => {
  assert.equal(getTotals([{ ...facts[0], revenue: 0, cost: 100 }]).margin, null);
});

test('applies only selected dimensions to the shared filter', () => {
  const filter = { ...defaultFilters, region: 'North America', unit: 'Software', country: 'United States' };
  assert.equal(facts.filter((item) => matchesFilters(item, filter)).length, 3);
});

test('offers every complete quarter and individual month in the reporting range', () => {
  assert.ok(periods.some((period) => period.id === '2026-Q1'));
  assert.ok(periods.some((period) => period.id === '2025-Q1'));
  assert.ok(periods.some((period) => period.id === '2025-01' && period.label === 'Jan 2025'));
  assert.equal(
    facts.filter((item) => matchesFilters(item, { ...defaultFilters, period: '2026-Q1' })).length,
    72
  );
});

test('filters monthly data for a calendar date range', () => {
  const range = dateRangePeriod(new Date(2026, 0, 1), new Date(2026, 2, 31));
  assert.equal(facts.filter((item) => matchesFilters(item, { ...defaultFilters, period: range })).length, 72);
  assert.deepEqual(periodDateRange('2026-Q3'), {
    start: new Date(2026, 6, 1),
    end: new Date(2026, 8, 30),
  });
});

test('ships the deterministic full JSON fixture for September 2024 through September 2026', () => {
  assert.equal(datasetInfo.start, '2024-09');
  assert.equal(datasetInfo.end, '2026-09');
  assert.equal(datasetInfo.factCount, 600);
  assert.equal(validateDataset(dataset), true);
});

test('formats chart labels with US months and compact currency units', () => {
  assert.equal(formatChartMonth('2024-09'), 'Sep 2024');
  assert.equal(formatCurrencyAxis(6_500_000), '$6.50M');
  assert.equal(formatCurrencyAxis(6_886_989), '$6.89M');
  assert.equal(formatCurrencyAxis(1_200_000_000), '$1.2B');
});

test('formats full monetary values with US grouping separators', () => {
  assert.equal(money.format(6_886_989), '$6,886,989');
  assert.equal(money.format(1_691_064), '$1,691,064');
});

test('offers the short preset list the data covers', () => {
  const presets = reportingPresets(facts.map((fact) => fact.month));
  const day = (date: Date) => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  assert.deepEqual(presets.map((preset) => `${preset.label}: ${day(preset.start)} to ${day(preset.end)}`), [
    'Q3 2026: 2026-7-1 to 2026-9-30',
    'Q2 2026: 2026-4-1 to 2026-6-30',
    'Q1 2026: 2026-1-1 to 2026-3-31',
    'FY 2026: 2026-1-1 to 2026-9-30',
    'FY 2025: 2025-1-1 to 2025-12-31',
    'Full data: 2024-9-1 to 2026-9-30',
  ]);
  const q3 = presets.find((preset) => preset.label === 'Q3 2026')!;
  assert.equal(facts.filter((item) => matchesFilters(item, { ...defaultFilters, period: dateRangePeriod(q3.start, q3.end) })).length, 72);
});
