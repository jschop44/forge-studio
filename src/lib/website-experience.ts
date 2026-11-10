import {offeringPhotoCandidates,selectDiversePhoto} from './industry-photos';
export type WebsiteExperience='standard'|'cinematic'|'object-navigation'|'immersive';
export type ObjectNavigationPlan={theme:'coffee'|'baseball'|'soccer'|'collection';industry?:string;targets:{part:string;label:string;href:string;image?:string}[]};
/** Explicit industry and supplied offerings determine objects; incidental prose cannot switch niches. */
export function objectNavigationPlan(input:{industry:string;services:string[];images?:string[];pagePurpose?:'general'|'food'}):ObjectNavigationPlan|null{
 const coffeeIndustry=/\b(coffee|caf[eé]|espresso|roaster|roastery)\b/i.test(input.industry);
 const baseballIndustry=/\b(baseball|softball)\b/i.test(input.industry)||(/\b(sports|sporting goods)\b/i.test(input.industry)&&input.services.some(s=>/\b(baseball|softball|bats?|gloves?)\b/i.test(s)));
 const soccerIndustry=/\b(soccer|association football|football club)\b/i.test(input.industry);
 if(soccerIndustry&&input.services.length){const index=Math.max(0,input.services.findIndex(service=>/soccer|football|balls?|training|coaching/i.test(service)));return {theme:'soccer',targets:[{part:'ball',label:input.services[index],href:'services.html#offering-'+index}]}}
 const foodCoffee=input.pagePurpose==='food'&&input.services.some(s=>/\b(coffee|espresso|beans)\b/i.test(s));
 const theme=coffeeIndustry||foodCoffee?'coffee':baseballIndustry?'baseball':null;
 const collection=():ObjectNavigationPlan|null=>{const used=new Set<string>();const targets=input.services.slice(0,8).map((label,index)=>({part:'offering-'+index,label,href:'services.html#offering-'+index,image:selectDiversePhoto(offeringPhotoCandidates(label,input.industry),used)}));return targets.length?{theme:'collection',industry:input.industry,targets}:null};
 if(!theme)return collection();
 const rules=theme==='coffee'?[{part:'handle',match:/\b(cups?|mugs?|drinkware|ceramics?)\b/i},{part:'coffee',match:/\b(beans?|roasts?|coffee|espresso)\b/i}]:[{part:'bat',match:/\b(bats?|batting)\b/i},{part:'ball',match:/\b(baseballs?|softballs?|balls?)\b/i},{part:'glove',match:/\b(gloves?|mitts?)\b/i}];
 const targets=rules.flatMap(rule=>{const index=input.services.findIndex(service=>rule.match.test(service));return index<0?[]:[{part:rule.part,label:input.services[index],href:'services.html#offering-'+index}]});
 return targets.length?{theme,targets}:collection();
}

