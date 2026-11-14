import {cleanSourceText} from './source-text';
import {extractWebsiteDesignDna,mergeSourcePageImages,type SourceImage,type WebsiteDesignDna} from './website-design-dna';
import type {ReferenceAppearance} from './reference-appearance';

/**
 * User-provided, local-only source evidence for sites that do not permit automated
 * inspection. The HTML is NEVER executed, fetched, or sent to the generation API.
 * Filename-derived routes are proposals, not claims that the live URLs were verified.
 */
export type SavedSourcePage={name:string;html:string};
export type SavedSourceSummary={path:string;label:string;title:string;description:string;headings:string[];paragraphs:string[];images:SourceImage[]};
export type SavedSourceInspection={
 url:string;title:string;description:string;headings:string[];
 navigation:{label:string;path:string}[];pageSummaries:SavedSourceSummary[];
 stylesheetsRead:number;styleReference:ReferenceAppearance;designDna:WebsiteDesignDna;
 warnings:string[];referenceMarkup:string;
};

const MAX_FILES=6;
const MAX_FILE_CHARS=1_000_000;
const MAX_TOTAL_CHARS=4_000_000;
const MAX_HEADINGS=12;
function attr(tag:string,key:string):string{
 const match=tag.match(new RegExp('(?:^|\\s)'+key+'\\s*=\\s*(?:"([^"]*)"|\\x27([^\\x27]*)\\x27|([^\\s>]+))','i'));
 return cleanSourceText(match?.slice(1).find(value=>value!==undefined)||'',500);
}
function tags(html:string,name:string,limit:number):string[]{
 const matched=[...html.matchAll(new RegExp('<'+name+'\\b[^>]*>([\\s\\S]*?)<\\/'+name+'\\s*>','gi'))];
 return matched.slice(0,limit).map(match=>cleanSourceText(match[1],240)).filter(Boolean);
}
function metaDescription(html:string):string{
 for(const m of html.matchAll(/<meta\b[^>]*>/gi)){
  const name=attr(m[0],'name');
  if(name.toLowerCase()==='description')return attr(m[0],'content').slice(0,500);
 }
 return '';
}
function pageTitle(html:string):string{return tags(html,'title',1)[0]||tags(html,'h1',1)[0]||'';}
function route(name:string):string{
 const safe=name.trim().toLowerCase();
 if(!/^[a-z0-9][a-z0-9 _().-]{0,110}\.html?$/i.test(safe))throw Error('Only saved .html or .htm page files are accepted.');
 const stem=safe.replace(/\.html?$/i,'').replace(/\s*\(\d+\)\s*$/,'').trim();
 if(stem==='index'||stem==='home'||stem==='homepage')return '/';
 const slug=stem.replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70);
 if(!slug)throw Error('A saved page needs a recognizable filename.');
 return '/'+slug;
}
function sourceUrl(value:string):URL{
 let url:URL;
 try{url=new URL(/^https?:\/\//i.test(value.trim())?value.trim():'https://'+value.trim());}
 catch{throw Error('Enter the original public HTTPS website address before importing.');}
 if(url.protocol!=='https:'||url.username||url.password||url.port&&url.port!=='443'||
    !url.hostname.includes('.')||/^(?:localhost|.*\.localhost|.*\.local)$/i.test(url.hostname)||
    /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)||url.hostname.includes('['))
  throw Error('Saved HTML must be associated with a public HTTPS source address.');
 return new URL('/',url.origin);
}
/** Decode only bounded, inert metadata. A saved page is not proof of online accessibility. */
export function prepareSavedSourceInspection(files:readonly SavedSourcePage[],address:string):SavedSourceInspection{
 if(!Array.isArray(files)||files.length<1||files.length>MAX_FILES)throw Error('Choose between one and six authorized HTML pages.');
 const base=sourceUrl(address);
 const seen=new Set<string>();
 let total=0;
 const docs=files.map(file=>{
  if(!file||typeof file.html!=='string'||typeof file.name!=='string')throw Error('Invalid source page.');
  if(!file.html.length||file.html.length>MAX_FILE_CHARS)throw Error('Each source HTML page must be smaller than 1 MB.');
  total+=file.html.length;
  if(total>MAX_TOTAL_CHARS)throw Error('Saved source files together must be smaller than 4 MB.');
  if(!/<(?:!doctype\s+html|html|head|body)\b/i.test(file.html))throw Error('The selected file is not recognizable HTML.');
  const path=route(file.name);
  if(seen.has(path))throw Error('The selected files contain two pages with the same filename-derived route.');
  seen.add(path);
  return {path,html:file.html,title:pageTitle(file.html),headings:[...new Set([...tags(file.html,'h1',6),...tags(file.html,'h2',6),...tags(file.html,'h3',5)])].slice(0,MAX_HEADINGS),description:metaDescription(file.html),paragraphs:tags(file.html,'p',7)};
 });
 const home=docs.find(x=>x.path==='/')||docs[0];
 const homeDna=extractWebsiteDesignDna(home.html,base.href);
 const summaries=docs.filter(x=>x!==home).map(item=>{
  const pageUrl=new URL(item.path,base);
  const dna=extractWebsiteDesignDna(item.html,pageUrl.href);
  return {path:item.path,label:item.title.split(/[|—–]/)[0].slice(0,100)||item.path.slice(1),
   title:item.title.slice(0,200),description:item.description.slice(0,500),
   headings:item.headings,paragraphs:item.paragraphs,
   images:dna.images.slice(0,30)};
 });
 const designDna=mergeSourcePageImages(homeDna,summaries);
 const navigation=summaries.map(item=>({label:item.label,path:item.path}));
 const description=(home.description||home.paragraphs[0]||'').slice(0,500);
 const referenceStyle:ReferenceAppearance={
  ...(designDna.background?{background:designDna.background}:{}),
  ...(designDna.palette.length?{accent:designDna.palette[0]}:{})
 };
 return {
  url:base.href,title:home.title.slice(0,200),description,headings:home.headings,
  navigation,pageSummaries:summaries,stylesheetsRead:0,styleReference,designDna,
  referenceMarkup:home.html,
  warnings:[
   'Source evidence was imported from saved files only; Forge did not fetch, crawl, or verify the live website.',
   'Page routes are inferred from saved filenames. Verify each generated link before publication.',
   'Source photographs, logos, text and trade dress require separate reuse authorization; a saved file is not a license.',
   'External CSS, scripts and downloaded assets were not executed or imported.'
  ]
 };
}
