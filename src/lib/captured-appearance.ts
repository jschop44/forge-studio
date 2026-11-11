import {validateBrowserEvidence} from './browser-evidence';
type HtmlPage={html:string};
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
 const part=value.split(',')[0].trim().replace(/^["']|["']$/g,'');
 if(!/^[a-z][a-z0-9 .-]{0,49}$/i.test(part))return;
 return /^(?:serif|sans-serif|monospace|system-ui)$/i.test(part)?part:'"'+part+'"';
}
function pixels(value:unknown,min:number,max:number):number|undefined{
 if(typeof value!=='string'||! /^\d{1,3}(?:\.\d{1,2})?px$/.test(value))return;
 const number=Number(value.slice(0,-2));
 return number>=min&&number<=max?number:undefined;
}
/** CSS-only, strictly bounded computed style reuse. Source CSS and scripts are never executed. */
export function applyCapturedAppearance<T extends HtmlPage>(
 pages:T[],capture:unknown,expectedSource:string,mode:string
):{pages:T[];warnings:string[]}{
 if((mode!=='inspired'&&mode!=='preserve')||!capture)return {pages,warnings:[]};
 if(!validateBrowserEvidence(capture))return {pages,warnings:['Unverified browser appearance evidence was ignored.']};
 let original:URL,observed:URL;
 try{original=new URL(expectedSource);observed=new URL(capture.sourceUrl)}catch{return {pages,warnings:['Browser appearance evidence did not match the inspected source.']}}
 if(original.protocol!=='https:'||original.origin!==observed.origin)return {pages,warnings:['Browser appearance evidence did not match the inspected source.']};
 const selected=capture.pages.find(page=>page.path===original.pathname)||capture.pages[0];
 const tokens=(selected as typeof selected&{designTokens?:unknown})?.designTokens;
 if(!tokens||typeof tokens!=='object')return {pages,warnings:[]};
 const t=tokens as Record<string,unknown>;
 const background=safeColor(t.backgroundColor);
 const ink=background?readableInk(background,safeColor(t.textColor)):undefined;
 const bodyFont=family(t.fontFamily),headingFont=family(t.headingFontFamily);
 const bodySize=pixels(t.baseFontSize,12,24),headingSize=pixels(t.headingFontSize,24,96);
 const rules=[
  background?':root{--business-paper:'+background+';--business-ink:'+ink+'}body{background:'+background+';color:'+ink+'}main:before{background:'+background+'}p,main p,.card p,body>nav,body>footer{color:'+ink+'}':'',
  bodyFont?'body{font-family:'+bodyFont+',sans-serif}':'',
  bodySize?'body{font-size:'+bodySize+'px}':'',
  headingFont?'h1,h2,h3{font-family:'+headingFont+',sans-serif}':'',
  headingSize?'h1{font-size:clamp(2rem,6vw,'+headingSize+'px)}':''
 ].join('');
 if(!rules)return {pages,warnings:['No safely reusable computed colors or typography were found in the browser evidence.']};
 return {pages:pages.map(page=>({...page,html:page.html.replace(/<style id="forge-captured-appearance">[\s\S]*?<\/style>/g,'').replace(/<\/head>/i,'<style id="forge-captured-appearance">'+rules+'</style></head>')})),warnings:['Applied bounded browser-observed colors and typography. Downloaded fonts, responsive layout fidelity and source-site behavior remain unverified.']};
}
