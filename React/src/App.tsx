import { lazy, Suspense, useEffect, useMemo, useState, useTransition, type MouseEvent } from 'react';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import {
  DateRangePickerComponent,
  PresetDirective,
  PresetsDirective,
  type RangeEventArgs,
} from '@syncfusion/ej2-react-calendars';
import { DropDownListComponent, type ChangeEventArgs } from '@syncfusion/ej2-react-dropdowns';
import { BreadcrumbComponent } from '@syncfusion/ej2-react-navigations';
import { Globe2, LayoutDashboard, Moon, RotateCcw, Sparkles, Sun, Table2, TrendingUp, X, SearchX } from 'lucide-react';
import {
  datasetInfo,
  dateRangePeriod,
  defaultFilters,
  facts,
  formatChartMonth,
  formatReportingPeriod,
  getTotals,
  matchesFilters,
  money,
  percent,
  periodDateRange,
  type FilterState,
  type Metric,
} from './domain/analytics';
import { applySyncfusionTheme } from './syncfusion-theme';
import { reportingPresets } from './domain/periods';
import { AppShell, type NavItem } from './components/AppShell';
import { Overview } from './pages/Overview';
const Health = lazy(() => import('./pages/Health').then((module) => ({ default: module.Health })));
const Insights = lazy(() => import('./pages/Insights').then((module) => ({ default: module.Insights })));
const Kpis = lazy(() => import('./pages/Kpis').then((module) => ({ default: module.Kpis })));
const PivotAnalytics = lazy(() =>
  import('./pages/PivotAnalytics').then((module) => ({ default: module.PivotAnalytics }))
);
const Regions = lazy(() => import('./pages/Regions').then((module) => ({ default: module.Regions })));

type Route = 'overview' | 'kpis' | 'pivot' | 'regions' | 'insights';
const routes = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'kpis', label: 'KPI Drilldowns', icon: TrendingUp },
  { id: 'pivot', label: 'Pivot Analytics', icon: Table2 },
  { id: 'regions', label: 'Regional Performance', icon: Globe2 },
  { id: 'insights', label: 'AI Insights', icon: Sparkles },
] as const;

// Every complete quarter, fiscal year and month the data covers, and the whole range (src/domain/periods.ts).
const periodPresets = reportingPresets(facts.map((fact) => fact.month));

