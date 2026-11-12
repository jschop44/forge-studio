import {nicheTerms} from './visual-assets';
/** Curated royalty-free image references from Unsplash's public image CDN.
 * Images are third-party assets and may require attribution/license review before commercial use.
 * No paid API key, scraping, or browser permissions are required.
 */
export const photoLibrary={
 // Individually checked Unsplash License pages: fruit markets and a real fruit basket.
 produce:['photo-1578424059718-fa8a2aea2c54','photo-1605552919771-81d37426424b','photo-1773823307113-2dcc3609aa79','photo-1725208961101-4c28375bdee7','photo-1652957705087-62de4c5b8265'],
 toys:['photo-1568828668638-b1b4014d91a2','photo-1644249484999-5ddb773096b3','photo-1707353485825-69671262a2b0','photo-1485783522162-1dbb8ffcbe5b'],
 entertainment:['photo-1478720568477-152d9b164e26','photo-1517604931442-7e0c8ed2963c','photo-1489599849927-2ee91cede3ba'],
 coffee:['photo-1645584396493-974e3c40fb05','photo-1595574444306-e235cef5ea37','photo-1442512595331-e89e73853f31','photo-1501339847302-ac426a4a7cbb','photo-1447933601403-0c6688de566e','photo-1461023058943-07fcbe16d735'],
 beauty:['photo-1562322140-8baeececf3df','photo-1521590832167-7bcbfaa6381f','photo-1675034743339-0b0747047727','photo-1717160675643-53a7a2ebaa9f'],
 soccer:['photo-1574629810360-7efbbe195018','photo-1522778119026-d647f0596c20','photo-1517466787929-bc90951d0974','photo-1553778263-73a83bab9b0c'],
 baseball:['photo-1471295253337-3ceaaedca402','photo-1686256856775-9218a0edf3c7','photo-1722927120264-e06b2bcdea0d','photo-1654094706120-be054b9ef237','photo-1519152638844-5f96fded9237'],
 automotive:['photo-1503376780353-7e6692767b70','photo-1492144534655-ae79c964c9d7','photo-1507136566006-cfc505b114fc','photo-1549317661-bd32c8ce0db2'],
 hospitality:['photo-1566073771259-6a8506099945','photo-1542314831-068cd1dbfeeb','photo-1571896349842-33c89424de2d','photo-1582719508461-905c673771fd'],
 fashion:['photo-1483985988355-763728e1935b','photo-1539109136881-3be0616acf4b','photo-1441986300917-64674bd600d8','photo-1487222477894-8943e31ef7b2'],
 food:['photo-1517248135467-4c7edcad34c4','photo-1414235077428-338989a2e8c0','photo-1513104890138-7c749659a591','photo-1555396273-367ea4eb4db5'],
 realestate:['photo-1600596542815-ffad4c1539a9','photo-1600607687939-ce8a6c25118c','photo-1600566753190-17f0baa2a6c3','photo-1600607687920-4e2a09cf159d'],
 technology:['photo-1518770660439-4636190af475','photo-1485827404703-89b55fcc595e','photo-1519389950473-47ba0277781c','photo-1550751827-4bd374c3f58b'],
 wellness:['photo-1544367567-0f2fcb009e0b','photo-1506126613408-eca07ce68773','photo-1518611012118-696072aa579a','photo-1571019613454-1cb2f99b2d8b'],
 legal:['photo-1589829545856-d10d557cf95f','photo-1505664194779-8beaceb93744','photo-1450101499163-c8848c66ca85','photo-1521791136064-7986c2920216','photo-1589391886645-d51941baf7fb'],
 general:['photo-1497366811353-6870744d04b2','photo-1497366754035-f200968a6e72','photo-1497366858526-0766cadbe8fa','photo-1524758631624-e2822e304c36']
} as const;
const stockSubjects:Record<keyof typeof photoLibrary,string[]>={"produce":["fruit","fruits","produce","vegetable","vegetables","farm","farmer","farmers","market","markets","grocery","greengrocer","organic","orchard"],"toys":["toy","toys","kids","kid","children","child","educational","learning","wooden","blocks","plush","teddy","games","game","gifts","gift"],"entertainment":["entertainment","cinema","movie","movies","film","media"],"coffee":["coffee","cafe","espresso","roasting","roastery","roaster","barista","restaurant"],"beauty":["hair","salon","beauty","styling","hairdresser","skincare"],"soccer":["soccer","association","football","sports","sport"],"baseball":["baseball","softball","batting","sporting","goods","sports"],"automotive":["automotive","auto","car","cars","vehicle","vehicles","motor","motors","dealership","showroom"],"hospitality":["hotel","hotels","hospitality","resort","resorts","lodging","accommodation"],"fashion":["fashion","clothing","apparel","luxury","boutique"],"food":["food","restaurant","restaurants","dining","hospitality","pizza","cuisine","culinary","kitchen","eatery","bistro","catering"],"realestate":["real","estate","property","properties","residential","home","homes","architecture","architectural","interior","design","luxury"],"technology":["technology","tech","computing","computer","computers","electronics","electronic","hardware","information"],"wellness":["health","wellness","fitness","gym","yoga","meditation"],"legal":["bail","bond","bonds","bailbond","bailbonds","legal","law","lawyer","attorney","court","courthouse","justice"],"general":["office","offices","cowork","coworking","workspace"]};
const stockDescriptors=new Set('studio agency retail professional specialty speciality independent local premium quality modern business center centre group company memorabilia collectibles collectible equipment gear merchandise shop store fresh stand stalls stall locally grown seasonal baskets basket'.split(' '));
/** Family-friendly visual policy: avoid using unreviewed stock imagery for sensitive themes. */
export function requiresFamilySafeReview(topic:string):boolean{return /halloween|haunted|horror|scary|spooky|gore|blood|violence|weapon|adult|erotic|drug|cannabis|marijuana/i.test(topic)}
export function industryPhotos(industry:string){if(requiresFamilySafeReview(industry))return [];const term=industry.toLowerCase();
 if(/\b(?:bail\s*bonds?|bail\s*bonding|bailbond|bailbonds|courthouse|legal services|law firm|attorney|lawyer)\b/.test(term))return photoLibrary.legal.map(id=>'https://images.unsplash.com/'+id+'?auto=format&fit=crop&w=3840&q=90');
 // Narrow subjects must not inherit visually different broad-category stock.
 if(/\b(?:construction|roofing|plumbing|electrician|jewel(?:ry|lery)?|spa|massage|skincare|motorcycle|auto repair|mechanic|travel|theme park|streaming|software|saas|digital|artificial intelligence|cybersecurity|sushi|thai|chinese|mexican|indian|vegan|seafood|steakhouse)\b/.test(term))return [];
if(/\bhospitals?\b|healthcare|medical|dental|pharmacy|veterinar|bakery|patisserie|legal|law firm|finance|financial|insurance|pet care/.test(term)&&!/restaurant/.test(term))return [];if(/education|school/.test(term)&&! /\btoys?\b/.test(term))return [];if(!/fruits?|produce|vegetables?|farmers? market|greengrocer|toys?|entertainment|theme park|movie|cinema|film|media|streaming|coffee|espresso|roast|barista|caf[eé]|soccer|football|baseball|softball|batting|cars?|automotive|auto repair|vehicles?|motors?|motorcycle|hotel|travel|resort|hospitality|fashion|jewel|clothing|luxury|food|restaurant|pizza|bakery|real.?estate|home|property|construction|technology|tech|software|digital|artificial intelligence|saas|computer|health|fitness|wellness|spa|beauty|salon|barber|hairdresser|hair styling|skincare|office|cowork|workspace/.test(term))return [];const category=/\b(?:fruit|fruits|produce|vegetables?|greengrocer)\b|farmers? market/.test(term)?'produce':/\btoys?\b/.test(term)?'toys':/entertainment|theme park|movie|cinema|film|media|streaming/.test(term)?'entertainment':/coffee|espresso|roast|barista|café|cafe/.test(term)?'coffee':/soccer|association football/.test(term)?'soccer':/baseball|softball|batting/.test(term)?'baseball':/\b(?:cars?|automotive|auto repair|auto dealership|vehicles?|motors?|motorcycle|car dealership)\b/.test(term)?'automotive':/hotel|travel|resort|stay|hospitality/.test(term)&&!/restaurant|dining|food/.test(term)?'hospitality':/fashion|jewel|clothing|luxury/.test(term)?'fashion':/food|restaurant|pizza|cafe|bakery/.test(term)?'food':/real.?estate|home|property|construction/.test(term)?'realestate':/\b(?:technology|tech|software|digital|artificial intelligence|ai solutions|computer|computing|saas)\b/.test(term)?'technology':/\b(?:beauty|salon|barber|hairdresser|hair styling|skincare)\b/.test(term)?'beauty':/\b(?:health|healthcare|fitness|wellness|spa|beauty|salon|barber|hairdresser|hair styling|skincare)\b/.test(term)?'wellness':'general';if(category==='general'&&!/\b(office|cowork(?:ing)?|workspace)\b/.test(term))return [];if(nicheTerms(industry).some(subject=>!stockDescriptors.has(subject)&&!stockSubjects[category].includes(subject)))return [];return photoLibrary[category].map(id=>'https://images.unsplash.com/'+id+'?auto=format&fit=crop&w=3840&q=90')}

