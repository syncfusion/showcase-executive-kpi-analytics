import assert from 'node:assert/strict';
import test from 'node:test';
import { facts, getTotals, matchesFilters, defaultFilters } from './analytics';
import { SUGGESTED_QUESTIONS, intentOf, sampleAnswer, sampleInsightsProvider, type InsightsProvider } from './insights';

const december = getTotals(facts.filter((item) => matchesFilters(item, { ...defaultFilters, period: '2025-12', region: 'North America', unit: 'Software', country: 'United States' })));
const request = (prompt: string) => ({ prompt, period: 'Dec 2025', totals: december });

test('each suggested question has its own answer from the current totals', () => {
  assert.deepEqual(SUGGESTED_QUESTIONS.map(intentOf), ['target', 'summary', 'investigate']);
  const target = sampleAnswer(request(SUGGESTED_QUESTIONS[0]));
  assert.match(target, /^Sample AI · /);
  assert.match(target, /\$120,000 against a \$125,000 target: 96% attainment, \$5,000 short of target/);
  const summary = sampleAnswer(request(SUGGESTED_QUESTIONS[1]));
  assert.match(summary, /operating profit \$36,000, operating margin 30%, 1,200 orders/);
  const investigate = sampleAnswer(request(SUGGESTED_QUESTIONS[2]));
  assert.match(investigate, /is furthest from target at 96% attainment/);
  assert.notEqual(target, summary);
  assert.notEqual(summary, investigate);
});

test('answers follow the filters, and unsupported prompts list the supported questions', () => {
  const canada = getTotals(facts.filter((item) => matchesFilters(item, { ...defaultFilters, period: '2025-12', region: 'North America', unit: 'Software', country: 'Canada' })));
  assert.match(sampleAnswer({ prompt: 'How are we performing against target?', period: 'Dec 2025', totals: canada }), /\$80,000 against a \$75,000 target: 106.7% attainment, \$5,000 above target/);
  assert.match(sampleAnswer(request('Write me a poem')), /I can answer these questions about the current filters: How are we performing against target\?/);
});

test('the sample provider stops when its request is aborted', async () => {
  assert.match(await sampleInsightsProvider.answer(request('Summarize the current results'), new AbortController().signal), /\$36,000/);
  const controller = new AbortController();
  const pending = sampleInsightsProvider.answer(request('Summarize the current results'), controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
});

test('another provider can stand in through the same interface', async () => {
  const customer: InsightsProvider = { answer: async ({ prompt, totals }) => `Customer model: ${prompt} (${totals.revenue})` };
  assert.equal(await customer.answer(request('Summarize'), new AbortController().signal), 'Customer model: Summarize (120000)');
});
