import dataset from '../data/analytics.v1.json';

export type Metric = 'revenue' | 'profit' | 'margin' | 'orders';
export interface Fact {
  id: string;
  month: string;
  region: string;
  country: string;
  unit: string;
  revenue: number;
  cost: number;
  revenueTarget: number;
  orders: number;
  ordersTarget: number;
}
export interface FilterState {
  period: string;
  region: string;
  unit: string;
  country: string;
}
export interface Totals {
  revenue: number;
  cost: number;
  profit: number;
  revenueTarget: number;
  orders: number;
  ordersTarget: number;
  margin: number | null;
  revenueAttainment: number | null;
}
type Dataset = typeof dataset;

export const datasetInfo = {
  version: dataset.datasetVersion,
  start: dataset.scenarioStart,
  end: dataset.scenarioEnd,
  factCount: dataset.facts.length,
};
export const facts: Fact[] = dataset.facts.map((row) => ({
  id: row.id,
  month: row.month,
  region: row.region,
  country: row.country,
  unit: row.unit,
  revenue: row.revenueCents / 100,
  cost: row.operatingCostCents / 100,
  revenueTarget: row.revenueTargetCents / 100,
  orders: row.orders,
  ordersTarget: row.ordersTarget,
}));
export const chartMonth = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const quarter = (year: number, q: number) =>
  Array.from({ length: 3 }, (_, index) => `${year}-${String((q - 1) * 3 + index + 1).padStart(2, '0')}`);
const availableMonths = [...new Set(facts.map((fact) => fact.month))].sort();
const availableMonthSet = new Set(availableMonths);
const availableYears = [...new Set(availableMonths.map((month) => month.slice(0, 4)))].sort().reverse();
const availableQuarters = availableYears.flatMap((year) =>
  [4, 3, 2, 1]
    .map((number) => ({
      id: `${year}-Q${number}`,
      label: `Q${number} ${year}`,
      group: 'Quarters',
      months: quarter(Number(year), number),
    }))
    .filter((period) => period.months.every((month) => availableMonthSet.has(month)))
    .map(({ id, label, group }) => ({ id, label, group }))
);
export const periods = [
  ...availableQuarters,
  ...availableYears.map((year) => ({ id: year, label: `FY ${year}`, group: 'Full years' })),
  ...[...availableMonths]
    .reverse()
    .map((month) => ({ id: month, label: formatChartMonth(month), group: 'Months' })),
];
export const defaultFilters: FilterState = {
  period: '2026-Q3',
  region: 'All regions',
  unit: 'All business units',
  country: 'All countries',
};
function periodMonths(period: string) {
  const dateRange = period.match(/^(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})$/);
  if (dateRange) {
    const [, startDate, endDate] = dateRange;
    return availableMonths.filter((month) => month >= startDate.slice(0, 7) && month <= endDate.slice(0, 7));
  }
  if (/^\d{4}-Q[1-4]$/.test(period)) return quarter(Number(period.slice(0, 4)), Number(period.at(-1)));
  if (/^\d{4}$/.test(period)) return facts.filter((f) => f.month.startsWith(period)).map((f) => f.month);
  return [period];
}

function toLocalDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function monthEnd(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(year, monthNumber, 0);
}

export function periodDateRange(period: string) {
  const dateRange = period.match(/^(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})$/);
  if (dateRange) return { start: toLocalDate(dateRange[1]), end: toLocalDate(dateRange[2]) };

  const months = periodMonths(period);
  return {
    start: toLocalDate(`${months[0]}-01`),
    end: monthEnd(months.at(-1) ?? months[0]),
  };
}

export function dateRangePeriod(start: Date, end: Date) {
  const toDateId = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return `${toDateId(start)}:${toDateId(end)}`;
}

export function formatReportingPeriod(period: string) {
  if (/^\d{4}-Q[1-4]$/.test(period)) return `Q${period.at(-1)} ${period.slice(0, 4)}`;
  if (/^\d{4}$/.test(period)) return `FY ${period}`;
  if (/^\d{4}-\d{2}$/.test(period)) return formatChartMonth(period);

  const { start, end } = periodDateRange(period);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).formatRange(
    start,
    end
  );
}
export function matchesFilters(fact: Fact, filter: FilterState) {
  const inPeriod = periodMonths(filter.period).includes(fact.month);
  return (
    inPeriod &&
    (filter.region === 'All regions' || fact.region === filter.region) &&
    (filter.unit === 'All business units' || fact.unit === filter.unit) &&
    (filter.country === 'All countries' || fact.country === filter.country)
  );
}
export function getTotals(records: Fact[]): Totals {
  const total = records.reduce(
    (sum, record) => ({
      revenue: sum.revenue + record.revenue,
      cost: sum.cost + record.cost,
      revenueTarget: sum.revenueTarget + record.revenueTarget,
      orders: sum.orders + record.orders,
      ordersTarget: sum.ordersTarget + record.ordersTarget,
    }),
    { revenue: 0, cost: 0, revenueTarget: 0, orders: 0, ordersTarget: 0 }
  );
  const profit = total.revenue - total.cost;
  return {
    ...total,
    profit,
    margin: total.revenue ? profit / total.revenue : null,
    revenueAttainment: total.revenueTarget ? total.revenue / total.revenueTarget : null,
  };
}
export function metricValue(totals: Totals, metric: Metric) {
  return metric === 'revenue'
    ? totals.revenue
    : metric === 'profit'
      ? totals.profit
      : metric === 'margin'
        ? (totals.margin ?? 0)
        : totals.orders;
}
export const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
export const percent = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 });
export function formatCurrencyAxis(value: number) {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000)
    return `$${(value / 1_000_000_000).toFixed(absolute >= 10_000_000_000 ? 0 : 1)}B`;
  if (absolute >= 1_000_000) {
    const digits = absolute < 10_000_000 ? 2 : absolute < 100_000_000 ? 1 : 0;
    return `$${(value / 1_000_000).toFixed(digits)}M`;
  }
  return money.format(value);
}

export function formatChartMonth(month: string) {
  return chartMonth.format(new Date(`${month}-01T00:00:00Z`));
}
export function validateDataset(input: Dataset) {
  const ids = new Set<string>();
  if (input.schemaVersion !== 1 || input.facts.length !== 600) return false;
  return input.facts.every(
    (fact) =>
      Boolean(fact.id) &&
      fact.month >= input.scenarioStart &&
      fact.month <= input.scenarioEnd &&
      Number.isSafeInteger(fact.revenueCents) &&
      fact.revenueCents >= 0 &&
      !ids.has(fact.id) &&
      (ids.add(fact.id), true)
  );
}
