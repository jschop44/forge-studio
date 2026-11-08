export type WebsiteExperience='standard'|'cinematic'|'object-navigation';
export type ObjectNavigationPlan={theme:'coffee'|'baseball';targets:{part:string;label:string;href:string}[]};
/** Explicit industry and supplied offerings determine objects; incidental prose cannot switch niches. */
export function objectNavigationPlan(input:{industry:string;services:string[];pagePurpose?:'general'|'food'}):ObjectNavigationPlan|null{
 const coffeeIndustry=/\b(coffee|caf[eé]|espresso|roaster|roastery)\b/i.test(input.industry);
 const baseballIndustry=/\b(baseball|softball)\b/i.test(input.industry)||(/\b(sports|sporting goods)\b/i.test(input.industry)&&input.services.some(s=>/\b(baseball|softball|bats?|gloves?)\b/i.test(s)));
 const foodCoffee=input.pagePurpose==='food'&&input.services.some(s=>/\b(coffee|espresso|beans)\b/i.test(s));
 const theme=coffeeIndustry||foodCoffee?'coffee':baseballIndustry?'baseball':null;
 if(!theme)return null;
 const rules=theme==='coffee'?[{part:'handle',match:/\b(cups?|mugs?|drinkware|ceramics?)\b/i},{part:'coffee',match:/\b(beans?|roasts?|coffee|espresso)\b/i}]:[{part:'bat',match:/\b(bats?|batting)\b/i},{part:'ball',match:/\b(baseballs?|softballs?|balls?)\b/i},{part:'glove',match:/\b(gloves?|mitts?)\b/i}];
 const targets=rules.flatMap(rule=>{const index=input.services.findIndex(service=>rule.match.test(service));return index<0?[]:[{part:rule.part,label:input.services[index],href:'services.html#offering-'+index}]});
 return targets.length?{theme,targets}:null;
}

/** Cinematic is a separate visual treatment, not a generic navigable 3D world. */
export function enhanceCinematicPages<T extends {slug:string;html:string}>(pages:T[]):T[]{
 const style=`<style id="forge-cinematic-style">@view-transition{navigation:auto}::view-transition-old(root){animation:forge-scene-out .28s ease both}::view-transition-new(root){animation:forge-scene-in .38s ease both}@keyframes forge-scene-out{to{opacity:0;transform:scale(.98)}}@keyframes forge-scene-in{from{opacity:0;transform:scale(1.025)}}main{perspective:1200px}.site-hero{transform-style:preserve-3d}.site-hero .editorial-photo{transform:translate3d(0,var(--forge-depth,0px),-30px);transition:none}.site-hero>div{position:relative;z-index:1;transform:translateZ(15px)}@media(prefers-reduced-motion:reduce){::view-transition-old(root),::view-transition-new(root){animation:none}.site-hero .editorial-photo,.site-hero>div{transform:none!important}}@media print{.site-hero .editorial-photo,.site-hero>div{transform:none!important}}</style>`;
 const script=`<script id="forge-cinematic-controller">(()=>{const reduced=matchMedia('(prefers-reduced-motion: reduce)'),print=matchMedia('print');let frame=0,active=true;function paint(){frame=0;if(!active||document.hidden)return;const depth=reduced.matches||print.matches?0:Math.max(-18,Math.min(18,scrollY*.045));document.documentElement.style.setProperty('--forge-depth',depth+'px')}function schedule(){if(!frame)frame=requestAnimationFrame(paint)}addEventListener('scroll',schedule,{passive:true});reduced.addEventListener('change',schedule);print.addEventListener('change',schedule);document.addEventListener('visibilitychange',schedule);addEventListener('pagehide',()=>{active=false;cancelAnimationFrame(frame);removeEventListener('scroll',schedule)},{once:true});schedule()})();</script>`;
 return pages.map(page=>({...page,html:page.html.replace('</head>',style+'</head>').replace('</body>',script+'</body>')}));
}
