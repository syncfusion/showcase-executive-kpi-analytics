import darkThemeUrl from '@syncfusion/ej2-tailwind3-dark-theme/styles/tailwind3-dark.css?url';
import lightThemeUrl from '@syncfusion/ej2-tailwind3-theme/styles/tailwind3.css?url';

type Theme = 'light' | 'dark';

// Ready means the stylesheet's load (or error) event fired. Chrome gives a <link> a `sheet` object as soon
// as it is inserted, before the file arrives, so `link.sheet` cannot tell a loaded theme from a loading one:
// checking it removed #app-boot about 300 ms before the 4.8 MB theme applied, and the unstyled page jumped.
let active: { href: string; ready: Promise<void> } | null = null;
let sequence = 0;

export function applySyncfusionTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  const href = new URL(theme === 'dark' ? darkThemeUrl : lightThemeUrl, window.location.href).href;
  if (active?.href === href) return active.ready;

  // Load the new theme beside the current one and remove the older links only once it has loaded, so no
  // control renders unstyled mid-switch (design-system.md, "Syncfusion theme stylesheets").
  const order = ++sequence;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.syncfusionTheme = String(order);
  const ready = new Promise<void>((resolve) => {
    const done = () => {
      document.querySelectorAll<HTMLLinkElement>('link[data-syncfusion-theme]').forEach((other) => {
        if (Number(other.dataset.syncfusionTheme) < order) other.remove();
      });
      link.id = 'syncfusion-theme';
      resolve();
    };
    link.addEventListener('load', done, { once: true });
    link.addEventListener('error', done, { once: true });
  });

  const previous = [...document.querySelectorAll<HTMLLinkElement>('link[data-syncfusion-theme]')].at(-1);
  if (previous) previous.after(link);
  else document.head.prepend(link);
  active = { href, ready };
  return ready;
}
