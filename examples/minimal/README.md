# astro-myst example: minimal

The smallest useful setup: one collection, one dynamic route, two MyST pages that reference each other.

| File | Purpose |
| --- | --- |
| `content/myst.yml` | The MyST project (needs a `site:` section) |
| `src/content.config.ts` | `mystLoader({ root: './content' })` turns every MyST page into a collection entry |
| `src/pages/[...slug].astro` | Renders each entry with `render(entry)` and the default styles |

```sh
npm install
npm run dev
```
