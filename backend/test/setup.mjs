// Registers the `@/` alias resolver for the whole test run. Loaded via
// `node --import ./test/setup.mjs`. Harmless to tests that don't use the alias.
import { register } from 'node:module';
register('./alias-hooks.mjs', import.meta.url);
