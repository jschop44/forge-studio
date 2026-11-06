/** Deterministic capture quality report; evidence is not proof of functional behavior. */
export function assessBlueprint(blueprint){
 if(!blueprint||blueprint.version!==1||!Array.isArray(blueprint.pages))throw Error('Invalid blueprint');
 const pages=blueprint.pages.slice(0,12);
 const regions=pages.reduce((n,p)=>n+(Array.isArray(p.regions)?p.regions.length:0),0);
 const links=blueprint.interactionCoverage?.links||0;
 const buttons=blueprint.interactionCoverage?.buttons||0;
 const forms=blueprint.interactionCoverage?.forms||0;
 const warnings=[];
 if(!pages.length)warnings.push('No captured pages');
 if(!regions)warnings.push('No visual regions captured');
 if(buttons||forms)warnings.push('Buttons and forms were observed but not functionally verified');
 if(!links)warnings.push('No navigation links observed');
 if(!blueprint.provenance||blueprint.provenance.generatedContent!==false)warnings.push('Source provenance is missing or untrusted');
 const checks={pageCoverage:pages.length>0,visualRegions:regions>0,sourceProvenance:blueprint.provenance?.generatedContent===false,interactionVerification:buttons+forms===0};
 return {version:1,pages:pages.length,regions,observed:{links,buttons,forms},checks,warnings,publicationReady:false,requiresHumanReview:true};
}
