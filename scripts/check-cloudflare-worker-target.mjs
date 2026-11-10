#!/usr/bin/env node
// Confirm Forge's one canonical deployment target. This prevents an attempt to
// "fix" a mismatched Cloudflare Git integration by renaming the live Worker.
import {readFileSync} from 'node:fs';

const wrangler=JSON.parse(readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const intended='forge-studio-preview';
const errors=[];
if(wrangler.name!==intended)errors.push('Wrangler name must remain '+intended+' to preserve the live preview deployment.');
if(wrangler.main!=='.open-next/worker.js')errors.push('Wrangler entry must match OpenNext Worker output.');
if(wrangler.assets?.directory!=='.open-next/assets')errors.push('Wrangler assets must match OpenNext output.');
if(pkg.scripts?.['build:cloudflare']!=='opennextjs-cloudflare build')errors.push('Use OpenNext for the Cloudflare build.');
if(pkg.scripts?.['deploy:cloudflare']!=='opennextjs-cloudflare deploy')errors.push('Use OpenNext for the Cloudflare deployment.');
if(errors.length){for(const error of errors)console.error('ERROR: '+error);process.exit(1)}
console.log('PASS: Canonical Worker target '+intended+' and OpenNext build/deploy commands are intact.');
console.log('NOTE: Any Cloudflare dashboard Git integration must target this same Worker. A mismatched service named forge-studio will fail. See docs/CLOUDFLARE_BUILD_RECOVERY.md.');
