/** Curated royalty-free image references from Unsplash's public image CDN.
 * Images are third-party assets and may require attribution/license review before commercial use.
 * No paid API key, scraping, or browser permissions are required.
 */
export const photoLibrary={
 entertainment:['photo-1478720568477-152d9b164e26','photo-1517604931442-7e0c8ed2963c','photo-1500534623283-312aade485b7','photo-1489599849927-2ee91cede3ba'],
 coffee:['photo-1442512595331-e89e73853f31','photo-1501339847302-ac426a4a7cbb','photo-1447933601403-0c6688de566e','photo-1461023058943-07fcbe16d735'],
 baseball:['photo-1471295253337-3ceaaedca402','photo-1508344928928-7165b4c40d5c'],
 automotive:['photo-1503376780353-7e6692767b70','photo-1492144534655-ae79c964c9d7'],
 hospitality:['photo-1566073771259-6a8506099945','photo-1542314831-068cd1dbfeeb'],
 fashion:['photo-1483985988355-763728e1935b','photo-1539109136881-3be0616acf4b'],
 food:['photo-1517248135467-4c7edcad34c4','photo-1414235077428-338989a2e8c0','photo-1513104890138-7c749659a591','photo-1512621776951-a57141f2eefd'],
 realestate:['photo-1600596542815-ffad4c1539a9','photo-1600607687939-ce8a6c25118c'],
 technology:['photo-1518770660439-4636190af475','photo-1485827404703-89b55fcc595e'],
 wellness:['photo-1544367567-0f2fcb009e0b','photo-1506126613408-eca07ce68773'],
 general:['photo-1497366811353-6870744d04b2','photo-1497366754035-f200968a6e72']
} as const;
/** Family-friendly visual policy: avoid using unreviewed stock imagery for sensitive themes. */
export function requiresFamilySafeReview(topic:string):boolean{return /halloween|haunted|horror|scary|spooky|gore|blood|violence|weapon|adult|erotic|drug|cannabis|marijuana/i.test(topic)}
export function industryPhotos(industry:string){if(requiresFamilySafeReview(industry))return [];const term=industry.toLowerCase();const category=/entertainment|theme park|movie|cinema|film|media|streaming/.test(term)?'entertainment':/coffee|espresso|roast|barista|café|cafe/.test(term)?'coffee':/baseball|softball|batting|sporting goods|sports? equipment/.test(term)?'baseball':/car|auto|vehicle|motor/.test(term)?'automotive':/hotel|travel|resort|stay|hospitality/.test(term)?'hospitality':/fashion|jewel|clothing|luxury/.test(term)?'fashion':/food|restaurant|pizza|cafe|bakery/.test(term)?'food':/real.?estate|home|property|construction/.test(term)?'realestate':/tech|software|digital|ai|computer/.test(term)?'technology':/health|fitness|wellness|spa|beauty/.test(term)?'wellness':'general';return photoLibrary[category].map(id=>'https://images.unsplash.com/'+id+'?auto=format&fit=crop&w=1400&q=80')}

/** Match each offering to its own subject rather than reusing an industry hero. */
export function servicePhoto(service:string,industry:string):string|null{
 if(requiresFamilySafeReview(service+' '+industry))return null;
 const term=service.toLowerCase();
 const subjects:[RegExp,string][]=[
 [/\b(?:baseball|softball|batting|gloves?|mitts?|bats?|cleats?)\b/,'photo-1471295253337-3ceaaedca402'],
 [/pastr|croissant|baked|bakery|muffin|cake|bread|dessert/,'photo-1484723091739-30a097e8f929'],
 [/coffee bean|roast|whole bean/,'photo-1447933601403-0c6688de566e'],
 [/espresso|latte|cappuccino|coffee|barista/,'photo-1461023058943-07fcbe16d735'],
 [/\b(?:tea|matcha)\b/,'photo-1544787219-7f47ccb76574'],
 [/pizza/,'photo-1513104890138-7c749659a591'],
 [/cater|private dining|event dining/,'photo-1414235077428-338989a2e8c0'],
 [/breakfast|brunch/,'photo-1484723091739-30a097e8f929'],
 [/dinner|reservation|table service/,'photo-1517248135467-4c7edcad34c4'],
 [/burger/,'photo-1568901346375-23c9450c58cd'],
 [/salad|vegetable/,'photo-1512621776951-a57141f2eefd'],
 [/property|home|house|listing|real estate/,'photo-1600596542815-ffad4c1539a9'],
 [/\b(?:cars?|vehicles?|automotive)\b/,'photo-1503376780353-7e6692767b70'],
 [/yoga|meditation/,'photo-1544367567-0f2fcb009e0b'],
 [/hotel|room|suite|accommodation/,'photo-1566073771259-6a8506099945'],
 [/fashion|clothing|apparel|wardrobe/,'photo-1483985988355-763728e1935b'],
 [/software|technology|electronics|computer/,'photo-1518770660439-4636190af475'],
 [/fitness|gym|workout|training/,'photo-1506126613408-eca07ce68773']
 ];
 const found=subjects.find(([pattern])=>pattern.test(term));
 if(found)return 'https://images.unsplash.com/'+found[1]+'?auto=format&fit=crop&w=1000&q=80';
 // Do not attach an unrelated stock photo to an unrecognized offering.
 return null;
}