export function App() {
  const [route, setRoute] = useState<Route>('overview');
  const [filter, setFilter] = useState<FilterState>(defaultFilters);
  const [metric, setMetric] = useState<Metric>('revenue');
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    window.localStorage.getItem('executive-kpi-analytics:theme') === 'dark' ? 'dark' : 'light'
  );
  const [, startRouteTransition] = useTransition();
  const rows = useMemo(() => facts.filter((item) => matchesFilters(item, filter)), [filter]);
  const totals = useMemo(() => getTotals(rows), [rows]);
  const selectedRange = useMemo(() => periodDateRange(filter.period), [filter.period]);
  const monthly = useMemo(
    () =>
      [...new Set(rows.map((item) => item.month))].sort().map((month) => {
        const value = getTotals(rows.filter((item) => item.month === month));
        return {
          month,
          label: formatChartMonth(month),
          actual: value.revenue,
          target: value.revenueTarget,
          profit: value.profit,
          margin: value.margin ?? 0,
          orders: value.orders,
        };
      }),
    [rows]
  );
  useEffect(() => {
    window.localStorage.setItem('executive-kpi-analytics:theme', theme);
    applySyncfusionTheme(theme);
  }, [theme]);
  if (window.location.pathname.endsWith('/healthz'))
    return (
      <Suspense fallback={<PageFallback label="health status" />}>
        <Health />
      </Suspense>
    );
  const navigate = (next: Route) => {
    startRouteTransition(() => setRoute(next));
  };
  const reset = () => {
    setFilter(defaultFilters);
    setMetric('revenue');
  };
  const updateFilter = (key: keyof FilterState) => (event: ChangeEventArgs) =>
    setFilter((current) => ({
      ...current,
      [key]: event.value as string,
      ...(key === 'region' ? { country: 'All countries' } : {}),
    }));
  const updateDateRange = (event: RangeEventArgs) => {
    if (!event.startDate || !event.endDate) return;
    setFilter((current) => ({ ...current, period: dateRangePeriod(event.startDate!, event.endDate!) }));
  };
  const title = routes.find((item) => item.id === route)?.label ?? 'Overview';
  const format = (value: number) =>
    metric === 'margin'
      ? percent.format(value)
      : metric === 'orders'
        ? value.toLocaleString('en-US')
        : money.format(value);
  const navItems: NavItem[] = routes.map((item) => ({
    ...item,
    href: `#${item.id}`,
  }));
  const onNavigate = (id: string, event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    navigate(id as Route);
  };
  return (
    <AppShell
      appName="Executive"
      appSubtitle="Analytics workspace"
      logo="EA"
      items={navItems}
      currentId={route}
      onNavigate={onNavigate}
      storageKey="executive-kpi-analytics-nav-collapsed"
      footer={
        <>
          <span className="data-chip">SYNTHETIC DATA</span>
          <p>React · JSON · Sample AI</p>
        </>
      }
      headerStart={
        <BreadcrumbComponent
          cssClass="app-breadcrumb"
          enableActiveItemNavigation={false}
          items={[{ text: 'Executive Analytics' }, { text: title }]}
        />
      }
      headerEnd={
        <div className="topbar-actions">
          <span className="dataset-status">
            SAMPLE DATA · SEP 2024—SEP 2026 · {datasetInfo.factCount} FACTS
          </span>
          <span className="profile-pill">Public session</span>
          <ButtonComponent
            cssClass="icon-button"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
          </ButtonComponent>
          <ButtonComponent cssClass="icon-button" aria-label="Reset workspace filters" onClick={reset}>
            <RotateCcw size={17} />
          </ButtonComponent>
        </div>
      }
    >
      <section className="page-header">
        <div>
          <h1>{title}</h1>
          <p>
            {route === 'overview'
              ? 'Performance, targets, and the evidence behind each decision.'
              : 'The current filter context is applied across this report.'}
          </p>
        </div>
      </section>
      <section className="filters" aria-label="Reporting scope filters">
        <div className="filter-intro">
          <span>REPORTING SCOPE</span>
          <small>Applies to every report on this page</small>
        </div>
        <label className="filter-field filter-period">
          Reporting period
          <DateRangePickerComponent
            cssClass="period-range"
            startDate={selectedRange.start}
            endDate={selectedRange.end}
            min={new Date(2024, 8, 1)}
            max={new Date(2026, 8, 30)}
            format="M/d/yyyy"
            placeholder="Select a date range"
            change={updateDateRange}
          >
            <PresetsDirective>
              {periodPresets.map((preset) => (
                <PresetDirective key={preset.label} label={preset.label} start={preset.start} end={preset.end} />
              ))}
            </PresetsDirective>
          </DateRangePickerComponent>
        </label>
        <label className="filter-field filter-region">
          Region
          <DropDownListComponent
            dataSource={['All regions', 'North America', 'Europe', 'Asia Pacific', 'Latin America']}
            value={filter.region}
            change={updateFilter('region')}
          />
        </label>
        <label className="filter-field filter-unit">
          Business unit
          <DropDownListComponent
            dataSource={['All business units', 'Software', 'Services', 'Hardware']}
            value={filter.unit}
            change={updateFilter('unit')}
          />
        </label>
        {filter.country !== 'All countries' && (
          <ButtonComponent
            cssClass="filter-chip"
            aria-label={`Remove ${filter.country} country filter`}
            onClick={() => setFilter((current) => ({ ...current, country: 'All countries' }))}
          >
            Country: {filter.country}
            <X size={14} />
          </ButtonComponent>
        )}
        <ButtonComponent cssClass="e-flat reset-filter" onClick={reset}>
          Reset
        </ButtonComponent>
      </section>
      {rows.length === 0 ? (
        // Filters that match no records (data-contract.md, plan Known gap 3): say so, and offer the way back.
        <section className="e-card empty-state" aria-live="polite">
          <SearchX size={28} aria-hidden="true" />
          <h2>No records match these filters</h2>
          <p>Widen the reporting period or choose all regions, business units or countries.</p>
          <ButtonComponent cssClass="e-outline" onClick={reset}>
            Reset filters
          </ButtonComponent>
        </section>
      ) : (
      <Suspense key={route} fallback={<PageFallback label={title} />}>
        {route === 'overview' && (
          <Overview
            totals={totals}
            monthly={monthly}
            theme={theme}
            onViewDrilldown={() => navigate('kpis')}
            onAskAiInsights={() => navigate('insights')}
          />
        )}
        {route === 'kpis' && (
          <Kpis
            metric={metric}
            setMetric={setMetric}
            totals={totals}
            monthly={monthly}
            rows={rows}
            format={format}
            theme={theme}
          />
        )}
        {route === 'pivot' && <PivotAnalytics rows={rows} />}
        {route === 'regions' && (
          <Regions
            rows={rows}
            theme={theme}
            onSelect={(country) => setFilter((current) => ({ ...current, country }))}
          />
        )}
        {route === 'insights' && (
          <Insights totals={totals} recordCount={rows.length} period={formatReportingPeriod(filter.period)} />
        )}
      </Suspense>
      )}
    </AppShell>
  );
}

function PageFallback({ label }: { label: string }) {
  return (
    <div className="page-loading" role="status">
      Loading {label}…
    </div>
  );
}
