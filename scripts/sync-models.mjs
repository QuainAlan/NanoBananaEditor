// Keeps the edge function's copy of the model catalog identical to the client's.
import { copyFileSync, readFileSync } from 'node:fs';
const src = 'src/lib/models.ts';
const dst = 'supabase/functions/nano-image/models.ts';
copyFileSync(src, dst);
console.log(`synced ${src} -> ${dst} (${readFileSync(dst, 'utf8').length} bytes)`);
