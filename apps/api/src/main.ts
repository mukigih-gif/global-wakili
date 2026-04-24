/**
 * Legacy compatibility entrypoint.
 *
 * The canonical API bootstrap is now:
 * - apps/api/src/server.ts
 * - apps/api/src/app.ts
 *
 * Keep this file only so older commands that point to src/main.ts
 * still boot the same production-grade server.
 */

import './server';