import { useRef } from 'react';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import {
  ChartComponent,
  Category,
  ColumnSeries,
  DataLabel,
  Tooltip,
  SeriesCollectionDirective,
  SeriesDirective,
  Inject,
} from '@syncfusion/ej2-react-charts';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import {
  ColumnDirective,
  ColumnsDirective,
  GridComponent,
  Page,
  Sort,
  Filter,
  Toolbar,
  PdfExport,
  Inject as GridInject,
} from '@syncfusion/ej2-react-grids';
import { Download } from 'lucide-react';
import {
  facts,
  formatCurrencyAxis,
  money,
  metricValue,
  percent,
  type Metric,
  type Totals,
} from '../domain/analytics';
import { chartTheme, palette } from '../styles/palette';
const metricItems = [
  { id: 'revenue', label: 'Revenue' },
  { id: 'profit', label: 'Operating profit' },
  { id: 'margin', label: 'Operating margin' },
  { id: 'orders', label: 'Orders' },
];
export function Kpis({
  metric,
  setMetric,
  totals,
  monthly,
  rows,
  format,
  theme,
}: {
  metric: Metric;
  setMetric: (metric: Metric) => void;
  totals: Totals;
  monthly: Array<{
    month: string;
    label: string;
    actual: number;
    target: number;
    profit: number;
    margin: number;
    orders: number;
  }>;
  rows: typeof facts;
  format: (value: number) => string;
  theme: 'light' | 'dark';
}) {
  const gridRef = useRef<GridComponent>(null);
  const chartData = monthly.map((item) => {
    const value =
      metric === 'profit'
        ? item.profit
        : metric === 'margin'
          ? item.margin
          : metric === 'orders'
            ? item.orders
            : item.actual;

    return { ...item, value, tooltip: `${item.label}: ${format(value)}` };
  });
  return (
    <div className="report-layout">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>{metricItems.find((item) => item.id === metric)?.label} detail</h2>
            <p>Trend and contributing monthly records.</p>
          </div>
          <label className="inline-select">
            Metric
            <DropDownListComponent
              dataSource={metricItems}
              fields={{ text: 'label', value: 'id' }}
              value={metric}
              change={(event) => setMetric(event.value as Metric)}
            />
          </label>
        </div>
        <div className="metric-band">
          <strong>{format(metricValue(totals, metric))}</strong>
          <span>
            {metric === 'revenue' ? `Target ${money.format(totals.revenueTarget)}` : 'Selected context total'}
          </span>
        </div>
        <ChartComponent
          id="kpi-trend"
          key={theme}
          theme={chartTheme(theme)}
          palettes={[palette(theme).series[0]]}
          height="300px"
          width="100%"
          primaryXAxis={{
            valueType: 'Category',
            labelStyle: { size: '12px' },
            labelIntersectAction: 'None',
          }}
          primaryYAxis={{
            labelStyle: { size: '12px' },
          }}
          axisLabelRender={(args) => {
            if (args.axis.orientation !== 'Vertical') return;
            const value = Number(args.value);
            args.text =
              metric === 'margin'
                ? percent.format(value)
                : metric === 'orders'
                  ? value.toLocaleString('en-US')
                  : formatCurrencyAxis(value);
          }}
          textRender={(args) => {
            args.text = format(args.point.y);
          }}
          tooltip={{ enable: true, format: '${point.tooltip}' }}
        >
          <Inject services={[ColumnSeries, Category, DataLabel, Tooltip]} />
          <SeriesCollectionDirective>
            <SeriesDirective
              dataSource={chartData}
              xName="label"
              yName="value"
              tooltipMappingName="tooltip"
              type="Column"
              name="Actual"
              marker={{
                dataLabel: {
                  visible: true,
                  position: 'Top',
                  font: { size: '11px', fontWeight: '600' },
                  labelIntersectAction: 'None',
                },
              }}
            />
          </SeriesCollectionDirective>
        </ChartComponent>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Supporting records</h2>
            <p>{rows.length} matching monthly records · the PDF exports these records.</p>
          </div>
          <ButtonComponent
            cssClass="e-outline"
            onClick={() =>
              gridRef.current?.pdfExport({
                fileName: 'executive-kpi-drilldown.pdf',
                pageOrientation: 'Landscape',
              })
            }
          >
            <Download size={16} /> Export PDF
          </ButtonComponent>
        </div>
        <GridComponent
          ref={gridRef}
          dataSource={rows}
          allowPaging
          allowSorting
          allowFiltering
          allowPdfExport
          allowSelection={false}
          allowTextWrap
          toolbar={['Search']}
          pageSettings={{ pageSize: 10 }}
          created={() => {
            document
              .querySelector<HTMLInputElement>('.e-grid .e-toolbar input')
              ?.setAttribute('aria-label', 'Search supporting records');
          }}
        >
          <ColumnsDirective>
            <ColumnDirective field="month" headerText="Month" width="85" />
            <ColumnDirective field="country" headerText="Country" width="110" />
            <ColumnDirective field="unit" headerText="Business unit" width="105" />
            <ColumnDirective
              field="revenue"
              headerText="Revenue"
              width="125"
              textAlign="Right"
              valueAccessor={(_field, row) => money.format((row as { revenue: number }).revenue)}
            />
            <ColumnDirective
              field="cost"
              headerText="Cost"
              width="120"
              textAlign="Right"
              valueAccessor={(_field, row) => money.format((row as { cost: number }).cost)}
            />
            <ColumnDirective
              field="orders"
              headerText="Orders"
              width="90"
              textAlign="Right"
              valueAccessor={(_field, row) => (row as { orders: number }).orders.toLocaleString('en-US')}
            />
          </ColumnsDirective>
          <GridInject services={[Page, Sort, Filter, Toolbar, PdfExport]} />
        </GridComponent>
      </section>
    </div>
  );
}
