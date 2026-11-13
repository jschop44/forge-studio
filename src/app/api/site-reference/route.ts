import {cleanSourceText as clean} from '../../../lib/source-text';
import {usefulSourcePage} from '../../../lib/source-reuse-policy';
import {selectRepresentativeSourcePages} from '../../../lib/source-navigation';
import {NextRequest,NextResponse} from 'next/server';
import {captureWithBrowserWorker} from '../../../lib/server/browser-capture-worker';
import {publicResearchPolicy} from '../../../lib/server/public-site-policy';
import {sameOrigin} from '../../../lib/server/request-security';
import {extractWebsiteDesignDna,mergeSourcePageImages,type SourceImage} from '../../../lib/website-design-dna';
import {sitemapPages} from '../../../lib/sitemap-discovery';
import {homepageSourceParagraphs} from '../../../lib/forge-intelligence';
import {fetchPublicText,publicSiteUrl} from '../../../lib/server/public-site-fetch';
export const runtime='nodejs';

function meta(html:string,key:string){const tags=html.match(/<meta\b[^>]*>/gi)||[];for(const tag of tags){const property=tag.match(/(?:name|property)\s*=\s*["']([^"']+)["']/i)?.[1];if(property?.toLowerCase()===key.toLowerCase())return clean(tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1]||'')}return ''}
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return NextResponse.json({error:'Origin rejected'},{status:403});
 try{
 const raw=await req.text();if(raw.length>2048)return NextResponse.json({error:'Address too long'},{status:413});
 const value=JSON.parse(raw).url;if(typeof value!=='string'||value.length>500)return NextResponse.json({error:'Invalid website address'},{status:400});
 const beforeRequest=publicResearchPolicy();
 const homepage=await fetchPublicText(publicSiteUrl(value.trim()),{beforeRequest,timeout:8000,maxBytes:450000,maxDownloadBytes:8000000,selectiveHtml:true,accept:'text/html',redirects:3});
 const url=homepage.url,html=homepage.body;
 const browserCapture=captureWithBrowserWorker(url.href);
 const homepageParagraphs=homepageSourceParagraphs(html);
 const warnings:string[]=[];
 if(homepage.extraction?.truncated)warnings.push('Homepage extraction reached its bounded size limit. Some content or assets may be missing; provide authorized source files for a complete reconstruction.');
 const stylesheetUrls=[...html.matchAll(/<link\b[^>]*>/gi)].map(match=>match[0]).filter(tag=>/rel\s*=\s*["']?stylesheet/i.test(tag)).map(tag=>tag.match(/href\s*=\s*["']([^"']+)["']/i)?.[1]).filter((href):href is string=>Boolean(href)).filter(href=>{try{const target=new URL(href,url);return target.protocol==='https:'&&target.hostname===url.hostname&&(!target.port||target.port==='443')}catch{return false}}).slice(0,3);
 const externalCss:string[]=[];
 for(const href of stylesheetUrls){
 try{
 const cssUrl=new URL(href,url);if(cssUrl.protocol!=='https:'||cssUrl.hostname!==url.hostname||cssUrl.port&&cssUrl.port!=='443')continue;
 const stylesheet=(await fetchPublicText(cssUrl,{beforeRequest,timeout:3500,maxBytes:100000,accept:'text/css'})).body;externalCss.push(stylesheet);
 }catch{warnings.push('A stylesheet could not be retrieved: '+href);continue}
 }
 const homepageDesignDna=extractWebsiteDesignDna(html,url.href,externalCss);
 const title=clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'');
 const description=meta(html,'description')||meta(html,'og:description');
 const css=(html.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi)||[]).join(' ').slice(0,70000);
 const styles=css+' '+externalCss.join(' ')+' '+(html.match(/<body[^>]*style=["'][^"']+["']/i)?.[0]||'');
 const background=styles.match(/(?:--(?:background|bg|surface|brand-bg)|background(?:-color)?)\s*:\s*(#[a-f0-9]{3,8})/i)?.[1]||meta(html,'theme-color').match(/^#[a-f0-9]{3,8}$/i)?.[0];
 const accent=styles.match(/(?:--(?:primary|accent|brand|brand-accent)|color)\s*:\s*(#[a-f0-9]{3,8})/i)?.[1];
 const fontFamily=styles.match(/font-family\s*:\s*['"]?(Georgia|Arial|Verdana|Tahoma|Trebuchet MS|Times New Roman|system-ui|sans-serif|serif)/i)?.[1];
 const visualSignals={navigationLinks:(html.match(/<nav\b/gi)||[]).length,heroSections:(html.match(/(?:class|id)\s*=\s*["'][^"']*(?:hero|banner|masthead)[^"']*["']/gi)||[]).length,imageCount:(html.match(/<img\b/gi)||[]).length,sectionCount:(html.match(/<section\b/gi)||[]).length,buttonCount:(html.match(/<button\b/gi)||[]).length,hasVideo:/<video\b/i.test(html),hasCanvas:/<canvas\b/i.test(html)};

 const navigationCandidates=[...html.matchAll(/<a\b([^>]*?)href\s*=\s*["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi)].slice(0,250).map(match=>{try{const link=new URL(match[2],url);if(link.origin!==url.origin||link.protocol!=='https:'||/\.(?:pdf|png|jpe?g|gif|svg|webp|mp4|zip)$/i.test(link.pathname))return null;const attrs=match[1]+' '+match[3];const aria=attrs.match(/aria-label\s*=\s*["']([^"']+)["']/i)?.[1]||'';const label=(clean(match[4])||clean(aria)||decodeURIComponent(link.pathname.split('/').filter(Boolean).pop()||'')).slice(0,60);return {label,path:link.pathname}}catch{return null}}).filter((item):item is {label:string;path:string}=>Boolean(item&&item.label.length>=2&&item.path!=='/'&&item.path.length<=140&&!/^(sign in|log in|logout|register|account|privacy|terms|cookies|accessibility)$/i.test(item.label))).filter((item,index,all)=>all.findIndex(other=>other.path===item.path)===index);
 const chosenNavigation=new Set(selectRepresentativeSourcePages(navigationCandidates,12).map(item=>item.path));
 // Preserve the original menu order for reconstruction; only the inspection
 // candidate selection is prioritized by broad business page category.
 const navigation=navigationCandidates.filter(item=>chosenNavigation.has(item.path));
 if(navigation.length<3){
  try{
   const sitemapUrl=new URL('/sitemap.xml',url);
   const xml=(await fetchPublicText(sitemapUrl,{beforeRequest,timeout:3500,maxBytes:200000,accept:'application/xml,text/xml'})).body;
   for(const page of sitemapPages(xml,url.origin,12)){
    if(navigation.length>=12)break;
    if(!navigation.some(existing=>existing.path===page.path))navigation.push(page);
   }
  }catch{/* Optional sitemap discovery; retain homepage navigation on failure. */}
 }
 const pageSummaries:{path:string;label:string;title:string;description:string;headings:string[];paragraphs:string[];images:SourceImage[]}[]=[];
 for(const item of selectRepresentativeSourcePages(navigation,4)){
  try{
   if(!usefulSourcePage(item))continue;
   const pageUrl=new URL(item.path,url);
   const pageResult=await fetchPublicText(pageUrl,{beforeRequest,timeout:4500,maxBytes:180000,maxDownloadBytes:3000000,selectiveHtml:true,accept:'text/html'});
   const pageHtml=pageResult.body;
   if(!usefulSourcePage({...item,title:clean(pageHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||''),headings:[...pageHtml.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(m=>clean(m[1]))}))continue;
   const pageDna=extractWebsiteDesignDna(pageHtml,pageResult.url.href);
   const mainHtml=pageHtml.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||pageHtml;
   const paragraphs=[...mainHtml.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(m=>clean(m[1])).filter(p=>p.length>=20).filter((p,i,all)=>all.indexOf(p)===i).slice(0,12);
   if(pageResult.extraction?.truncated)warnings.push('Partial page extraction: '+item.path);
   pageSummaries.push({paragraphs,images:pageDna.images,path:item.path,label:item.label,title:clean(pageHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||item.label),description:meta(pageHtml,'description')||meta(pageHtml,'og:description'),headings:[...pageHtml.matchAll(/<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].slice(0,5).map(m=>clean(m[2])).filter(Boolean)});
  }catch{warnings.push('Page could not be retrieved: '+item.path);continue}
 }
 const designDna=mergeSourcePageImages(homepageDesignDna,pageSummaries);
 const headings=[...html.matchAll(/<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].slice(0,25).map(m=>clean(m[2])).filter(Boolean).filter((heading,index,all)=>all.findIndex(other=>other.toLowerCase()===heading.toLowerCase())===index).slice(0,12);
 const browserEvidence=await browserCapture;
 return NextResponse.json({browserEvidence,url:url.href,title,description,headings,navigation,pageSummaries,homepageParagraphs,styleReference:{background,accent,fontFamily},styleFound:Boolean(background||accent||fontFamily),stylesheetsRead:externalCss.length,visualSignals,designDna,warnings,extraction:{partial:homepage.extraction?.truncated||warnings.length>0,downloadedBytes:homepage.extraction?.downloadedBytes,scriptsOmitted:homepage.extraction?.scriptsOmitted,warnings},notice:'Public homepage metadata, embedded CSS and a limited number of same-host stylesheets. Scripts were omitted. Image references and bounded page text were retained for authorized reuse.'},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to inspect website'},{status:422})}
}
