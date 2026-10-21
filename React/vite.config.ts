import { defineConfig } from 'vite';
import startupPreload from './scripts/startup-preload.mjs';

const basePath = process.env.VITE_BASE_PATH ?? '/executive-kpi-analytics/react/';

export default defineConfig({
  base: basePath,
  plugins: [
    startupPreload({
      base: basePath,
      defaultRoute: 'overview',
      routes: {
        overview: ['src/pages/Overview.tsx'],
        kpis: ['src/pages/Kpis.tsx'],
        pivot: ['src/pages/PivotAnalytics.tsx'],
        regions: ['src/pages/Regions.tsx'],
        insights: ['src/pages/Insights.tsx'],
      },
      themes: { light: /tailwind3-[\w-]+\.css$/, dark: /tailwind3-dark-[\w-]+\.css$/ },
    }),
  ],
  resolve: {
    // Rolldown reports unsupported React Server Component directives from Lucide's ESM files.
    // The package's declared CommonJS entry has the same browser API without those directives.
    alias: { 'lucide-react': 'lucide-react/dist/cjs/lucide-react.js' },
  },
  build: {
    // Pivot analytics is a lazy, on-demand report. Its isolated 2.18 MB module is intentional.
    chunkSizeWarningLimit: 2300,
  },
  define: {
    __APP_VERSION__: JSON.stringify('0.1.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
});
