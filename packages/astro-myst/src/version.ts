import { createRequire } from 'node:module';

/** Version of this package (read from package.json, works from both src/ and dist/). */
export const VERSION: string = createRequire(import.meta.url)('../package.json').version;