/** Match each offering to its own subject rather than reusing an industry hero. */
export function servicePhoto(service:string,industry:string):string|null{
 if(requiresFamilySafeReview(service+' '+industry)||!industryPhotos(industry).length)return null;
 const term=service.toLowerCase();
 if(/\b(?:bail\s*bonds?|bail\s*bonding|bailbond|bailbonds)\b/.test(industry.toLowerCase())&&/\b(?:bail|bond|court|release|surety)\b/.test(term))return industryPhotos(industry)[4]||null;
 if(/baseball|softball/.test(industry.toLowerCase())&&/\b(baseballs?|softballs?|balls?)\b/.test(term)&&!/\b(bats?|gloves?|mitts?)\b/.test(term))return 'https://images.unsplash.com/photo-1519152638844-5f96fded9237?auto=format&fit=crop&w=3840&q=90';
 if(/soccer|association football/.test(industry.toLowerCase())&&/training|coaching|practice/.test(term))return 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=3840&q=90';
 if(/\bgloves?\b/.test(term)&&/baseball|softball/.test(industry.toLowerCase()))return 'https://images.unsplash.com/photo-1686256856775-9218a0edf3c7?auto=format&fit=crop&w=3840&q=90';
 if(/\b(?:fruit|produce|vegetable|greengrocer|farmers? market)\b/i.test(industry)){
  if(/\b(?:fruit baskets?|gift baskets?)\b/.test(term))return 'https://images.unsplash.com/photo-1773823307113-2dcc3609aa79?auto=format&fit=crop&w=3840&q=90';
  if(/\b(?:fruits?|produce|vegetables?|market|seasonal|locally grown)\b/.test(term))return industryPhotos(industry)[(term.includes('vegetable')?4:1)]||null;
 }
 if(/\broast/.test(term)&&/coffee|espresso|cafe|café/.test(industry.toLowerCase()))return 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=3840&q=90';
 if(/\b(?:rooms?|suites?|properties|homes?|listings?)\b/.test(term)&&/hotel|hospitality|real estate|property|architecture/.test(industry.toLowerCase()))return industryPhotos(industry)[0]||null;
 const subjects:[RegExp,string][]=[
 [/\b(?:baseball|softball|batting|mitts?|bats?|cleats?)\b/,'photo-1686256856775-9218a0edf3c7'],
 [/pastr|croissant|baked|bakery|muffin|cake|bread|dessert/,'photo-1484723091739-30a097e8f929'],
 [/coffee bean|coffee roast|whole bean/,'photo-1447933601403-0c6688de566e'],
 [/espresso|latte|cappuccino|coffee|barista/,'photo-1461023058943-07fcbe16d735'],
 [/\b(?:tea|matcha)\b/,'photo-1544787219-7f47ccb76574'],
 [/pizza/,'photo-1513104890138-7c749659a591'],
 [/cater|private dining|event dining/,'photo-1414235077428-338989a2e8c0'],
 [/breakfast|brunch/,'photo-1484723091739-30a097e8f929'],
 [/dinner|reservation|table service/,'photo-1517248135467-4c7edcad34c4'],
 [/burger/,'photo-1568901346375-23c9450c58cd'],
 [/salad|vegetable/,'photo-1512621776951-a57141f2eefd'],
 [/property listings?|real estate|homes? for sale|houses? for sale/,'photo-1600596542815-ffad4c1539a9'],
 [/\b(?:cars?|vehicles?|automotive)\b/,'photo-1503376780353-7e6692767b70'],
 [/yoga|meditation/,'photo-1544367567-0f2fcb009e0b'],
 [/\b(?:hotels?|accommodations?|lodging)\b/,'photo-1566073771259-6a8506099945'],
 [/fashion|clothing|apparel|wardrobe/,'photo-1483985988355-763728e1935b'],
 [/electronics|circuit|hardware/,'photo-1518770660439-4636190af475'],
 [/yoga fitness|yoga workout/,'photo-1544367567-0f2fcb009e0b']
 ];
 const found=subjects.find(([pattern])=>pattern.test(term));
 if(found)return 'https://images.unsplash.com/'+found[1]+'?auto=format&fit=crop&w=3840&q=90';
 // Do not attach an unrelated stock photo to an unrecognized offering.
 return null;
}

