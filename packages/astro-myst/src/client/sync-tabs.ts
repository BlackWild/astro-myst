/**
 * Switches tabs that share a `:sync:` key together, across all tab sets of the page, as in MyST's
 * themes (`myst({ scripts: { syncTabs: true } })`, the default).
 */
document.addEventListener('change', (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || !input.checked || !input.dataset.mystSync) return;
  if (!input.parentElement?.classList.contains('myst-tabs')) return;
  for (const other of document.querySelectorAll<HTMLInputElement>('.myst-tabs > input[data-myst-sync]')) {
    if (other !== input && other.dataset.mystSync === input.dataset.mystSync) other.checked = true;
  }
});

export {};
