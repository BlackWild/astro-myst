/**
 * State shared by the integration and the loaders. Astro evaluates astro.config and
 * src/content.config.ts in separate module graphs, so this package can be instantiated twice in
 * one process: the state lives on globalThis under a registered symbol.
 */
import type { MystOptions } from './integration.js';

export interface MystState {
  /** Options passed to the integration in astro.config. */
  options: MystOptions;
  /** Folder with the assets of each MyST collection's last successful build, by collection name. */
  assets: Map<string, string>;
}

const KEY = Symbol.for('astro-myst.state');
const store = globalThis as typeof globalThis & { [KEY]?: MystState };

export function initState(options: MystOptions): MystState {
  store[KEY] = { options, assets: new Map() };
  return store[KEY];
}

export function getState(): MystState | undefined {
  return store[KEY];
}
