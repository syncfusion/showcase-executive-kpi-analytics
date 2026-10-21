import { useEffect, useRef } from 'react';
import { AIAssistViewComponent, type PromptRequestEventArgs } from '@syncfusion/ej2-react-interactive-chat';
import { Bot } from 'lucide-react';
import { money, type Totals } from '../domain/analytics';
import { SUGGESTED_QUESTIONS, sampleInsightsProvider, type InsightsProvider } from '../domain/insights';

export function Insights({
  totals,
  period,
  provider = sampleInsightsProvider,
}: {
  totals: Totals;
  recordCount: number;
  period: string;
  /** The AI provider (data contract, "Sample AI boundary"); the sample one unless a customer passes theirs. */
  provider?: InsightsProvider;
}) {
  const assistantRef = useRef<AIAssistViewComponent>(null);
  const pending = useRef<AbortController | null>(null);
  // The view may keep its first promptRequest handler, so the handler reads the current filters from a ref.
  const context = useRef({ period, totals, provider });
  context.current = { period, totals, provider };

  // A filter change replaces a pending answer: its totals would no longer match the context card.
  const contextKey = `${period}|${totals.revenue}|${totals.revenueTarget}|${totals.profit}|${totals.orders}`;
  useEffect(() => {
    if (!pending.current) return;
    pending.current.abort();
    pending.current = null;
    assistantRef.current?.addPromptResponse('Sample AI · The filters changed before this answer was ready. Ask again for the current selection.');
  }, [contextKey]);
  useEffect(() => () => pending.current?.abort(), []);

  const onPrompt = (args: PromptRequestEventArgs) => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    const { period: currentPeriod, totals: currentTotals, provider: currentProvider } = context.current;
    currentProvider.answer({ prompt: args.prompt ?? '', period: currentPeriod, totals: currentTotals }, controller.signal).then(
      (text) => {
        if (pending.current !== controller) return;
        pending.current = null;
        assistantRef.current?.addPromptResponse(text);
      },
      () => {
        if (controller.signal.aborted || pending.current !== controller) return;
        pending.current = null;
        assistantRef.current?.addPromptResponse('Sample AI · No answer this time. Please ask again.');
      }
    );
  };
  return (
    <div className="insights">
      <section className="e-card context-card">
        <span className="context-icon">
          <Bot size={20} />
        </span>
        <div className="e-card-header">
          <div className="e-card-header-caption">
            <h2 className="e-card-header-title">Sample AI context</h2>
          </div>
        </div>
        <div className="e-card-content">
          <p>Responses are deterministic, based only on current filtered sample data.</p>
          <dl>
            <div>
              <dt>Revenue</dt>
              <dd>{money.format(totals.revenue)}</dd>
            </div>
            <div>
              <dt>Target</dt>
              <dd>{money.format(totals.revenueTarget)}</dd>
            </div>
            <div>
              <dt>Profit</dt>
              <dd>{money.format(totals.profit)}</dd>
            </div>
          </dl>
        </div>
      </section>
      <section className="panel assistant-panel">
        <div className="panel-heading">
          <div>
            <h2>Ask about the selected data</h2>
            <p>Sample AI · no external model or data connection.</p>
          </div>
        </div>
        <AIAssistViewComponent
          ref={assistantRef}
          id="insights-assistant"
          height="450px"
          promptPlaceholder="Ask about revenue, target gaps, or performance"
          promptSuggestions={[...SUGGESTED_QUESTIONS]}
          promptRequest={onPrompt}
        />
      </section>
    </div>
  );
}
