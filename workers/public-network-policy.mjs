import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';

/** Conservative DNS preflight; NOT a substitute for outbound network isolation. */
export function isPublicAddress(address){
 const family=isIP(address);
 if(family===4){
  const p=address.split('.').map(Number);const [a,b,c]=p;
  if(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&b===168||a===100&&b>=64&&b<=127||a===192&&b===0&&c===0||a===192&&b===0&&c===2||a===198&&b===51&&c===100||a===203&&b===0&&c===113||a===198&&b>=18&&b<=19||a===192&&b===88&&c===99||a===192&&b===0&&c===2)return false;
  return true;
 }
 if(family===6){
  const value=address.toLowerCase();
  if(value.includes('.'))return false; // reject IPv4-embedded IPv6 conservatively
  const first=parseInt(value.split(':')[0]||'0',16);
  // Only global unicast 2000::/3, excluding documentation 2001:db8::/32.
  return first>=0x2000&&first<=0x3fff&&!value.startsWith('2001:db8:');
 }
 return false;
}
export async function assertPublicDns(hostname){
 const addresses=await lookup(hostname,{all:true,verbatim:true});
 if(!addresses.length||addresses.some(item=>!isPublicAddress(item.address)))throw Error('Target DNS contains non-public addresses');
 return addresses.map(item=>item.address);
}
