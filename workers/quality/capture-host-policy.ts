import {publicSiteUrl} from '../src/lib/server/public-site-fetch';

/** The inspected source URL authorizes only its own public HTTPS hostname by
 * default. An explicit operator allowlist remains restrictive, not additive.
 * This prevents one tenant's source from authorizing an unrelated destination.
 */
export function approvedCaptureHosts(source:string,configured:readonly string[]=[]):string[]{
 const target=publicSiteUrl(source);
 const hosts=configured.length?[...new Set(configured)]:[target.hostname];
 if(hosts.length>12||!hosts.includes(target.hostname))throw Error('Capture source is not authorized');
 if(hosts.some(host=>host!==host.toLowerCase()||!/^[a-z0-9.-]{1,253}$/.test(host)||host.startsWith('.')||host.endsWith('.')))throw Error('Invalid capture host allowlist');
 return hosts;
}
