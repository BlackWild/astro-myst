/**
 * Adds a copy button to every MyST code block (`myst({ scripts: { copyCode: true } })`). The
 * button only exists when this script runs, so pages without JavaScript show no dead buttons.
 */
function addCopyButtons() {
  for (const wrapper of document.querySelectorAll<HTMLElement>('.myst-code-wrapper:not([data-myst-copy])')) {
    const pre = wrapper.querySelector('pre');
    if (!pre) continue;
    wrapper.dataset.mystCopy = '';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'myst-code-copy';
    button.textContent = 'Copy';
    button.setAttribute('aria-label', 'Copy code to clipboard');
    let reset: ReturnType<typeof setTimeout> | undefined;
    button.addEventListener('click', async () => {
      // innerText leaves out the line numbers, which are CSS-generated content.
      const code = (pre.querySelector('code') ?? pre).innerText.replace(/\n$/, '');
      try {
        await navigator.clipboard.writeText(code);
        button.textContent = 'Copied';
      } catch {
        button.textContent = 'Copy failed';
      }
      clearTimeout(reset);
      reset = setTimeout(() => {
        button.textContent = 'Copy';
      }, 1500);
    });
    wrapper.append(button);
  }
}

addCopyButtons();
document.addEventListener('astro:page-load', addCopyButtons); // Astro view transitions

export {};
