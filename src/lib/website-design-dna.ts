import {decodeSourceEntities as decode} from './source-text';
/** Observed design evidence only. Asset discovery is not a license or availability check. */
export type SourceImage={url:string;alt:string;role:'logo'|'content'|'background';sourcePage:string;width?:number;height?:number};
export type WebsiteDesignDna={version:1;sourceUrl:string;businessName?:string;images:SourceImage[];logo?:SourceImage;contact:{emails:string[];phones:string[]};typography:{families:string[]};palette:string[];layout:{header:boolean;hero:boolean;sectionCount:number;breakpoints:number[];heroAlignment?:'center'|'left'|'right'};warnings:string[]};

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
 // The original photo often lives in srcset while src contains a transparent placeholder.
 // Treat source markup as URL evidence only; never execute it in a generated page.
 const responsiveUrls=(value:string)=>value.split(',').map(part=>{
  const match=part.trim().match(/^(\S+)(?:\s+(\d+(?:\.\d+)?)[wx])?$/i);
  return match?{url:match[1],resolution:Math.min(20000,Number(match[2]||1))}:null;
 }).filter((item):item is {url:string;resolution:number}=>Boolean(item)).sort((a,b)=>b.resolution-a.resolution).map(item=>item.url);
 // Native <picture><source srcset="..."><img ...></picture> often stores
 // the real business photo in <source> and a low-resolution placeholder in <img>.
 // Link each source group to its actual fallback image tag, never to nearby images.
 const pictureCandidates=new Map<number,string[]>();
 for(const picture of html.matchAll(/<picture\b[^>]*>[\s\S]*?<\/picture\s*>/gi)){
  const block=picture[0],fallback=/<img\b[^>]*>/i.exec(block);
  if(!fallback||picture.index===undefined)continue;
  const group:[number,string[]][]=[];
  for(const source of block.slice(0,fallback.index).matchAll(/<source\b[^>]*>/gi)){
   const tag=source[0],mime=attribute(tag,'type').toLowerCase(),media=attribute(tag,'media');
   if(mime&&!/^image\/(?:avif|webp|jpeg|jpg|png)$/i.test(mime))continue;
   const variants=[...responsiveUrls(attribute(tag,'data-srcset')),...responsiveUrls(attribute(tag,'srcset'))];
   if(!variants.length)continue;
   // A desktop or unqualified source is more representative for the default
   // captured layout than a mobile-only art-directed crop.
   const preference=!media?0:/\bmin-width\b/i.test(media)?1:2;
   group.push([preference,variants]);
  }
  group.sort((a,b)=>a[0]-b[0]);
  pictureCandidates.set(picture.index+fallback.index,group.flatMap(([,urls])=>urls).slice(0,16));
 }
 for(const match of html.matchAll(/<img\b[^>]*>/gi)){
  const tag=match[0],alt=attribute(tag,'alt'),label=[alt,attribute(tag,'class'),attribute(tag,'id')].join(' ');
  const candidates=[...(pictureCandidates.get(match.index??-1)||[]),attribute(tag,'data-src'),attribute(tag,'data-original'),attribute(tag,'data-lazy-src'),...responsiveUrls(attribute(tag,'data-srcset')),...responsiveUrls(attribute(tag,'srcset')),attribute(tag,'src')];
  const src=candidates.find(candidate=>candidate.trim().length>0&&publicSourceAsset(candidate,sourceUrl));
  const size=(name:string)=>{const n=Number(attribute(tag,name));return Number.isInteger(n)&&n>0&&n<=20000?n:undefined};
  if(!src||/pixel|tracking|spacer/i.test(label)||/\/akam\/\d+\/pixel_/i.test(src))continue;
  const filename=src.split(/[?#]/)[0].split('/').pop()||'';
  const isLogo=/\blogo\b|brand[-_ ]?mark/i.test(label)||/(?:^|[-_.])(?:logo|brandmark)(?:[-_.]|$)/i.test(filename);
  add(src,alt,isLogo?'logo':'content',size('width'),size('height'));
 }
 let businessName:string|undefined;
 for(const match of html.matchAll(/<meta\b[^>]*>/gi)){const tag=match[0],name=attribute(tag,'property')||attribute(tag,'name');if(/^(?:og:image|twitter:image)$/i.test(name))add(attribute(tag,'content'),'Source website preview','content');if(!businessName&&/^(?:og:site_name|application-name)$/i.test(name)){const observed=text(attribute(tag,'content'));if(observed.length>=2&&observed.length<=100)businessName=observed}}
 // Some businesses render their official mark through .logo CSS rather than
 // <img>. Discover those logo asset references first so later generic background
 // scans cannot misclassify them. Never copy source selectors or CSS declarations.
 for(const rule of css.matchAll(/([^{}]{1,220})\{([^{}]{0,10000})\}/g)){
  const selector=rule[1];
  if(!/(?:^|[\s.#_-])(?:logo|brand[-_]?mark)(?:$|[\s.#:_>-])/i.test(selector))continue;
  for(const hit of rule[2].matchAll(/background(?:-image)?\s*:[^;}]*?url\(\s*["']?([^\s"')]+)["']?\s*\)/gi))
   add(hit[1],'Source website logo','logo');
 }
 // CSS URLs are read as evidence, never emitted as executable style rules.
 for(const match of css.matchAll(/(?:background(?:-image)?\s*:[^;}]*?)url\(\s*["']?([^\s"')]+)["']?\s*\)/gi))add(match[1],'Source website background','background');
 // Prioritize an observed document background; stylesheet order alone can begin with an icon color.
 const documentRules=[...css.matchAll(/(?:\bbody\b|:root)\s*[^{}]*\{([^}]*)\}/gi)];
 // Safely resolve a direct #hex value or a single declared CSS variable.
 // No CSS functions, imports, custom URLs, or source code are executed.
 const declarations=new Map([...css.matchAll(/(--[a-z][\w-]{1,78})\s*:\s*(#[a-f\d]{6}\b|#[a-f\d]{3}\b)/gi)]
  .map(match=>[match[1].toLowerCase(),match[2].toLowerCase()]));
 const declaredBackground=(rule:string)=>{
  const token=rule.match(/(?:^|;)\s*background(?:-color)?\s*:\s*(#[a-f\d]{6}\b|#[a-f\d]{3}\b|var\(\s*(--[a-z][\w-]*)\s*\))/i);
  if(!token)return;
  if(/^#/.test(token[1]))return token[1];
  const variable=token[2]?.toLowerCase();
  return variable?declarations.get(variable):undefined;
 };
 const bodyBackground=[...css.matchAll(/\bbody\s*\{([^}]*)\}/gi)]
  .map(rule=>declaredBackground(rule[1])).find(Boolean);
 const rootBackground=documentRules.map(rule=>rule[1].match(/(?:background(?:-color)?|--(?:background|bg|surface))\s*:\s*(#[a-f\d]{6}\b|#[a-f\d]{3}\b)/i)?.[1]).find(Boolean);
 const background=bodyBackground||rootBackground;
 const palette=[...new Set([...(background?[background]:[]),...(css.match(/#[a-f\d]{6}\b|#[a-f\d]{3}\b/gi)||[])].map(color=>color.toLowerCase()))].slice(0,12);
 const families=[...css.matchAll(/font-family\s*:\s*([^;}]+)/gi)].map(match=>match[1].replace(/["']/g,'').trim()).filter(value=>value.length<180&&/^[\w ,.-]+$/.test(value));
 const links=[...html.matchAll(/<a\b[^>]*>/gi)].map(match=>attribute(match[0],'href'));
 const emails=[...new Set(links.filter(link=>/^mailto:/i.test(link)).map(link=>link.slice(7).split('?')[0]).filter(value=>/^[\w.!#$%&'*+/=?^`{|}~-]+@[\w.-]+\.[a-z]{2,}$/i.test(value)))].slice(0,8);
 const phones=[...new Set(links.filter(link=>/^tel:/i.test(link)).map(link=>link.slice(4)).filter(value=>/^\+?[\d(). -]{7,30}$/.test(value)))].slice(0,8);
 const breakpoints=[...new Set([...css.matchAll(/(?:min|max)-width\s*:\s*(\d{2,4})px/gi)].map(match=>Number(match[1])))].sort((a,b)=>a-b).slice(0,12);
 const heroTag=html.match(/<(?:section|div|header)\b[^>]*(?:class|id)\s*=\s*["'][^"']*(?:hero|banner|masthead)[^"']*["'][^>]*>/i)?.[0]||'';
 const heroClasses=[attribute(heroTag,'class'),attribute(heroTag,'id')].join(' ');
 const heroAlignment=/\b(?:text-center|align-center|centered|hero-center)\b/i.test(heroClasses)?'center':/\b(?:text-right|align-right|hero-right)\b/i.test(heroClasses)?'right':/\b(?:text-left|align-left|hero-left)\b/i.test(heroClasses)?'left':undefined;
 const warnings=['Discovered source assets require authorization and availability verification before publication.','Observed HTML and CSS do not establish computed layout, browser interactions, or visual fidelity.'];
 if(!images.length)warnings.push('No reusable public HTTPS images were discovered; supply authorized business assets.');
 return {version:1,sourceUrl,...(businessName?{businessName}:{}),images,logo:images.find(image=>image.role==='logo'),contact:{emails,phones},typography:{families:[...new Set(families)].slice(0,8)},palette,layout:{header:/<header\b/i.test(html),hero:/(?:class|id)\s*=\s*["'][^"']*(?:hero|banner|masthead)/i.test(html),sectionCount:(html.match(/<section\b/gi)||[]).length,breakpoints,...(heroAlignment?{heroAlignment}:{})},warnings};
}


/** Merge bounded, same-site image evidence from inspected interior pages.
 * Homepage identity and assets take priority. Page assets remain observed references:
 * the caller must still verify reuse rights and live availability before publication.
 */
export function mergeSourcePageImages(
 homepage:WebsiteDesignDna,
 pages:readonly {path:string;images?:readonly SourceImage[]}[]
):WebsiteDesignDna{
 const root=new URL(homepage.sourceUrl);
 const images=[...homepage.images.slice(0,30)];
 const seen=new Set(images.map(image=>image.url));
 let logo=homepage.logo;
 for(const page of pages.slice(0,4)){
  if(!page.path.startsWith('/')||page.path.startsWith('//'))continue;
  let pageUrl:URL;
  try{pageUrl=new URL(page.path,root)}catch{continue}
  if(pageUrl.origin!==root.origin||!Array.isArray(page.images))continue;
  for(const image of page.images.slice(0,30)){
   if(images.length>=30)break;
   if(!image||!['content','background','logo'].includes(image.role)||typeof image.url!=='string')continue;
   // Never mix in images from a page redirected to another origin.
   try{if(new URL(image.sourcePage).origin!==root.origin)continue}catch{continue}
   const url=publicSourceAsset(image.url,root.href);
   if(!url||seen.has(url))continue;
   const width=Number.isInteger(image.width)&&image.width!>0&&image.width!<=20000?image.width:undefined;
   const height=Number.isInteger(image.height)&&image.height!>0&&image.height!<=20000?image.height:undefined;
   if(width&&height&&width<32&&height<32)continue;
   const safe:SourceImage={url,alt:typeof image.alt==='string'?text(image.alt):'',role:image.role,sourcePage:pageUrl.href,...(width?{width}:{}),...(height?{height}:{})};
   images.push(safe);seen.add(url);
   if(!logo&&safe.role==='logo')logo=safe;
  }
 }
 return {...homepage,images,...(logo?{logo}:{})};
}
