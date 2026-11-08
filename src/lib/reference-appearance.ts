export type ReferenceAppearance={background?:string;accent?:string;fontFamily?:string};
function color(value:unknown):string|undefined{if(typeof value!=='string'||!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value))return undefined;return value.length===4?'#'+value.slice(1).split('').map(c=>c+c).join(''):value}
function ink(background:string){const values=background.slice(1).match(/../g)!.map(c=>{const n=parseInt(c,16)/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4});const luminance=values[0]*.2126+values[1]*.7152+values[2]*.0722;return luminance>.179?'#111111':'#f5f5f5'}
/** Apply bounded appearance tokens across all pages; never execute extracted CSS or HTML. */
export function applyReferenceAppearance<T extends {html:string}>(pages:T[],appearance:ReferenceAppearance):T[]{
 const background=color(appearance.background),accent=color(appearance.accent);
 const font=typeof appearance.fontFamily==='string'&&/^(Georgia|Arial|Verdana|Tahoma|Trebuchet MS|Times New Roman|system-ui|sans-serif|serif)$/i.test(appearance.fontFamily)?appearance.fontFamily:undefined;
 if(!background&&!accent&&!font)return pages;
 const foreground=background?ink(background):undefined;
 const css=(background?'body{background:'+background+';color:'+foreground+'}main:before{background:'+background+';opacity:1}p,.card p{color:'+foreground+'}nav,footer,.card{border-color:'+foreground+'44}.service-card{background:'+background+'}':'')+(font?'body{font-family:"'+font+'",sans-serif}':'')+(accent?'.button{background:'+accent+';color:'+ink(accent)+'}':'');
 return pages.map(page=>({...page,html:page.html.replace(/<style id="forge-reference-appearance">[\s\S]*?<\/style>/g,'').replace(/<\/head>/i,'<style id="forge-reference-appearance">'+css+'</style></head>')}));
}
export function websiteAddressKey(value:string):string|null{
 try{const url=new URL(/^https?:\/\//i.test(value.trim())?value.trim():'https://'+value.trim());if(url.protocol!=='https:'||url.username||url.password)return null;url.hash='';return url.href}catch{return null}
}
