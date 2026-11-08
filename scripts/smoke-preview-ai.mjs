import {pathToFileURL} from 'node:url';
const input={businessName:'Forge Verification Studio',industry:'Design',description:'An independent studio providing website design services for local businesses.',services:['Website design','Accessibility review']};

export function validatePreviewGeneration(result){
 if(result?.provider!=='cloudflare')throw Error('Expected real Cloudflare provider response');
 const draft=result.draft;
 if(draft?.businessName!==input.businessName||draft?.industry!==input.industry||JSON.stringify(draft?.services)!==JSON.stringify(input.services))throw Error('Generated response changed verified business identity');
 if(typeof draft.description!=='string'||draft.description.trim().length<15||draft.description.length>1800)throw Error('Invalid generated description');
 if(!Array.isArray(result.pages)||result.pages.length!==4)throw Error('Expected four generated pages');
 const pages=new Map(result.pages.map(page=>[page?.slug,page]));
 for(const slug of ['index','services','about','contact']){
  const page=pages.get(slug);
  if(!page||typeof page.html!=='string'||!/<html\b/i.test(page.html)||!/<\/html>/i.test(page.html)||!/<h1\b/i.test(page.html))throw Error('Invalid generated '+slug+' page');
 }
 return true;
}
export async function smokePreviewAi(base,fetcher=fetch){
 const origin=new URL(base);
 if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw Error('Expected an HTTPS preview origin');
 const response=await fetcher(new URL('/api/ai/business',origin),{method:'POST',headers:{'Content-Type':'application/json',Origin:origin.origin},body:JSON.stringify(input),signal:AbortSignal.timeout(90000)});
 if(!response.ok)throw Error('Live AI generation failed with HTTP '+response.status);
 validatePreviewGeneration(await response.json());
 console.log('Live Cloudflare AI generation and all four returned pages passed response validation. Browser interactions and queue execution were not checked.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 smokePreviewAi(process.env.FORGE_BASE_URL||'').catch(error=>{console.error(error.message);process.exitCode=1});
}
