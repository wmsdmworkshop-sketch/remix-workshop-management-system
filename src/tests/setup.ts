import { verifyTestIsolation } from './destructive_test_guard.ts';

// Central Vitest setup hook. Vitest `setupFiles` execute this module's top-level
// code before each test file — they do NOT call an exported `setup()` (that is
// `globalSetup` semantics). The previous version only exported `setup()`, so the
// isolation guard never actually ran — the P0 hole. We now enforce it at module
// load (top-level await), so every test file fails closed unless it is provably
// connected to the isolated 'wms_test' database.
await verifyTestIsolation();
