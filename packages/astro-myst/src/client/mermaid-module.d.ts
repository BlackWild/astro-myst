// The optional `mermaid` package is not a dependency of astro-myst: sites that enable the script
// install it, and Vite bundles it into the site. This keeps the package's own type check working.
declare module 'mermaid' {
  const mermaid: {
    initialize(config: Record<string, unknown>): void;
    run(options: { nodes: HTMLElement[] }): Promise<void>;
  };
  export default mermaid;
}