/** Compare the asset itself, independent of delivery size and quality parameters. */
export function photoIdentity(url:string):string{
 try{const parsed=new URL(url);return parsed.origin+parsed.pathname}catch{return url.split('?')[0]}
}
/** Prefer offering imagery, then unused industry images; never repeat an exhausted asset. */
export function selectDiversePhoto(candidates:(string|null|undefined)[],used:Set<string>,reserved:Set<string>=new Set()):string|undefined{
 const available=candidates.filter((url):url is string=>Boolean(url)&&!used.has(photoIdentity(url!)));
 const selected=available.find(url=>!reserved.has(photoIdentity(url)))||available[0];
 if(selected)used.add(photoIdentity(selected));
 return selected;
}

/** A category match does not establish that an image depicts a specific offering.
 * Keep unsupported offerings text-led instead of mislabelling a dining room as wings.
 */
export function offeringPhotoCandidates(service:string,industry:string):string[]{
 const matched=servicePhoto(service,industry);
 return matched?[matched]:[];
}

const toyCredits=[
 {id:'photo-1568828668638-b1b4014d91a2',credit:'Susan Holt Simpson',source:'https://unsplash.com/photos/brown-wooden-toy-blocks-GQ327RPuxhI'},
 {id:'photo-1644249484999-5ddb773096b3',credit:'Rodrigo Rodrigues | WOLF ART',source:'https://unsplash.com/photos/a-pink-teddy-bear-sitting-on-top-of-a-wooden-block-RaUhcYe9iz0'},
 {id:'photo-1707353485825-69671262a2b0',credit:'Matias Megapixel',source:'https://unsplash.com/photos/a-yellow-teddy-bear-sitting-on-top-of-a-puzzle-1Vzx1J4bVpE'},
 {id:'photo-1485783522162-1dbb8ffcbe5b',credit:'Kelly Sikkema',source:'https://unsplash.com/photos/toddlers-playing-building-block-toys-JRVxgAkzIsM'}
];
export function curatedPhotoCredits(urls:string[]){return toyCredits.filter(photo=>urls.some(url=>photoIdentity(url)==='https://images.unsplash.com/'+photo.id))}