/** Cinematic is a separate visual treatment, not a generic navigable 3D world. */
export function enhanceCinematicPages<T extends {slug:string;html:string}>(pages:T[]):T[]{
 const style=`<style id="forge-cinematic-style">@view-transition{navigation:auto}::view-transition-old(root){animation:forge-scene-out .28s ease both}::view-transition-new(root){animation:forge-scene-in .38s ease both}@keyframes forge-scene-out{to{opacity:0;transform:scale(.98)}}@keyframes forge-scene-in{from{opacity:0;transform:scale(1.025)}}main{perspective:none}.site-hero{isolation:isolate}.site-hero .editorial-photo{transform:translateY(var(--forge-depth,0px));transition:none}.site-hero>div{position:relative;z-index:1;transform:none}@media(prefers-reduced-motion:reduce){::view-transition-old(root),::view-transition-new(root){animation:none}.site-hero .editorial-photo,.site-hero>div{transform:none!important}}@media print{.site-hero .editorial-photo,.site-hero>div{transform:none!important}}</style>`;
 const script=`<script id="forge-cinematic-controller">(()=>{const reduced=matchMedia('(prefers-reduced-motion: reduce)'),print=matchMedia('print');let frame=0,active=true;function paint(){frame=0;if(!active||document.hidden)return;const depth=reduced.matches||print.matches?0:Math.max(-18,Math.min(18,scrollY*.045));document.documentElement.style.setProperty('--forge-depth',depth+'px')}function schedule(){if(!frame)frame=requestAnimationFrame(paint)}addEventListener('scroll',schedule,{passive:true});reduced.addEventListener('change',schedule);print.addEventListener('change',schedule);document.addEventListener('visibilitychange',schedule);addEventListener('pagehide',()=>{active=false;cancelAnimationFrame(frame);removeEventListener('scroll',schedule)},{once:true});schedule()})();</script>`;
 const chapters=`<style id="forge-cinematic-chapters">.cinematic-chapters{position:relative;margin:24px 5%;max-width:calc(100% - 10%);width:fit-content;flex-wrap:wrap;z-index:20;display:flex;gap:18px;align-items:center;padding:12px 18px;border-radius:40px;border:1px solid #ffffff60;background:#101820df;backdrop-filter:blur(14px);color:#fff;font:11px system-ui;letter-spacing:.16em}.cinematic-chapters button{min-height:44px;border:0;background:none;color:#fff;font:inherit;cursor:pointer;padding:8px}.cinematic-chapters:before{content:'';position:absolute;left:0;bottom:0;height:2px;width:calc(var(--chapter-progress,0)*100%);background:#f5dfb1}@media print{.cinematic-chapters{display:none}}</style>`;
 const controls=`<script id="forge-cinematic-chapters-controller">(()=>{const chapters=Array.from(document.querySelectorAll('.site-hero,.service-card'));if(!chapters.length)return;const reduced=matchMedia('(prefers-reduced-motion: reduce)');const controls=document.createElement('div');controls.className='cinematic-chapters';controls.setAttribute('role','navigation');controls.setAttribute('aria-label','Story chapters');const label=document.createElement('span'),button=document.createElement('button');button.type='button';button.textContent='NEXT CHAPTER ↓';button.setAttribute('aria-label','Go to next story chapter');controls.append(label,button);const footer=document.querySelector('body>footer');if(footer)footer.before(controls);else document.body.appendChild(controls);let active=0,frame=0;function paint(){frame=0;active=chapters.reduce((current,chapter,index)=>chapter.getBoundingClientRect().top<innerHeight*.55?index:current,0);label.textContent=String(active+1).padStart(2,'0')+' / '+String(chapters.length).padStart(2,'0');controls.style.setProperty('--chapter-progress',String((active+1)/chapters.length));button.textContent=active===chapters.length-1?'BACK TO START ↑':'NEXT CHAPTER ↓'}button.addEventListener('click',()=>chapters[(active+1)%chapters.length].scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'}));const schedule=()=>{if(!frame)frame=requestAnimationFrame(paint)};addEventListener('scroll',schedule,{passive:true});addEventListener('pageshow',schedule);addEventListener('pagehide',()=>cancelAnimationFrame(frame));paint()})();</script>`;
 return pages.map(page=>({...page,html:page.html.includes('id="forge-cinematic-controller"')?page.html:page.html.replace('</head>',style+chapters+'</head>').replace('</body>',script+controls+'</body>')}));
}

/** A clear business name outweighs an incidental product mentioned later in its brief. */
export function inferBusinessIndustry(name:string,brief:string):string{
 const categories:[RegExp,string][]=[
  [/\b(disney|theme park|entertainment|movies?|cinema|streaming)\b/i,'Entertainment, media and theme parks'],
  [/\b(soccer|association football|football club)\b/i,'Soccer club and equipment'],
  [/\b(baseball|softball|batting|sports? equipment|sporting goods)\b/i,'Baseball and sporting goods'],
  [/\b(coffee|espresso|roast(?:er|ery)?|barista|caf[eé])\b/i,'Coffee shop and cafe'],
  [/\b(bakery|patisserie|baker)\b/i,'Bakery and patisserie'],
  [/\b(dental|dentist)\b/i,'Dental practice'],
  [/\b(pharmacy|pharmacist)\b/i,'Pharmacy'],
  [/\b(veterinar(?:y|ian)?|animal hospital|pet grooming|dog daycare)\b/i,'Pet and animal care'],
  [/\b(hospital|healthcare|medical|clinic|physician|doctor|urgent care|pediatric|paediatric)\b/i,'Healthcare and medical services'],
  [/\b(legal|attorney|law firm|lawyer)\b/i,'Legal services'],
  [/\b(insurance)\b/i,'Insurance agency'],
  [/\b(accounting|bookkeeping)\b/i,'Accounting and bookkeeping'],
  [/\b(financial|wealth management)\b/i,'Financial services'],
  [/\b(plumbing|plumber)\b/i,'Plumbing'],
  [/\b(roofing|roofer)\b/i,'Roofing'],
  [/\b(electrician|electrical)\b/i,'Electrical services'],
  [/\b(hvac)\b/i,'Heating and cooling'],
  [/\b(education|school|tutoring|learning center)\b/i,'Education and tutoring'],
  [/\b(restaurant|pizza|bakery|dining)\b/i,'Restaurant and hospitality'],
  [/\b(real estate|realtor|property)\b/i,'Real estate'],
  [/\b(beauty|salon|hair styling|hairdresser|barber)\b/i,'Hair salon and beauty'],
  [/\b(gym|fitness|wellness|spa)\b/i,'Health and wellness'],
  [/\b(auto|car|vehicle|automotive)\b/i,'Automotive'],
  [/\b(fashion|jewelry|clothing)\b/i,'Fashion and luxury'],
  [/\b(software|tech|technology|digital|artificial intelligence|ai solutions|saas)\b/i,'Technology']
 ];
 for(const source of [name,brief]){const found=categories.find(([pattern])=>pattern.test(source));if(found)return found[1]}
 return 'Professional services';
}
