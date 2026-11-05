/** Curated royalty-free image references from Unsplash's public image CDN.
 * Images are third-party assets and may require attribution/license review before commercial use.
 * No paid API key, scraping, or browser permissions are required.
 */
export const photoLibrary={
 coffee:['photo-1442512595331-e89e73853f31','photo-1501339847302-ac426a4a7cbb'],
 automotive:['photo-1503376780353-7e6692767b70','photo-1492144534655-ae79c964c9d7'],
 hospitality:['photo-1566073771259-6a8506099945','photo-1542314831-068cd1dbfeeb'],
 fashion:['photo-1483985988355-763728e1935b','photo-1539109136881-3be0616acf4b'],
 food:['photo-1517248135467-4c7edcad34c4','photo-1414235077428-338989a2e8c0'],
 realestate:['photo-1600596542815-ffad4c1539a9','photo-1600607687939-ce8a6c25118c'],
 technology:['photo-1518770660439-4636190af475','photo-1485827404703-89b55fcc595e'],
 wellness:['photo-1544367567-0f2fcb009e0b','photo-1506126613408-eca07ce68773'],
 general:['photo-1497366811353-6870744d04b2','photo-1497366754035-f200968a6e72']
} as const;
export function industryPhotos(industry:string){const term=industry.toLowerCase();const category=/coffee|espresso|roast|barista|café|cafe/.test(term)?'coffee':/car|auto|vehicle|motor/.test(term)?'automotive':/hotel|travel|resort|stay|hospitality/.test(term)?'hospitality':/fashion|jewel|clothing|luxury/.test(term)?'fashion':/food|restaurant|pizza|cafe|bakery/.test(term)?'food':/real.?estate|home|property|construction/.test(term)?'realestate':/tech|software|digital|ai|computer/.test(term)?'technology':/health|fitness|wellness|spa|beauty/.test(term)?'wellness':'general';return photoLibrary[category].map(id=>'https://images.unsplash.com/'+id+'?auto=format&fit=crop&w=1400&q=80')}
