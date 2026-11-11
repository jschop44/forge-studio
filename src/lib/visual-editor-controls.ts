import {publicSourceAsset} from './website-design-dna';
export const EDITOR_FONTS=['system-ui','Arial','Georgia','Verdana','Times New Roman'] as const;
export function editorDestination(input:string):string{
 const value=input.trim();
 if(!value||value.length>2000||/[\u0000-\u0020<>"'`\\]/.test(value)||/^\/\//.test(value)||/&(?:#|[a-z]+;)/i.test(value))throw Error('Use a page filename, #section, HTTPS address, email or telephone link.');
 const url=new URL(value,'https://editor.invalid/');
 if(!['https:','http:','mailto:','tel:'].includes(url.protocol)||url.username||url.password)throw Error('This destination is not supported.');
 return value;
}
export function editorImage(input:string):string{
 const value=input.trim();
 if(!/^https:\/\//i.test(value)||/&(?:#|[a-z]+;)/i.test(value))throw Error('Use a public HTTPS image URL.');
 const url=publicSourceAsset(value,'https://editor.invalid/');
 if(!url)throw Error('Use a public HTTPS image URL.');
 return url;
}
export function editorStylePatch(input:Record<string,string>):Record<string,string>{
 const output:Record<string,string>={};
 for(const [key,raw] of Object.entries(input)){
  const value=raw.trim();if(!value)continue;
  if(['color','background-color'].includes(key)){
   if(!/^#[a-f\d]{6}$/i.test(value))throw Error('Choose a six-digit color.');output[key]=value;
  }else if(key==='font-family'){
   if(!(EDITOR_FONTS as readonly string[]).includes(value))throw Error('Choose an available font.');output[key]=value.includes(' ')?'"'+value+'"':value;
  }else if(key==='display'){
   if(!['block','flex','grid'].includes(value))throw Error('Choose a supported layout.');output[key]=value;
  }else if(key==='grid-template-columns'){
   if(!/^[1-6]$/.test(value))throw Error('Choose one to six columns.');output[key]='repeat('+value+', minmax(0, 1fr))';
  }else if(['font-size','padding','margin','gap','border-radius'].includes(key)){
   const number=Number(value);if(!/^\d{1,3}(?:\.\d{1,2})?$/.test(value)||number>200||key==='font-size'&&number<1)throw Error('Use a size between '+(key==='font-size'?'1':'0')+' and 200 pixels.');output[key]=number+'px';
  }else throw Error('Unsupported style control.');
 }
 return output;
}
