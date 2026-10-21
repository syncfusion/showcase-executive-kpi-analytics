#!/usr/bin/env node
// The app's own interaction checks (plan revision 3, prototype tasks G1, G2, P04, P05; validate V01): what the
// factory browser check does not exercise, including the plan's exact-value journey, the PDF's rows and reload. Run against the served build:
//   node interaction-check.mjs --base http://127.0.0.1:5180/executive-kpi-analytics/react/ > ../../validation/logs/<phase>-interactions.json
// Exit code 0 = every check passed.
import { chromium } from '@playwright/test';
import { inflateSync } from 'node:zlib';

const args = process.argv.slice(2);
const base = args[args.indexOf('--base') + 1] ?? 'http://127.0.0.1:5180/executive-kpi-analytics/react/';
const timeout = Number(args.includes('--action-timeout') ? args[args.indexOf('--action-timeout') + 1] : 15000);
const results = [];
const check = (name, passed, detail) => results.push({ name, passed: !!passed, detail });

const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await context.newPage();
  page.setDefaultTimeout(timeout);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('#app-boot', { state: 'detached' });
  const go = async (name) => { await page.getByRole('link', { name }).click(); await page.getByRole('heading', { name, exact: true }).waitFor(); await page.waitForTimeout(800); };

  // G1: the short preset list (plan revision 4); months and other ranges on the calendar.
  await page.locator('.period-range .e-range-icon, .e-date-range-wrapper .e-input-group-icon').first().click();
  await page.locator('.e-daterangepicker.e-popup-open .e-presets li').first().waitFor({ state: 'visible' });
  const presets = (await page.locator('.e-daterangepicker .e-presets li').allTextContents()).map((t) => t.trim());
  check('date presets are the short list', presets.join(', ') === 'Q3 2026, Q2 2026, Q1 2026, FY 2026, FY 2025, Full data, Custom Range', presets.join(', '));
  const presetList = await page.locator('.e-daterangepicker.e-popup-open .e-presets').first().evaluate((el) => ({ client: el.clientHeight, scroll: el.scrollHeight }));
  check('every preset is visible without scrolling', presetList.scroll <= presetList.client + 1, `list ${presetList.client}px, content ${presetList.scroll}px`);
  await page.waitForTimeout(400);
  await page.locator('.e-daterangepicker .e-presets li', { hasText: /^Custom Range$/ }).click();
  const calendar = page.locator('.e-daterangepicker.e-popup-open .e-calendar').first();
  await calendar.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
  check('Custom Range opens the calendar', await calendar.isVisible(), 'calendar visible after Custom Range');
  await page.keyboard.press('Escape');

  // G2: one answer per suggested question, from the current filters.
  await go('AI Insights');
  const answers = [];
  for (const question of ['How are we performing against target?', 'Summarize the current results', 'Which area should I investigate?']) {
    const before = await page.locator('.e-aiassistview .e-output-container, .e-aiassistview .e-output').count();
    await page.locator('.e-aiassistview textarea, .e-aiassistview .e-assist-textarea').first().fill(question);
    await page.keyboard.press('Enter');
    await page.waitForFunction((n) => document.querySelectorAll('.e-aiassistview .e-output-container, .e-aiassistview .e-output').length > n, before);
    await page.waitForTimeout(400);
    answers.push((await page.locator('.e-aiassistview .e-output-container, .e-aiassistview .e-output').last().innerText()).trim());
  }
  const context_card = (await page.locator('.context-card dd').first().innerText()).trim();
  check('each suggested question gets its own answer', new Set(answers).size === 3 && answers.every((a) => a.startsWith('Sample AI')), answers.map((a) => a.slice(0, 90)).join(' | '));
  check('the target answer uses the context card revenue', answers[0].includes(context_card), `context card revenue ${context_card}`);

  // P05: a map shape applies the country filter, also under a region filter.
  await go('Regional Performance');
  await page.locator('.filter-region .e-ddl, .filter-region .e-input-group').first().click();
  await page.locator('.e-ddl.e-popup li', { hasText: 'Europe' }).first().click();
  await page.waitForTimeout(1500);
  const germany = page.locator('#regional-map [id*="_shapeIndex_3_dataIndex_"]').first();
  await germany.click({ force: true });
  await page.waitForTimeout(800);
  const chip = await page.getByRole('button', { name: /Remove .* country filter|Country:/ }).first().innerText().catch(() => '');
  check('a map shape applies its country under a region filter', /Germany/.test(chip), `chip: ${chip || 'none'}`);
  await page.getByRole('button', { name: /Reset workspace filters/ }).click();
  await page.waitForTimeout(800);

  // P04: the PDF of the filtered records downloads.
  await go('KPI Drilldowns');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Export PDF/ }).click()]);
  const stream = await download.createReadStream();
  const chunks = []; for await (const chunk of stream) chunks.push(chunk);
  const pdf = Buffer.concat(chunks);
  check('the Grid exports a PDF', pdf.subarray(0, 5).toString() === '%PDF-' && pdf.length > 2000, `${download.suggestedFilename()}, ${pdf.length} bytes`);

  // V01: the plan's representative journey with its exact values (plan revision 3, data contract).
  const kpis = async () => { await go('Overview'); return (await page.locator('.kpi-card strong').allInnerTexts()).map((t) => t.trim()); };
  // Pick an item only once the popup has finished opening: a click during its animation is lost
  // (syncfusion-component-patterns.md, "Syncfusion first").
  const pick = async (field, item) => {
    await page.locator(`.${field} .e-ddl, .${field} .e-input-group`).first().click();
    const option = page.locator('.e-ddl.e-popup.e-popup-open li', { hasText: new RegExp(`^${item}$`) }).first();
    await option.waitFor({ state: 'visible' }); await page.waitForTimeout(400);
    await option.click(); await page.waitForTimeout(600);
  };
  // A single month is a range typed (or picked) on the calendar, not a preset.
  const periodInput = page.locator('input.e-daterangepicker, .period-range input').first();
  await periodInput.fill('12/1/2025 - 12/31/2025');
  await periodInput.press('Tab');
  await page.waitForTimeout(500);
  await pick('filter-region', 'North America');
  await pick('filter-unit', 'Software');
  await go('Regional Performance');
  await page.locator('.country-button', { hasText: 'United States' }).first().click();
  await page.waitForTimeout(500);
  const unitedStates = await kpis();
  check('journey: Dec 2025, North America, Software, United States', unitedStates.join(' | ') === '$120,000 | $36,000 | 30% | 1,200', unitedStates.join(' | '));
  await page.getByRole('button', { name: /Remove .* country filter/ }).first().click();
  await page.waitForTimeout(500);
  const northAmerica = await kpis();
  check('journey: removing the chip includes Canada (ratio of totals)', northAmerica.slice(0, 3).join(' | ') === '$200,000 | $52,000 | 26%', northAmerica.join(' | '));

  // V01: the PDF lists the Grid's records (two December software rows: United States and Canada).
  await go('KPI Drilldowns');
  const gridRows = (await page.locator('.e-grid .e-row').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
  const [pdfDownload] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Export PDF/ }).click()]);
  const pdfChunks = []; for await (const chunk of await pdfDownload.createReadStream()) pdfChunks.push(chunk);
  const pdfBytes = Buffer.concat(pdfChunks), latin = pdfBytes.toString('latin1');
  let pdfText = '';
  for (const match of latin.matchAll(/stream\r?\n/g)) {
    const start = match.index + match[0].length, end = latin.indexOf('endstream', start);
    try { pdfText += inflateSync(pdfBytes.subarray(start, end)).toString('latin1'); } catch { pdfText += latin.slice(start, end); }
  }
  // Text-showing operators: Tj, ' and " (Syncfusion writes each cell with ').
  const shown = [...pdfText.matchAll(/\(((?:\\.|[^\\)])*)\)\s*(?:Tj|'|")/g)].map((m) => m[1]).join(' ');
  const pages = (latin.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  const wanted = ['United States', 'Canada', '$120,000', '$80,000'];
  check('the PDF lists the Grid rows', gridRows.length === 2 && wanted.every((w) => shown.includes(w)),
    `grid ${gridRows.length} rows; PDF ${pages} page(s), finds ${wanted.filter((w) => shown.includes(w)).join(', ') || 'none'} of ${wanted.join(', ')}`);

  // V01: a reload resets the filters (session-only) but keeps the theme (stored).
  await page.getByRole('button', { name: /Switch to dark theme/ }).click();
  await page.waitForTimeout(1500);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('#app-boot', { state: 'detached' });
  await page.waitForTimeout(1000);
  const afterReload = { theme: await page.evaluate(() => document.documentElement.dataset.theme), revenue: (await page.locator('.kpi-card strong').first().innerText()).trim() };
  check('reload keeps the theme and resets the filters', afterReload.theme === 'dark' && afterReload.revenue === '$6.89M', JSON.stringify(afterReload));

  // V01: an unsupported prompt gets the supported questions.
  await go('AI Insights');
  const outputs = () => page.locator('.e-aiassistview .e-output-container, .e-aiassistview .e-output');
  const count = await outputs().count();
  await page.locator('.e-aiassistview textarea, .e-aiassistview .e-assist-textarea').first().fill('Write me a poem about Q3');
  await page.keyboard.press('Enter');
  await page.waitForFunction((n) => { const all = document.querySelectorAll('.e-aiassistview .e-output-container, .e-aiassistview .e-output');
    return all.length > n && /Sample AI/.test(all[all.length - 1].textContent ?? ''); }, count);
  const fallback = (await outputs().last().innerText()).trim();
  check('an unsupported prompt lists the supported questions', /I can answer these questions/.test(fallback) && fallback.includes('Which area should I investigate?'), fallback.slice(0, 120));

  check('no uncaught errors', errors.length === 0, errors.slice(0, 3).join(' | ') || 'none');
  await context.close();
} catch (error) {
  check('interaction run', false, error.message.split('\n')[0]);
} finally {
  await browser.close();
}
const failed = results.filter((result) => !result.passed).length;
process.stdout.write(JSON.stringify({ checkedAt: new Date().toISOString(), base, passed: failed === 0, failed, total: results.length, results }, null, 2) + '\n');
process.exitCode = failed ? 1 : 0;
