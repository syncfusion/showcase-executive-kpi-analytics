export default function startupPreload({ base, routes, defaultRoute, themes }) {
  return {
    name: 'startup-preload',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, context) {
        const bundle = context.bundle;
        if (!bundle) return html;
        const files = Object.values(bundle);
        const chunkFor = (suffix) =>
          files.find(
            (file) => file.type === 'chunk' && file.facadeModuleId?.replaceAll('\\', '/').endsWith(suffix)
          );
        const importsFor = (chunk, seen = new Set()) => {
          if (!chunk || seen.has(chunk.fileName)) return seen;
          seen.add(chunk.fileName);
          for (const name of chunk.imports ?? []) importsFor(bundle[name], seen);
          return seen;
        };
        const routeChunks = Object.fromEntries(
          Object.entries(routes).map(([route, modules]) => [
            route,
            [...new Set(modules.flatMap((module) => [...importsFor(chunkFor(module))]))],
          ])
        );
        const findAsset = (test) =>
          files.find((file) => file.type === 'asset' && test.test(file.fileName))?.fileName;
        const sheets = { light: findAsset(themes.light), dark: findAsset(themes.dark) };
        const script = `<script>(function(){var base=${JSON.stringify(base)},routes=${JSON.stringify(routeChunks)},sheets=${JSON.stringify(sheets)};var path=location.pathname,route=path.slice(path.indexOf(base)===0?base.length:1).split('/')[0]||${JSON.stringify(defaultRoute)},dark=document.documentElement.dataset.theme==='dark';function add(rel,file,as){if(!file)return;var link=document.createElement('link');link.rel=rel;link.href=base+file;if(as)link.as=as;document.head.appendChild(link)}add('preload',dark?sheets.dark:sheets.light,'style');(routes[route]||routes[${JSON.stringify(defaultRoute)}]||[]).forEach(function(file){add('modulepreload',file)})})();</script>`;
        return html.replace('<!-- startup-preload -->', script);
      },
    },
  };
}
