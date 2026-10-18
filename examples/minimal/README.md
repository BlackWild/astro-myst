# astro-myst example: minimal

The smallest useful setup: one collection, one dynamic route, two MyST pages that reference each other. No `myst.yml`.

| File | Purpose |
| --- | --- |
| `astro.config.ts` | Adds the integration: `integrations: [myst()]` |
| `src/content.config.ts` | `mystLoader({ base: './content', route: '/' })` turns every MyST file in `content/` into a collection entry |
| `src/pages/[...slug].astro` | Renders each entry with `render(entry)`; the base styles are added by the integration |

```sh
# from the repository root
npm install
npm run build
npm run dev -w astro-myst-example-minimal
```
