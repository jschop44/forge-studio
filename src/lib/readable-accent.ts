function luminance(hex:string):number|null{
 const match=hex.match(/^#([a-f0-9]{3}|[a-f0-9]{6})$/i);if(!match)return null;
 const value=match[1].length===3?[...match[1]].map(c=>c+c).join(''):match[1];
 const channels=[0,2,4].map(i=>parseInt(value.slice(i,i+2),16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);
 return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
}
export function colorContrast(a:string,b:string):number{const x=luminance(a),y=luminance(b);return x===null||y===null?0:(Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
/** Decorative accents may stay pale; small text must meet WCAG AA contrast. */
export function readableAccent(accent:string,background:string,ink:string):string{
 if(colorContrast(accent,background)>=4.5)return accent;
 if(colorContrast(ink,background)>=4.5)return ink;
 return colorContrast('#000000',background)>=colorContrast('#ffffff',background)?'#000000':'#ffffff';
}
