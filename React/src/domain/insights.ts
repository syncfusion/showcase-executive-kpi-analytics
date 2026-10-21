import { money, percent, type Totals } from './analytics';

// The AI boundary from the data contract ("Sample AI boundary"): the Insights page depends only on
// InsightsProvider, so a customer can pass a real provider (credentials on a server) without changing the view.
export interface InsightsRequest {
  prompt: string;
  period: string;
  totals: Totals;
}
export interface InsightsProvider {
  answer(request: InsightsRequest, signal: AbortSignal): Promise<string>;
}

export const SUGGESTED_QUESTIONS = [
  'How are we performing against target?',
  'Summarize the current results',
  'Which area should I investigate?',
] as const;

const LABEL = 'Sample AI · ';
const attainment = (actual: number, target: number) => (target > 0 ? actual / target : null);
const pct = (value: number | null) => (value === null ? 'unavailable' : percent.format(value));

type Intent = 'investigate' | 'target' | 'summary';
export function intentOf(prompt: string): Intent | null {
  const text = prompt.toLowerCase();
  if (/investigat|which area|where should|focus|attention|risk|problem|weak/.test(text)) return 'investigate';
  if (/target|perform|attain|gap|plan|on track/.test(text)) return 'target';
  if (/summar|overview|result|how are we doing|status|recap/.test(text)) return 'summary';
  return null;
}

// Deterministic answers from the request's totals only: no causes or forecasts the data does not show.
export function sampleAnswer({ prompt, period, totals }: InsightsRequest): string {
  const revenue = attainment(totals.revenue, totals.revenueTarget);
  const orders = attainment(totals.orders, totals.ordersTarget);
  const gap = totals.revenue - totals.revenueTarget;
  switch (intentOf(prompt)) {
    case 'target':
      return `${LABEL}In ${period}, revenue is ${money.format(totals.revenue)} against a ${money.format(totals.revenueTarget)} target: ${pct(revenue)} attainment, ${gap >= 0 ? `${money.format(gap)} above` : `${money.format(-gap)} short of`} target. Orders are ${totals.orders.toLocaleString('en-US')} against ${totals.ordersTarget.toLocaleString('en-US')} (${pct(orders)}).`;
    case 'summary':
      return `${LABEL}${period}: revenue ${money.format(totals.revenue)} (${pct(revenue)} of target), operating profit ${money.format(totals.profit)}, operating margin ${totals.margin === null ? 'unavailable' : percent.format(totals.margin)}, ${totals.orders.toLocaleString('en-US')} orders.`;
    case 'investigate': {
      if (revenue === null && orders === null) return `${LABEL}There are no targets in ${period} to compare against.`;
      const weaker = orders !== null && (revenue === null || orders < revenue) ? 'orders' : 'revenue';
      const value = weaker === 'orders' ? orders : revenue;
      return `${LABEL}In ${period}, ${weaker} is furthest from target at ${pct(value)} attainment${value !== null && value >= 1 ? ', and both measures meet their targets' : ''}. Open KPI Drilldowns for the monthly records, or Regional Performance to see which countries are below target.`;
    }
    default:
      return `${LABEL}I can answer these questions about the current filters: ${SUGGESTED_QUESTIONS.join(' · ')}`;
  }
}

// The sample provider: answers after a short pause, and stops when its request is aborted (a new prompt or a
// filter change replaces a pending answer).
export const sampleInsightsProvider: InsightsProvider = {
  answer(request, signal) {
    return new Promise((resolve, reject) => {
      if (signal.aborted) return reject(new DOMException('Aborted', 'AbortError'));
      const timer = setTimeout(() => resolve(sampleAnswer(request)), 350);
      signal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
    });
  },
};
