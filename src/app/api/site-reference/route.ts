import {NextRequest,NextResponse} from 'next/server';
import {sameOrigin} from '../../../lib/server/request-security';
import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
import {request as httpsRequest} from 'node:https';
export const runtime='nodejs';
const blocked=(ip:string)=>{if(isIP(ip)===4){const n=ip.split('.').map(Number);return n[0]===0||n[0]===10||n[0]===127||n[0]>=224||n[0]===169&&n[1]===254||n[0]===172&&n[1]>=16&&n[1]<=31||n[0]===192&&n[1]===168||n[0]===100&&n[1]>=64&&n[1]<=127||n[0]===192&&n[1]===0||n[0]===198&&n[1]>=18&&n[1]<=19}if(isIP(ip)===6){const s=ip.toLowerCase();return s==='::1'||s==='::'||s.startsWith('fe80:')||s.startsWith('fc')||s.startsWith('fd')||s.startsWith('::ffff:')}return true};
function clean(value:string){return value.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim().slice(0,400)}
function meta(html:string,key:string){const tags=html.match(/<meta\b[^>]*>/gi)||[];for(const tag of tags){const property=tag.match(/(?:name|property)\s*=\s*["']([^"']+)["']/i)?.[1];if(property?.toLowerCase()===key.toLowerCase())return clean(tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1]||'')}return ''}
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return NextResponse.json({error:'Origin rejected'},{status:403});
 try{
 const raw=await req.text();if(raw.length>2048)return NextResponse.json({error:'Address too long'},{status:413});
 const value=JSON.parse(raw).url;if(typeof value!=='string'||value.length>500)return NextResponse.json({error:'Invalid website address'},{status:400});
 let url=new URL(/^https?:\/\//i.test(value)?value:'https://'+value);
 if(url.protocol!=='https:'||url.username||url.password||url.port&&url.port!=='443'||!url.hostname.includes('.')||isIP(url.hostname)||url.hostname.endsWith('.local'))return NextResponse.json({error:'Enter a public HTTPS website address'},{status:400});
 let addresses=await lookup(url.hostname,{all:true,verbatim:true});if(!addresses.length||addresses.some(a=>blocked(a.address)))return NextResponse.json({error:'Website address is not public'},{status:400});
 let html='';for(let redirects=0;redirects<4;redirects++){try{html=await new Promise<string>((resolve,reject)=>{
 const pinned=addresses.find(a=>a.family===4)||addresses[0];
 const request=httpsRequest(url,{method:'GET',timeout:8000,headers:{'User-Agent':'ForgeStudioSiteResearch/1.0','Accept':'text/html','Accept-Encoding':'identity'},lookup:(_hostname,_options,callback)=>callback(null,pinned.address,pinned.family)},response=>{
 if(response.statusCode&&response.statusCode>=300&&response.statusCode<400){const location=response.headers.location;response.resume();reject(new Error(location?'REDIRECT:'+location:'Website redirects without a destination'));return}
 if(response.statusCode!==200){response.resume();reject(new Error('Website returned status '+response.statusCode));return}
 if(!(response.headers['content-type']||'').includes('text/html')){response.resume();reject(new Error('Website did not return HTML'));return}
 let size=0;const parts:Buffer[]=[];response.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>450000){request.destroy(new Error('Homepage is too large'));return}parts.push(chunk)});response.on('end',()=>resolve(Buffer.concat(parts).toString('utf8')));response.on('error',reject);
 });request.on('timeout',()=>request.destroy(new Error('Website timed out')));request.on('error',reject);request.end();
 });break;}catch(error){const message=error instanceof Error?error.message:'';if(!message.startsWith('REDIRECT:')||redirects===3)throw error;const next=new URL(message.slice(9),url);if(next.protocol!=='https:'||next.username||next.password||next.port&&next.port!=='443'||!next.hostname.includes('.')||isIP(next.hostname)||next.hostname.endsWith('.local'))throw Error('Unsafe redirect destination');const nextAddresses=await lookup(next.hostname,{all:true,verbatim:true});if(!nextAddresses.length||nextAddresses.some(a=>blocked(a.address)))throw Error('Redirect destination is not public');url=next;addresses=nextAddresses;}}
 const stylesheetUrls=[...html.matchAll(/<link\b[^>]*>/gi)].map(match=>match[0]).filter(tag=>/rel\s*=\s*["']?stylesheet/i.test(tag)).map(tag=>tag.match(/href\s*=\s*["']([^"']+)["']/i)?.[1]).filter((href):href is string=>Boolean(href)).slice(0,3);
 const externalCss:string[]=[];
 for(const href of stylesheetUrls){
 try{
 const cssUrl=new URL(href,url);if(cssUrl.protocol!=='https:'||cssUrl.hostname!==url.hostname||cssUrl.port&&cssUrl.port!=='443')continue;
 const stylesheet=await new Promise<string>((resolve,reject)=>{
 const request=httpsRequest(cssUrl,{method:'GET',timeout:3500,headers:{'User-Agent':'ForgeStudioSiteResearch/1.0','Accept':'text/css','Accept-Encoding':'identity'},lookup:(_host,_options,callback)=>callback(null,addresses.find(a=>a.family===4)?.address||addresses[0].address,addresses.find(a=>a.family===4)?.family||addresses[0].family)},response=>{
 if(response.statusCode!==200){response.resume();reject(new Error('Stylesheet unavailable'));return}
 let size=0;const chunks:Buffer[]=[];response.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>100000){request.destroy(new Error('Stylesheet too large'));return}chunks.push(chunk)});response.on('end',()=>resolve(Buffer.concat(chunks).toString('utf8')));response.on('error',reject);
 });request.on('timeout',()=>request.destroy());request.on('error',reject);request.end();
 });externalCss.push(stylesheet);
 }catch{continue}
 }
 const title=clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'');
 const description=meta(html,'description')||meta(html,'og:description');
 const css=(html.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi)||[]).join(' ').slice(0,70000);
 const styles=css+' '+externalCss.join(' ')+' '+(html.match(/<body[^>]*style=["'][^"']+["']/i)?.[0]||'');
 const background=styles.match(/(?:--(?:background|bg|surface|brand-bg)|background(?:-color)?)\s*:\s*(#[a-f0-9]{3,8})/i)?.[1];
 const accent=styles.match(/(?:--(?:primary|accent|brand|brand-accent)|color)\s*:\s*(#[a-f0-9]{3,8})/i)?.[1];
 const fontFamily=styles.match(/font-family\s*:\s*['"]?(Georgia|Arial|Verdana|Tahoma|Trebuchet MS|Times New Roman|system-ui|sans-serif|serif)/i)?.[1];
 const visualSignals={navigationLinks:(html.match(/<nav\b/gi)||[]).length,heroSections:(html.match(/(?:class|id)\s*=\s*["'][^"']*(?:hero|banner|masthead)[^"']*["']/gi)||[]).length,imageCount:(html.match(/<img\b/gi)||[]).length,sectionCount:(html.match(/<section\b/gi)||[]).length,buttonCount:(html.match(/<button\b/gi)||[]).length,hasVideo:/<video\b/i.test(html),hasCanvas:/<canvas\b/i.test(html)};

 const headings=[...html.matchAll(/<h[12]\b[^>]*>([\s\S]*?)<\/h[12]>/gi)].slice(0,7).map(m=>clean(m[1])).filter(Boolean);
 return NextResponse.json({url:url.origin,title,description,headings,styleReference:{background,accent,fontFamily},styleFound:Boolean(background||accent||fontFamily),stylesheetsRead:externalCss.length,visualSignals,notice:'Public homepage metadata, embedded CSS and a limited number of same-host stylesheets. Scripts and imagery were not copied.'},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to inspect website'},{status:422})}
}
