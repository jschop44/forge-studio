/** Deterministic capture quality report; evidence is not proof of functional behavior. */
export function assessBlueprint(blueprint){
 if(!blueprint||blueprint.version!==1||!Array.isArray(blueprint.pages))throw Error('Invalid blueprint');
 const pages=blueprint.pages.slice(0,12);
 const regions=pages.reduce((n,p)=>n+(Array.isArray(p?.regions)?p.regions.length:0),0);
 const safeCount=n=>Number.isSafeInteger(n)&&n>=0?n:0;
 const links=safeCount(blueprint.interactionCoverage?.links);
 const buttons=safeCount(blueprint.interactionCoverage?.buttons);
 const forms=safeCount(blueprint.interactionCoverage?.forms);
 const probes=Array.isArray(blueprint.navigationChecks)?blueprint.navigationChecks.slice(0,96):[];
 const failedNavigation=probes.filter(p=>!p||p.ok!==true||!Number.isInteger(p.status)||p.status<200||p.status>=400);
 const warnings=[];
 const validBounds=b=>b&&[b.x,b.y,b.width,b.height].every(n=>typeof n==='number'&&Number.isFinite(n))&&b.x>=0&&b.y>=0&&b.width>0&&b.height>0;
 const measuredRegions=pages.reduce((n,p)=>n+(Array.isArray(p?.regions)?p.regions.filter(r=>validBounds(r?.bounds)).length:0),0);
 const unmeasuredRegions=regions-measuredRegions;
 const totalPages=pages.length;
 const pagesWithRegions=pages.filter(p=>Array.isArray(p?.regions)&&p.regions.length>0).length;
 const pagesWithNavigation=pages.filter(p=>Array.isArray(p?.navigation)&&p.navigation.length>0).length;
 const pagesWithMeasuredRegions=pages.filter(p=>Array.isArray(p?.regions)&&p.regions.some(r=>validBounds(r?.bounds))).length;
 const pagesWithDesignTokens=pages.filter(p=>p?.designTokens&&Object.values(p.designTokens).some(v=>typeof v==='string'&&v.length>0)).length;
 if(failedNavigation.length)warnings.push('Some read-only navigation probes failed');
 const pagePaths=new Set();
 let duplicatePaths=0;
 let emptyPages=0;
 for(const page of pages){const path=typeof page?.path==='string'?page.path:'';if(path&&pagePaths.has(path))duplicatePaths++;if(path)pagePaths.add(path);if(!Array.isArray(page?.regions)||!page.regions.length)emptyPages++;}
 if(duplicatePaths)warnings.push('Multiple captured pages share the same path');
 if(emptyPages)warnings.push('Some captured pages contain no visual regions');
 if(!pages.length)warnings.push('No captured pages');
 if(!regions)warnings.push('No visual regions captured');
 if(unmeasuredRegions)warnings.push('Some visual regions lack valid measured geometry');
 if(buttons||forms)warnings.push('Buttons and forms were observed but not functionally verified');
 if(!links)warnings.push('No navigation links observed');
 if(!blueprint.provenance||blueprint.provenance.generatedContent!==false)warnings.push('Source provenance is missing or untrusted');
 const checks={measuredGeometry:regions>0&&unmeasuredRegions===0,pageCoverage:pages.length>0,visualRegions:regions>0,sourceProvenance:blueprint.provenance?.generatedContent===false,interactionVerification:buttons+forms===0,uniquePagePaths:duplicatePaths===0,allPagesHaveRegions:emptyPages===0,readOnlyNavigation:failedNavigation.length===0};
 return {version:1,pages:pages.length,coverage:{visual:totalPages?pagesWithRegions/totalPages:0,measuredPages:totalPages?pagesWithMeasuredRegions/totalPages:0,navigation:totalPages?pagesWithNavigation/totalPages:0,designTokens:totalPages?pagesWithDesignTokens/totalPages:0},regions,measuredRegions,unmeasuredRegions,geometryCoverage:regions?measuredRegions/regions:0,duplicatePaths,emptyPages,navigationProbes:probes.length,failedNavigation:failedNavigation.length,observed:{links,buttons,forms},checks,warnings,publicationReady:false,requiresHumanReview:true};
}
