/**
 * A strictly original test concept for electronics-retail sites whose live
 * extraction is unavailable. Not a cached Best Buy page, catalog, theme,
 * trademark, or licensed-data adapter. No website request is made.
 */
export type OriginalRetailShowcase={businessName:string;brief:string};

export function blockedRetailOriginalShowcase(address:string):OriginalRetailShowcase|null{
 let parsed:URL;
 try{
  const value=address.trim();
  if(!value||/^\w+:\/\//.test(value)&&!/^https?:\/\//i.test(value))return null;
  parsed=new URL(/^https?:\/\//i.test(value)?value:'https://'+value);
 }catch{return null}
 if(!['bestbuy.com','www.bestbuy.com'].includes(parsed.hostname.toLowerCase())||
    !['https:','http:'].includes(parsed.protocol)||parsed.username||parsed.password||
    parsed.port&&parsed.port!=='443')return null;
 return {
  businessName:'Northstar Electronics',
  brief:[
   'Industry: Consumer electronics retail',
   'Products: Televisions and home theater, Laptop computers, Headphones and audio, Gaming consoles, Digital cameras, Kitchen appliances',
   'A fictional multi-category neighborhood electronics retailer showcasing clear department navigation, original branding, helpful buying guidance, and customer support information. This is a design-quality demonstration, not a live product catalog; do not invent prices, inventory, discounts, or Best Buy affiliations.'
  ].join('\n')
 };
}
