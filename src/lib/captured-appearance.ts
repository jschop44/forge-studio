import {validateBrowserEvidence} from './browser-evidence';
type HtmlPage={html:string;slug?:string};
function safeColor(value:unknown):string|undefined{
 if(typeof value!=='string')return;
 const raw=value.trim();
 const hex=raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
 if(hex)return '#'+(hex[1].length===3?hex[1].split('').map(c=>c+c).join(''):hex[1]).toLowerCase();
 const rgb=raw.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0(?:\.\d+)?|1(?:\.0+)?)\s*)?\)$/i);
 if(!rgb||rgb[4]!==undefined&&Number(rgb[4])<1)return;
 const n=rgb.slice(1,4).map(Number);
 if(n.some(v=>v>255))return;
 return '#'+n.map(v=>v.toString(16).padStart(2,'0')).join('');
}
function luminance(color:string){
 const n=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 return n[0]*.2126+n[1]*.7152+n[2]*.0722;
}
function readableInk(background:string,foreground?:string){
 const bg=luminance(background);
 if(foreground){const fg=luminance(foreground);if((Math.max(bg,fg)+.05)/(Math.min(bg,fg)+.05)>=4.5)return foreground}
 return (bg+.05)/.05>=4.5?'#000000':'#ffffff';
}
function family(value:unknown):string|undefined{
 if(typeof value!=='string'||value.length>220)return;
 const parts=value.split(',');
 if(parts.length>8)return;
 const safe=parts.map(value=>{
  const raw=value.trim();
  const quoted=raw.startsWith('"')||raw.startsWith("'");
  if(quoted&&(raw.length<2||raw.at(-1)!==raw[0]))return;
  const part=quoted?raw.slice(1,-1):raw;
  if(!/^[a-z][a-z0-9 .-]{0,49}$/i.test(part))return;
  return /^(?:serif|sans-serif|monospace|system-ui|cursive|fantasy|ui-serif|ui-sans-serif|ui-monospace|ui-rounded)$/i.test(part)?part.toLowerCase():'"'+part+'"';
 });
 return safe.every(Boolean)?safe.join(','):undefined;
}
function pixels(value:unknown,min:number,max:number):number|undefined{
 if(typeof value!=='string'||! /^\d{1,3}(?:\.\d{1,2})?px$/.test(value))return;
 const number=Number(value.slice(0,-2));
 return number>=min&&number<=max?number:undefined;
}
function appearanceRules(tokens:unknown):string{
 if(!tokens||typeof tokens!=='object')return '';
 const t=tokens as Record<string,unknown>;
 const background=safeColor(t.backgroundColor);
 const ink=background?readableInk(background,safeColor(t.textColor)):undefined;
 const bodyFont=family(t.fontFamily),headingFont=family(t.headingFontFamily);
 const bodySize=pixels(t.baseFontSize,12,24),headingSize=pixels(t.headingFontSize,24,96),lineHeight=pixels(t.lineHeight,12,72),headingLineHeight=pixels(t.headingLineHeight,20,150);
 const contentWidth=pixels(t.contentMaxWidth,320,1800);
 const radius=pixels(t.buttonRadius,0,64);
 const heroAlignment=['left','center','right'].includes(String(t.heroTextAlign))?String(t.heroTextAlign):'';
 const heroLayout=['stacked','split'].includes(String(t.heroLayout))?String(t.heroLayout):'';
 const navBg=safeColor(t.headerBackgroundColor);
 const buttonBg=safeColor(t.buttonBackgroundColor);
 const buttonInk=buttonBg?readableInk(buttonBg,safeColor(t.buttonTextColor)):undefined;
 return [
  background?':root{--business-paper:'+background+';--business-ink:'+ink+'}body{background:'+background+';color:'+ink+'}main:before{background:'+background+'}p,main p,.card p,body>nav,body>footer{color:'+ink+'}':'',
  bodyFont?'body{font-family:'+bodyFont+'}':'',
  bodySize?'body{font-size:'+bodySize+'px}':'',
  lineHeight?'body{line-height:'+lineHeight+'px}':'',
  headingFont?'h1,h2,h3{font-family:'+headingFont+'}':'',
  headingSize?'h1{font-size:clamp(2rem,6vw,'+headingSize+'px)}':'',
  headingLineHeight?'h1{line-height:'+headingLineHeight+'px}':'',
  contentWidth?'body main{max-width:'+contentWidth+'px;width:100%;margin-inline:auto}':'',
  navBg?'body>nav{background:'+navBg+';color:'+readableInk(navBg)+'}body>nav a{color:inherit}':'',
  buttonBg?'body .button{background:'+buttonBg+';color:'+buttonInk+'}':'',
  radius!==undefined?'body .button{border-radius:'+radius+'px}':'',
  heroAlignment?'body main .site-hero>div{text-align:'+heroAlignment+'}':'',
  heroLayout==='stacked'?'body main .site-hero:not(.text-led){grid-template-columns:minmax(0,1fr);min-height:0}':'',
  heroLayout==='split'?'@media(min-width:701px){body main .site-hero:not(.text-led){grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}':''
 ].join('');
}
/** CSS-only, strictly bounded computed style reuse. Source CSS and scripts are never executed. */
export function applyCapturedAppearance<T extends HtmlPage>(
 pages:T[],capture:unknown,expectedSource:string,mode:string,pageSources:Record<string,string>={}
):{pages:T[];warnings:string[]}{
 if((mode!=='inspired'&&mode!=='preserve')||!capture)return {pages,warnings:[]};
 if(!validateBrowserEvidence(capture))return {pages,warnings:['Unverified browser appearance evidence was ignored.']};
 let original:URL,observed:URL;
 try{original=new URL(expectedSource);observed=new URL(capture.sourceUrl)}catch{return {pages,warnings:['Browser appearance evidence did not match the inspected source.']}}
 if(original.protocol!=='https:'||original.origin!==observed.origin)return {pages,warnings:['Browser appearance evidence did not match the inspected source.']};
 // An unrelated captured page must never be substituted for the inspected source page.
 const expectedPath=original.pathname+original.search;
 const selected=capture.pages.find(page=>page.path===expectedPath);
 if(!selected)return {pages,warnings:['Browser appearance evidence did not include the inspected source page.']};
 const rules=appearanceRules(selected.designTokens);
 const warnings=['Applied bounded browser-observed colors, typography and available layout details. Exact CSS, responsive fidelity, downloaded fonts and source-site behavior remain unverified.'];
 let applied=0;
 const styled=pages.map(page=>{
  let pageRules=rules;
  const source=page.slug&&Object.hasOwn(pageSources,page.slug)?pageSources[page.slug]:undefined;
  if(source){
   let matched=false;
   try{
    const url=new URL(source);
    if(url.origin===original.origin&&!url.username&&!url.password){
     const captured=capture.pages.find(item=>item.path===url.pathname+url.search);
     const specific=appearanceRules(captured?.designTokens);
     if(specific){pageRules=specific;matched=true}
    }
   }catch{}
   const missing=rules?'Some source pages lacked matching captured styles; shared source branding was used.':'Some source pages lacked matching captured styles; no captured style was applied to those pages.';
   if(!matched&&!warnings.includes(missing))warnings.push(missing);
  }
  if(!pageRules)return page;
  applied++;
  return {...page,html:page.html.replace(/<style id="forge-captured-appearance">[\s\S]*?<\/style>/g,'').replace(/<\/head>/i,'<style id="forge-captured-appearance">'+pageRules+'</style></head>')};
 });
 return applied?{pages:styled,warnings}:{pages,warnings:['No safely reusable computed colors or typography were found in the browser evidence.']};
}
