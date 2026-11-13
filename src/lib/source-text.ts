/** Decode a bounded set of HTML source entities before creating page titles and copy.
 * Source markup is never trusted HTML and must still be escaped on output.
 * Keep unknown entities unchanged instead of silently corrupting business names.
 */
const named: Record<string,string> = {
 amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
 ndash: '–', mdash: '—', hellip: '…', lsquo: '‘', rsquo: '’',
 ldquo: '“', rdquo: '”', bull: '•', middot: '·', copy: '©',
 reg: '®', trade: '™', euro: '€', pound: '£', laquo: '«', raquo: '»',
 eacute: 'é', agrave: 'à', uuml: 'ü', oacute: 'ó', ntilde: 'ñ',
};
export function decodeSourceEntities(value: string): string {
 return value.replace(/&(#(?:x[0-9a-f]{1,6}|[0-9]{1,7})|[a-z][a-z0-9]{1,31});/gi,(original,entity: string)=>{
  if(entity.startsWith('#')){
   const hex=entity[1]?.toLowerCase()==='x';
   const codepoint=Number.parseInt(entity.slice(hex?2:1),hex?16:10);
   return codepoint>0&&codepoint<=0x10ffff&&!(codepoint>=0xd800&&codepoint<=0xdfff)
    ? String.fromCodePoint(codepoint):original;
  }
  return named[entity.toLowerCase()]??original;
 });
}
export function cleanSourceText(value: string,maxLength=400): string {
 return decodeSourceEntities(value.replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim().slice(0,maxLength);
}
