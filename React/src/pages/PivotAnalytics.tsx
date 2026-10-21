import {
  PivotViewComponent,
  GroupingBar,
  DrillThrough,
  PDFExport,
  Inject as PivotInject,
} from '@syncfusion/ej2-react-pivotview';
import { facts } from '../domain/analytics';
export function PivotAnalytics({ rows }: { rows: typeof facts }) {
  const pivotRows = rows.map((row) => ({ ...row, profit: row.revenue - row.cost }));
  return (
    <section className="panel pivot-panel">
      <div className="panel-heading">
        <div>
          <h2>Interactive pivot report</h2>
          <p>Drag fields to explore additive measures. Drill through records remain read-only.</p>
        </div>
      </div>
      <PivotViewComponent
        id="analytics-pivot"
        height={500}
        width="100%"
        dataSourceSettings={{
          dataSource: pivotRows,
          rows: [{ name: 'region' }, { name: 'country' }],
          columns: [{ name: 'unit' }],
          values: [
            { name: 'revenue', caption: 'Revenue' },
            { name: 'profit', caption: 'Operating profit' },
            { name: 'orders', caption: 'Orders' },
          ],
          formatSettings: [
            { name: 'revenue', format: 'C0' },
            { name: 'profit', format: 'C0' },
            { name: 'orders', format: 'N0' },
          ],
        }}
        showGroupingBar
        allowDrillThrough
        allowPdfExport
      >
        <PivotInject services={[GroupingBar, DrillThrough, PDFExport]} />
      </PivotViewComponent>
    </section>
  );
}
