import {
  MapsComponent,
  LayersDirective,
  LayerDirective,
  Legend as MapsLegend,
  MapsTooltip,
  DataLabel,
  Selection,
  Inject as MapsInject,
} from '@syncfusion/ej2-react-maps';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { ChevronRight } from 'lucide-react';
import { facts, money, percent } from '../domain/analytics';
import { chartTheme, palette } from '../styles/palette';
const shapes = {
  type: 'FeatureCollection',
  features: [
    ['United States', -126, 25, -66, 49],
    ['Canada', -141, 49, -52, 70],
    ['United Kingdom', -8, 50, 2, 59],
    ['Germany', 5, 47, 15, 55],
    ['India', 68, 8, 97, 35],
    ['Australia', 113, -44, 154, -10],
    ['Brazil', -74, -34, -35, 6],
    ['Mexico', -118, 14, -86, 33],
  ].map(([name, x1, y1, x2, y2]) => ({
    type: 'Feature',
    properties: { name },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [x1, y1],
          [x2, y1],
          [x2, y2],
          [x1, y2],
          [x1, y1],
        ],
      ],
    },
  })),
};
// Syncfusion's smartLabelMode 'Hide' lets a name run a few pixels past its shape (white text on the white
// map surface then looks cut, "Australi" on a phone). After each draw, hide any name that does not fit
// inside its own shape; the country list beside the map names every country.
function fitMapLabels() {
  const map = document.getElementById('regional-map');
  map?.querySelectorAll<SVGTextElement>('text[id*="_LabelIndex_"]').forEach((label) => {
    const index = label.id.match(/shapeIndex_(\d+)/)?.[1];
    const shape = map.querySelector(`[id*="_shapeIndex_${index}_dataIndex_"]`);
    const text = label.getBoundingClientRect();
    const area = shape?.getBoundingClientRect();
    const fits = !!area && text.left >= area.left - 1 && text.right <= area.right + 1 && text.top >= area.top - 1 && text.bottom <= area.bottom + 1;
    label.style.visibility = fits ? '' : 'hidden';
  });
}

export function Regions({
  rows,
  onSelect,
  theme,
}: {
  rows: typeof facts;
  onSelect: (country: string) => void;
  theme: 'light' | 'dark';
}) {
  const colors = palette(theme);
  const countries = Object.values(
    rows.reduce<
      Record<string, { country: string; region: string; revenue: number; target: number; attainment: number }>
    >((all, row) => {
      const item = all[row.country] ?? {
        country: row.country,
        region: row.region,
        revenue: 0,
        target: 0,
        attainment: 0,
      };
      item.revenue += row.revenue;
      item.target += row.revenueTarget;
      item.attainment = item.target ? item.revenue / item.target : 0;
      all[row.country] = item;
      return all;
    }, {})
  );
  return (
    <div className="regions">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Regional performance</h2>
            <p>Select a country in the map or accessible list.</p>
          </div>
        </div>
        <MapsComponent
          id="regional-map"
          height="460px"
          width="100%"
          theme={chartTheme(theme)}
          background={colors.mapSurface}
          legendSettings={{ visible: true }}
          loaded={fitMapLabels}
          click={(event) => {
            // The shape index follows the GeoJSON features, not the (filtered) country list.
            const shapeIndex = event.target.match(/shapeIndex_(\d+)/)?.[1];
            const country = shapeIndex ? shapes.features[Number(shapeIndex)]?.properties.name : undefined;
            if (country && countries.some((item) => item.country === country)) onSelect(String(country));
          }}
        >
          <MapsInject services={[MapsLegend, MapsTooltip, DataLabel, Selection]} />
          <LayersDirective>
            <LayerDirective
              shapeData={shapes}
              dataSource={countries}
              shapeDataPath="country"
              shapePropertyPath="name"
              tooltipSettings={{ visible: true, valuePath: 'country' }}
              selectionSettings={{ enable: true }}
              dataLabelSettings={{
                visible: true,
                labelPath: 'name',
                // A name that does not fit its shape is hidden (the list beside the map names every
                // country): overlapping labels on small shapes, and labels past the map's edge on phones.
                smartLabelMode: 'Hide',
                intersectionAction: 'Hide',
                textStyle: { size: '11px', fontWeight: '600', color: colors.mapLabel },
              }}
              shapeSettings={{
                colorValuePath: 'attainment',
                colorMapping: [
                  { from: 0, to: 0.95, color: colors.danger, label: 'Below target' },
                  { from: 0.95, to: 1, color: colors.warning, label: 'Attention' },
                  { from: 1, to: 5, color: colors.success, label: 'Healthy' },
                ],
                border: { color: colors.mapBorder, width: 1 },
              }}
            />
          </LayersDirective>
        </MapsComponent>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Countries</h2>
            <p>Select a country to carry context.</p>
          </div>
        </div>
        <div className="country-list">
          {countries.map((country) => (
            <ButtonComponent
              key={country.country}
              cssClass="e-flat country-button"
              onClick={() => onSelect(country.country)}
            >
              <span>
                <strong>{country.country}</strong>
                <small>{country.region}</small>
              </span>
              <span>
                <strong>{money.format(country.revenue)}</strong>
                <small>{percent.format(country.attainment)} of target</small>
              </span>
              <ChevronRight size={16} />
            </ButtonComponent>
          ))}
        </div>
      </section>
    </div>
  );
}
