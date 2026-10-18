/**
 * Draws MyST `{mermaid}` diagrams (`pre.mermaid`) with Mermaid.js (`myst({ scripts: { mermaid: true } })`).
 * Needs the `mermaid` package; it is loaded only on pages that contain a diagram.
 */
const isDark = () => {
  const root = document.documentElement;
  if (root.matches('.dark, [data-theme="dark"]')) return true;
  if (root.matches('.light, [data-theme="light"]')) return false;
  return matchMedia('(prefers-color-scheme: dark)').matches;
};

async function draw() {
  const nodes = [...document.querySelectorAll<HTMLElement>('pre.mermaid:not([data-processed])')];
  if (!nodes.length) return;
  const { default: mermaid } = await import('mermaid');
  mermaid.initialize({ startOnLoad: false, theme: isDark() ? 'dark' : 'default' });
  await mermaid.run({ nodes });
}

// One drawing at a time: Mermaid marks diagrams as processed only when it is done with them.
let queue = Promise.resolve();
const drawDiagrams = () => {
  queue = queue.then(draw).catch((error) => console.error('[astro-myst] Mermaid:', error));
};

drawDiagrams();
document.addEventListener('astro:page-load', drawDiagrams); // Astro view transitions

export {};
