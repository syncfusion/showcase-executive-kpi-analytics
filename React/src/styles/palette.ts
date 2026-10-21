export type AppTheme = 'light' | 'dark';

type Palette = {
  danger: string;
  warning: string;
  success: string;
  reference: string;
  series: readonly [string, string];
  mapSurface: string;
  mapBorder: string;
  /** Ink for names drawn on the map's status-toned shapes: 4.5:1 or more on each band's fill. */
  mapLabel: string;
};

const palettes: Record<AppTheme, Palette> = {
  light: {
    danger: '#b42318',
    warning: '#b54708',
    success: '#027a48',
    reference: '#667085',
    series: ['#175cd3', '#0f766e'],
    mapSurface: '#ffffff',
    mapBorder: '#ffffff',
    mapLabel: '#ffffff',
  },
  dark: {
    danger: '#fca5a5',
    warning: '#fbbf24',
    success: '#86efac',
    reference: '#94a3b8',
    series: ['#93c5fd', '#2dd4bf'],
    mapSurface: '#111827',
    mapBorder: '#334155',
    mapLabel: '#0f172a',
  },
};

export const palette = (theme: AppTheme) => palettes[theme];

export const chartTheme = (theme: AppTheme): 'Tailwind3' | 'Tailwind3Dark' =>
  theme === 'dark' ? 'Tailwind3Dark' : 'Tailwind3';
