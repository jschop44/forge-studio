/** Observed design evidence only. Asset discovery is not a license or availability check. */
export type SourceImage={url:string;alt:string;role:'logo'|'content'|'background';sourcePage:string;width?:number;height?:number};
export type WebsiteDesignDna={version:1;sourceUrl:string;images:SourceImage[];logo?:SourceImage;contact:{emails:string[];phones:string[]};typography:{families:string[]};palette:string[];layout:{header:boolean;hero:boolean;sectionCount:number;breakpoints:number[]};warnings:string[]};
function decode(value:string){return value.replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&#(\d+);/g,(_,number)=>String.fromCharCode(Number(number))).replace(/&#x([a-f\d]+);/gi,(_,number)=>String.fromCharCode(parseInt(number,16)))}
function text(value:string){return decode(value.replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim().slice(0,350)}
function attribute(tag:string,name:string){return decode(tag.match(new RegExp('(?:^|\\s)'+name+'\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))','i'))?.slice(1).find(value=>value!==undefined)||'')}
/** Exclude credentialed, local, literal-IP and non-HTTPS destinations before exposing assets. */
export function publicSourceAsset(value:string,base:string):string|undefined{
 try{const url=new URL(decode(value),base);const host=url.hostname.toLowerCase();if(url.protocol!=='https:'||url.username||url.password||url.port&&url.port!=='443'||!host.includes('.')||host.endsWith('.local')||host.endsWith('.localhost')||host==='localhost'||host==='metadata.google.internal'||host.endsWith('.internal')||/^\d+(?:\.\d+){3}$/.test(host)||host.includes(':')||url.href.length>2000)return;url.hash='';return url.href}catch{return}
}
export function extractWebsiteDesignDna(input:string,sourceUrl:string,stylesheets:string[]=[]):WebsiteDesignDna{
 const html=input.slice(0,2_000_000).replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,'');
 const css=[...(html.match(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi)||[]),...stylesheets.slice(0,5).map(sheet=>sheet.slice(0,100_000))].join('\n').slice(0,500_000);
 const images:SourceImage[]=[],seen=new Set<string>();
 const add=(value:string,alt:string,role:SourceImage['role'],width?:number,height?:number)=>{const url=publicSourceAsset(value,sourceUrl);if(!url||seen.has(url)||images.length>=30||width&&height&&width<32&&height<32)return;seen.add(url);images.push({url,alt:text(alt),role,sourcePage:sourceUrl,...(width?{width}:{}),...(height?{height}:{})})};
 for(const match of html.matchAll(/<img\b[^>]*>/gi)){
  const tag=match[0],alt=attribute(tag,'alt'),label=[alt,attribute(tag,'class'),attribute(tag,'id')].join(' '),src=attribute(tag,'data-src')||attribute(tag,'src')||attribute(tag,'srcset').split(',')[0]?.trim().split(/\s+/)[0]||'';
  const size=(name:string)=>{const n=Number(attribute(tag,name));return Number.isInteger(n)&&n>0&&n<=20000?n:undefined};
  if(!/pixel|tracking|spacer/i.test(label))add(src,alt,/\blogo\b|brand[-_ ]?mark/i.test(label)?'logo':'content',size('width'),size('height'));
 }
 for(const match of html.matchAll(/<meta\b[^>]*>/gi)){const tag=match[0];if(/^(?:og:image|twitter:image)$/i.test(attribute(tag,'property')||attribute(tag,'name')))add(attribute(tag,'content'),'Source website preview','content')}
 // CSS URLs are read as evidence, never emitted as executable style rules.
 for(const match of css.matchAll(/(?:background(?:-image)?\s*:[^;}]*?)url\(\s*["']?([^\s"')]+)["']?\s*\)/gi))add(match[1],'Source website background','background');
 // Prioritize an observed document background; stylesheet order alone can begin with an icon color.
 const documentRules=[...css.matchAll(/(?:\bbody\b|:root)\s*[^{}]*\{([^}]*)\}/gi)];
 const background=documentRules.map(rule=>rule[1].match(/(?:background(?:-color)?|--(?:background|bg|surface))\s*:\s*(#[a-f\d]{6}\b|#[a-f\d]{3}\b)/i)?.[1]).find(Boolean);
 const palette=[...new Set([...(background?[background]:[]),...(css.match(/#[a-f\d]{6}\b|#[a-f\d]{3}\b/gi)||[])].map(color=>color.toLowerCase()))].slice(0,12);
 const families=[...css.matchAll(/font-family\s*:\s*([^;}]+)/gi)].map(match=>match[1].replace(/["']/g,'').trim()).filter(value=>value.length<180&&/^[\w ,.-]+$/.test(value));
 const links=[...html.matchAll(/<a\b[^>]*>/gi)].map(match=>attribute(match[0],'href'));
 const emails=[...new Set(links.filter(link=>/^mailto:/i.test(link)).map(link=>link.slice(7).split('?')[0]).filter(value=>/^[\w.!#$%&'*+/=?^`{|}~-]+@[\w.-]+\.[a-z]{2,}$/i.test(value)))].slice(0,8);
 const phones=[...new Set(links.filter(link=>/^tel:/i.test(link)).map(link=>link.slice(4)).filter(value=>/^\+?[\d(). -]{7,30}$/.test(value)))].slice(0,8);
 const breakpoints=[...new Set([...css.matchAll(/(?:min|max)-width\s*:\s*(\d{2,4})px/gi)].map(match=>Number(match[1])))].sort((a,b)=>a-b).slice(0,12);
 const warnings=['Discovered source assets require authorization and availability verification before publication.','Observed HTML and CSS do not establish computed layout, browser interactions, or visual fidelity.'];
 if(!images.length)warnings.push('No reusable public HTTPS images were discovered; supply authorized business assets.');
 return {version:1,sourceUrl,images,logo:images.find(image=>image.role==='logo'),contact:{emails,phones},typography:{families:[...new Set(families)].slice(0,8)},palette,layout:{header:/<header\b/i.test(html),hero:/(?:class|id)\s*=\s*["'][^"']*(?:hero|banner|masthead)/i.test(html),sectionCount:(html.match(/<section\b/gi)||[]).length,breakpoints},warnings};
}
