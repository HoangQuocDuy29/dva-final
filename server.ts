/**
 * Modular server entrypoint forwarding shim (kept for backwards compatibility with scripts invoking server.ts).
 * All modular domain logic now resides under `./server/`.
 */
export { app } from './server/index';
