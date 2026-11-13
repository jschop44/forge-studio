/** Bounded, inert computed CSS evidence from an authorized browser capture.
 * Never pass through source stylesheets or arbitrary CSS declarations.
 */
export type CapturedDesignTokens={
 backgroundColor:string;
 textColor:string;
 fontFamily:string;
 headingFontFamily:string;
 headingFontSize:string;
 baseFontSize:string;
 /** Optional browser-computed body line height, bounded and inert. */
 lineHeight?:string;
 /** Optional browser-computed primary heading line height. */
 headingLineHeight?:string;
 /** Authorized capture-derived, bounded layout and visual rhythm hints. */
 heroTextAlign?:'left'|'center'|'right';
 heroLayout?:'stacked'|'split';
 contentMaxWidth?:string;
 buttonRadius?:string;
 buttonBackgroundColor?:string;
 buttonTextColor?:string;
 headerBackgroundColor?:string;
};
const computedColor=(value:unknown):value is string=>typeof value==='string'&&value.length<=90&&/^(?:#[0-9a-f]{3,8}|rgba?\([0-9.,%\s/]+\))$/i.test(value);
const computedFont=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&value.length<=180&&/^[a-z0-9\s,'"._-]+$/i.test(value);
const computedSize=(value:unknown):value is string=>{
 if(typeof value!=='string'||!/^\d{1,3}(?:\.\d{1,3})?px$/.test(value))return false;
 const number=Number(value.slice(0,-2));
 return number>=8&&number<=128;
};
const boundedPixels=(value:unknown,min:number,max:number)=>typeof value==='string'&&/^\d{1,4}(?:\.\d{1,2})?px$/.test(value)&&Number(value.slice(0,-2))>=min&&Number(value.slice(0,-2))<=max;
export function validCapturedDesignTokens(value:unknown):value is CapturedDesignTokens{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const tokens=value as Partial<CapturedDesignTokens>;
 return computedColor(tokens.backgroundColor)&&computedColor(tokens.textColor)
  &&computedFont(tokens.fontFamily)&&computedFont(tokens.headingFontFamily)
  &&computedSize(tokens.headingFontSize)&&computedSize(tokens.baseFontSize)
  &&(tokens.lineHeight===undefined||typeof tokens.lineHeight==='string'&&/^\d{1,3}(?:\.\d{1,3})?px$/.test(tokens.lineHeight)&&Number(tokens.lineHeight.slice(0,-2))>=12&&Number(tokens.lineHeight.slice(0,-2))<=72)
  &&(tokens.headingLineHeight===undefined||typeof tokens.headingLineHeight==='string'&&/^\d{1,3}(?:\.\d{1,3})?px$/.test(tokens.headingLineHeight)&&Number(tokens.headingLineHeight.slice(0,-2))>=20&&Number(tokens.headingLineHeight.slice(0,-2))<=150)
  &&(tokens.heroTextAlign===undefined||['left','center','right'].includes(tokens.heroTextAlign))
  &&(tokens.heroLayout===undefined||['stacked','split'].includes(tokens.heroLayout))
  &&(tokens.contentMaxWidth===undefined||boundedPixels(tokens.contentMaxWidth,320,1800))
  &&(tokens.buttonRadius===undefined||boundedPixels(tokens.buttonRadius,0,64))
  &&(tokens.buttonBackgroundColor===undefined||computedColor(tokens.buttonBackgroundColor))
  &&(tokens.buttonTextColor===undefined||computedColor(tokens.buttonTextColor))
  &&(tokens.headerBackgroundColor===undefined||computedColor(tokens.headerBackgroundColor));
}
/** Input must be validated before interpolation. No URLs, selectors, or source CSS permitted. */
export function capturedTokensPreviewStyle(tokens:CapturedDesignTokens):string{
 if(!validCapturedDesignTokens(tokens))throw Error('Invalid computed design tokens');
 return 'body{background:'+tokens.backgroundColor+';color:'+tokens.textColor+';font-family:'+tokens.fontFamily+';font-size:'+tokens.baseFontSize+(tokens.lineHeight?';line-height:'+tokens.lineHeight:'')+'}'+
  '.region{background:'+tokens.backgroundColor+';color:'+tokens.textColor+'}.region p{color:'+tokens.textColor+'}'+
  'h1,h2,h3{font-family:'+tokens.headingFontFamily+'}h1{font-size:'+tokens.headingFontSize+(tokens.headingLineHeight?';line-height:'+tokens.headingLineHeight:'')+'}'+
  (tokens.contentMaxWidth?'main{max-width:100%;width:'+tokens.contentMaxWidth+';margin-inline:auto}':'')+
  (tokens.heroTextAlign?'h1{text-align:'+tokens.heroTextAlign+'}':'')+
  (tokens.buttonRadius?'.region a[role="button"]{border-radius:'+tokens.buttonRadius+'}':'');
}
