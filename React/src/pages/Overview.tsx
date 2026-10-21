import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import {
  ChartComponent,
  Category,
  DataLabel,
  Legend,
  LineSeries,
  Tooltip,
  SeriesCollectionDirective,
  SeriesDirective,
  Inject,
} from '@syncfusion/ej2-react-charts';
import { BarChart3, ChevronRight, Target, TrendingUp } from 'lucide-react';
import { formatCurrencyAxis, money, percent, type Totals } from '../domain/analytics';
import { chartTheme, palette } from '../styles/palette';

type Props = {
  totals: Totals;
  theme: 'light' | 'dark';
  monthly: Array<{
    month: string;
    label: string;
    actual: number;
    target: number;
    profit: number;
    margin: number;
    orders: number;
  }>;
  onViewDrilldown: () => void;
  onAskAiInsights: () => void;
};
function KpiCard({
  label,
  value,
  note,
  icon,
  onClick,
}: {
  label: string;
  value: string;
  note: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <ButtonComponent cssClass="kpi-card e-card" onClick={onClick}>
      <span className="kpi-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="kpi-label">{label}</span>
      <strong>{value}</strong>
      <span className="kpi-note">
        {note}
        <ChevronRight size={15} aria-hidden="true" />
      </span>
    </ButtonComponent>
  );
}
export function Overview({ totals, monthly, onViewDrilldown, onAskAiInsights, theme }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(0);
  const chartData = monthly.map((item) => ({
    ...item,
    actualTooltip: `${item.label}: ${money.format(item.actual)}`,
    targetTooltip: `${item.label}: ${money.format(item.target)}`,
  }));

  useLayoutEffect(() => {
    const container = chartContainerRef.current;

    if (!container) return;

    const updateWidth = (width: number) => {
      const nextWidth = Math.floor(width);
      setChartWidth((currentWidth) => (currentWidth === nextWidth ? currentWidth : nextWidth));
    };

    updateWidth(container.getBoundingClientRect().width);

    const observer = new ResizeObserver(([entry]) => updateWidth(entry.contentRect.width));
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div className="kpi-grid">
        <KpiCard
          label="Revenue"
          value={formatCurrencyAxis(totals.revenue)}
          note={`${totals.revenueAttainment ? percent.format(totals.revenueAttainment) : '—'} of target`}
          icon={<TrendingUp size={19} />}
          onClick={onViewDrilldown}
        />
        <KpiCard
          label="Operating profit"
          value={formatCurrencyAxis(totals.profit)}
          note="After operating costs"
          icon={<Target size={19} />}
          onClick={onViewDrilldown}
        />
        <KpiCard
          label="Operating margin"
          value={totals.margin === null ? '—' : percent.format(totals.margin)}
          note="Ratio of total revenue"
          icon={<BarChart3 size={19} />}
          onClick={onViewDrilldown}
        />
        <KpiCard
          label="Orders"
          value={totals.orders.toLocaleString('en-US')}
          note={`${totals.ordersTarget.toLocaleString('en-US')} target`}
          icon={<Target size={19} />}
          onClick={onViewDrilldown}
        />
      </div>
      <div className="dashboard-shell">
        <div id="overview-dashboard" className="overview-dashboard">
          <section className="panel wide overview-trend-panel">
            <div className="panel-heading">
              <div>
                <h2>Revenue versus target</h2>
                <p>Monthly performance for the selected period.</p>
              </div>
              <ButtonComponent cssClass="e-flat panel-action" onClick={onViewDrilldown}>
                View drilldown
              </ButtonComponent>
            </div>
            <div ref={chartContainerRef} className="overview-chart">
              {chartWidth > 0 && (
                <ChartComponent
                  key={theme}
                  id="overview-trend"
                  theme={chartTheme(theme)}
                  palettes={[palette(theme).series[0], palette(theme).reference]}
                  height="260px"
                  width={`${chartWidth}px`}
                  margin={{ left: 20, right: 20, top: 32, bottom: 26 }}
                  primaryXAxis={{
                    valueType: 'Category',
                    labelStyle: { size: '12px' },
                    labelIntersectAction: 'None',
                  }}
                  primaryYAxis={{
                    labelFormat: '${value}',
                    labelStyle: { size: '12px' },
                    // One label every $0.2M (axis values are dollars) so the axis reads in clear steps
                    // (user request 2026-10-14), plus an interval of room above and below the data so
                    // edge data labels are not cropped.
                    interval: 200_000,
                    rangePadding: 'Additional',
                  }}
                  axisLabelRender={(args) => {
                    if (args.axis.orientation === 'Vertical') {
                      args.text = formatCurrencyAxis(Number(args.value));
                    }
                  }}
                  textRender={(args) => {
                    args.text = formatCurrencyAxis(args.point.y);
                  }}
                  tooltip={{ enable: true, format: '${point.tooltip}' }}
                  legendSettings={{ visible: true, textWrap: 'Wrap', maximumLabelWidth: 110 }}
                >
                  <Inject services={[LineSeries, Category, DataLabel, Legend, Tooltip]} />
                  <SeriesCollectionDirective>
                    <SeriesDirective
                      dataSource={chartData}
                      xName="label"
                      yName="actual"
                      tooltipMappingName="actualTooltip"
                      name="Actual revenue"
                      type="Line"
                      width={3}
                      marker={{
                        visible: true,
                        width: 7,
                        height: 7,
                        dataLabel: {
                          visible: true,
                          position: 'Top',
                          margin: { top: 8 },
                          font: { size: '11px', fontWeight: '600' },
                          labelIntersectAction: 'None',
                        },
                      }}
                    />
                    <SeriesDirective
                      dataSource={chartData}
                      xName="label"
                      yName="target"
                      tooltipMappingName="targetTooltip"
                      name="Revenue target"
                      type="Line"
                      dashArray="5,5"
                      width={2}
                      marker={{
                        visible: true,
                        width: 7,
                        height: 7,
                        dataLabel: {
                          visible: true,
                          position: 'Bottom',
                          margin: { bottom: 8 },
                          font: { size: '11px', fontWeight: '600' },
                          labelIntersectAction: 'None',
                        },
                      }}
                    />
                  </SeriesCollectionDirective>
                </ChartComponent>
              )}
            </div>
          </section>
          <section className="panel overview-brief-panel">
            <div className="panel-heading">
              <div>
                <h2>Decision brief</h2>
                <p>Selected sample-data snapshot.</p>
              </div>
            </div>
            <div className="brief">
              <strong>
                {totals.revenueAttainment && totals.revenueAttainment < 1
                  ? 'Revenue is below target.'
                  : 'Revenue is meeting target.'}
              </strong>
              <p>Operating profit is {money.format(totals.profit)} across the selected records.</p>
              <ButtonComponent cssClass="e-primary" onClick={onAskAiInsights}>
                Ask AI for decision support
              </ButtonComponent>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
