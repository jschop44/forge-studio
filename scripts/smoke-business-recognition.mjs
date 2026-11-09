import assert from 'node:assert/strict';
// Synthetic, non-persistent checks of the deployed free recognition provider.
const origin='https://forge-studio-preview.stands-old-3h.workers.dev';
const cases=[
 {label:'hospital',businessName:'Northside Hospital',brief:'',industry:/hospital/i},
 {label:'restaurant',businessName:'Basil Restaurant',brief:'',industry:/restaurant/i},
 {label:'unlisted niche',businessName:'Meridian',brief:'We restore antique clocks and repair mechanical watches.',industry:/clock|watch/i},
 {label:'ambiguous brand',businessName:'XQ Meridian',brief:'',industry:null}
];
const normalize=value=>value.toLowerCase().replace(/\s+/g,' ').trim();
for(const sample of cases){
 const response=await fetch(origin+'/api/business/recognize',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({businessName:sample.businessName,brief:sample.brief}),signal:AbortSignal.timeout(45000)});
 assert.equal(response.status,200,sample.label+': live recognition HTTP '+response.status);
 const result=await response.json();
 console.log(JSON.stringify({case:sample.label,status:result.status,industry:result.industry,provider:result.provider}));
 assert.equal(result.provider,'cloudflare',sample.label+': configured free provider');
 if(sample.industry){
  assert.equal(result.status,'identified',sample.label);
  assert.match(result.industry,sample.industry,sample.label+': preserve the specific activity');
  assert.ok(Array.isArray(result.evidence)&&result.evidence.length>0,sample.label+': evidence');
  const source=normalize(sample.businessName+' '+sample.brief);
  for(const quote of result.evidence)assert.ok(source.includes(normalize(quote)),sample.label+': evidence must come from the brief');
 }else{
  assert.equal(result.status,'needs-context',sample.label+': do not fabricate an identity');
  assert.deepEqual(result.services,[]);
 }
}
console.log('Live business recognition: 4/4 passed. No jobs persisted and no sites published.');
