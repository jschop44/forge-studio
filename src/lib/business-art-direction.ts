/** Shared business identity, independently rendered by each website experience. */
export function businessArtDirection(industry:string,businessName:string){
 const term=industry.toLowerCase();
 const profiles=[
  {match:/\btoys?\b/,key:'toys',paper:'#fff8ef',ink:'#183c3a',accent:'#b53d47',night:'#102b2a',font:'Arial',mood:'Play, curiosity and colorful discovery'},
  {match:/coffee|café|cafe|roast/,key:'coffee',paper:'#f4eee4',ink:'#30271f',accent:'#b5572c',night:'#17120f',font:'Georgia',mood:'Warm craft and neighborhood hospitality'},
  {match:/baseball|softball/,key:'baseball',paper:'#f4f2e9',ink:'#102a37',accent:'#bd3e28',night:'#071d29',font:'Arial Black',mood:'Field lights, team identity and sporting craft'},
  {match:/soccer|football|basketball|sports?|athletic/,key:'sport',paper:'#f0f3e8',ink:'#12271d',accent:'#467b24',night:'#081c15',font:'Arial Black',mood:'Movement, competition and team spirit'},
  {match:/restaurant|bakery|dining|food/,key:'dining',paper:'#f8efe4',ink:'#3a211b',accent:'#a44c33',night:'#241410',font:'Georgia',mood:'Food, ingredients and the dining experience'},
  {match:/real estate|property|architect|interior|construction/,key:'property',paper:'#eeece5',ink:'#2a3431',accent:'#587666',night:'#13211d',font:'Georgia',mood:'Material, space and considered design'},
  {match:/beauty|salon|hair|barber|skincare/,key:'beauty',paper:'#f5eae7',ink:'#422d36',accent:'#955866',night:'#291c23',font:'Georgia',mood:'Personal style, detail and care'},
  {match:/\bhospitals?\b|medical|healthcare|dental|pharmacy/,key:'clinical',paper:'#eef5f6',ink:'#1b3b48',accent:'#287995',night:'#102c3b',font:'Arial',mood:'Clarity, trust and accessible care'},
  {match:/legal|attorney|law firm/,key:'legal',paper:'#f1eee5',ink:'#192f43',accent:'#987340',night:'#102235',font:'Georgia',mood:'Authority, discretion and clear guidance'},
  {match:/finance|financial|account|insurance/,key:'finance',paper:'#edf1eb',ink:'#193a32',accent:'#557f63',night:'#102c25',font:'Georgia',mood:'Order, confidence and long-term planning'},
  {match:/education|school|tutor|learning/,key:'education',paper:'#f5f0dc',ink:'#26395a',accent:'#a36e19',night:'#162746',font:'Arial',mood:'Discovery, curiosity and clear learning paths'},
  {match:/plumb|roof|electric|trade|repair|hardware/,key:'trades',paper:'#f2eee4',ink:'#293840',accent:'#b56430',night:'#172831',font:'Arial Black',mood:'Practical craft, material and dependable workmanship'},
  {match:/pet|veterinar|animal/,key:'animals',paper:'#edf3e6',ink:'#29443c',accent:'#be733a',night:'#17362e',font:'Arial',mood:'Warmth, care and active companionship'},
  {match:/farm|agricult|garden|landscap|florist/,key:'nature',paper:'#f1efdf',ink:'#34442d',accent:'#7e842f',night:'#26331f',font:'Georgia',mood:'Growth, seasonality and natural material'},
  {match:/manufactur|industrial|logistic|transport/,key:'industry',paper:'#eaf0f1',ink:'#263946',accent:'#bd6930',night:'#152632',font:'Arial Black',mood:'Precision, scale and practical engineering'},
  {match:/health|wellness|fitness|yoga|spa/,key:'wellness',paper:'#eff2e8',ink:'#273a30',accent:'#617c52',night:'#14231b',font:'Georgia',mood:'Calm, care and purposeful movement'},
  {match:/tech|software|computing|saas/,key:'technology',paper:'#edf3f8',ink:'#17253e',accent:'#365bcb',night:'#0a1529',font:'Arial',mood:'Clarity, invention and connected systems'},
  {match:/auto|vehicle|motor/,key:'automotive',paper:'#e9edf0',ink:'#19242b',accent:'#b4432b',night:'#0b1319',font:'Arial Black',mood:'Engineering, motion and precision'},
  {match:/fashion|clothing|jewel|luxury/,key:'fashion',paper:'#f2ece8',ink:'#30232b',accent:'#8b526c',night:'#1b1119',font:'Georgia',mood:'Material, silhouette and personal expression'},
  {match:/hotel|hospitality|resort|travel/,key:'hospitality',paper:'#f1ede0',ink:'#233e41',accent:'#417c80',night:'#102b30',font:'Georgia',mood:'Place, welcome and discovery'},
 ];
 const profile=profiles.find(profile=>profile.match.test(term));
 // Unknown categories get typography and a brand palette; never unrelated office photography.
 let hash=0;for(const char of businessName)hash=(hash*31+char.charCodeAt(0))>>>0;
 return profile||{key:'bespoke',paper:['#f1eee8','#eaf0ed','#f0edf4'][hash%3],ink:'#263333',accent:['#95643f','#3c7465','#72588e'][hash%3],night:'#131c20',font:'Georgia',mood:industry};
}
