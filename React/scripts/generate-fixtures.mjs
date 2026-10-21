import { mkdir, writeFile } from 'node:fs/promises';

const countries = [
  ['US', 'United States', 'North America'],
  ['CA', 'Canada', 'North America'],
  ['GB', 'United Kingdom', 'Europe'],
  ['DE', 'Germany', 'Europe'],
  ['IN', 'India', 'Asia Pacific'],
  ['AU', 'Australia', 'Asia Pacific'],
  ['BR', 'Brazil', 'Latin America'],
  ['MX', 'Mexico', 'Latin America'],
];
const units = [
  ['software', 'Software', 1.24, 0.72],
  ['services', 'Services', 1, 0.76],
  ['hardware', 'Hardware', 0.82, 0.8],
];
const months = Array.from({ length: 25 }, (_, index) => {
  const date = new Date(Date.UTC(2024, 8 + index, 1));
  return date.toISOString().slice(0, 7);
});
const facts = months.flatMap((month, monthIndex) =>
  countries.flatMap(([countryId, country, region], countryIndex) =>
    units.map(([unitId, unit, unitWeight, costRate], unitIndex) => {
      const baseline =
        48000 +
        countryIndex * 5100 +
        monthIndex * 1100 +
        ((monthIndex * 17 + countryIndex * 11 + unitIndex * 7) % 9) * 650;
      let revenue = Math.round(baseline * unitWeight) * 100;
      let cost = Math.round((revenue / 100) * costRate) * 100;
      let target =
        Math.round((revenue / 100) * (0.97 + ((monthIndex + countryIndex + unitIndex) % 6) * 0.012)) * 100;
      let orders = Math.round(revenue / 100 / (unitId === 'services' ? 220 : 100));
      if (month === '2025-11' && countryId === 'US' && unitId === 'software')
        [revenue, cost, target, orders] = [10000000, 7500000, 11000000, 1000];
      if (month === '2025-12' && countryId === 'US' && unitId === 'software')
        [revenue, cost, target, orders] = [12000000, 8400000, 12500000, 1200];
      if (month === '2025-11' && countryId === 'CA' && unitId === 'software')
        [revenue, cost, target, orders] = [10000000, 7000000, 9500000, 1000];
      if (month === '2025-12' && countryId === 'CA' && unitId === 'software')
        [revenue, cost, target, orders] = [8000000, 6400000, 7500000, 800];
      return {
        id: `${month}:${countryId}:${unitId}`,
        month,
        countryId,
        country,
        region,
        unitId,
        unit,
        revenueCents: revenue,
        operatingCostCents: cost,
        revenueTargetCents: target,
        operatingCostTargetCents: Math.round(target * costRate),
        orders,
        ordersTarget: Math.round(orders * 1.03),
      };
    })
  )
);
const dataset = {
  schemaVersion: 1,
  datasetVersion: '2026.09-v1',
  currency: 'USD',
  scenarioStart: '2024-09',
  scenarioEnd: '2026-09',
  generatedBy: 'scripts/generate-fixtures.mjs',
  facts,
};
const json = JSON.stringify(dataset, null, 2) + '\n';
await mkdir(new URL('../src/data/', import.meta.url), { recursive: true });
await mkdir(new URL('../public/data/', import.meta.url), { recursive: true });
await Promise.all([
  writeFile(new URL('../src/data/analytics.v1.json', import.meta.url), json),
  writeFile(new URL('../public/data/analytics.v1.json', import.meta.url), json),
]);
console.log(
  `Generated ${facts.length} synthetic facts for ${dataset.scenarioStart} through ${dataset.scenarioEnd}.`
);
