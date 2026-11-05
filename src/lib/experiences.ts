import {z} from 'zod';
export const ExperienceSchema=z.object({
 id:z.string().uuid(),name:z.string().min(1).max(100),
 category:z.enum(['cinematic-product','luxury-brand','business']),
 industry:z.enum(['automotive','fashion','jewelry','hospitality','real-estate','technology','services','other']),
 scene:z.object({object:z.enum(['torus','sphere','box','knot','product-image']),metalness:z.number().min(0).max(1),roughness:z.number().min(0).max(1),rotationSpeed:z.number().min(0).max(2),particles:z.boolean(),scrollMotion:z.boolean(),background:z.string().regex(/^#[0-9a-fA-F]{6}$/),accent:z.string().regex(/^#[0-9a-fA-F]{6}$/),imageUrl:z.string().url().max(2000).optional()}),
 hero:z.object({eyebrow:z.string().max(100),headline:z.string().max(140),description:z.string().max(500),cta:z.string().max(60)}),
 sections:z.array(z.object({id:z.string(),title:z.string().max(100),body:z.string().max(1000)})).max(15)
});
export type Experience=z.infer<typeof ExperienceSchema>;
export function makeExperience(category:Experience['category'],industry:Experience['industry']='other'):Experience{
 const product=category==='cinematic-product',luxury=category==='luxury-brand';
 const name=product?'Product Cinema':luxury?'Atelier Noir':'Business Launch';
 return {id:crypto.randomUUID(),name,category,industry,scene:{object:product?'knot':luxury?'sphere':'torus',metalness:product?0.95:0.7,roughness:product?0.12:0.3,rotationSpeed:0.4,particles:product,scrollMotion:true,background:'#090a10',accent:product?'#ff7957':luxury?'#d6b78b':'#80dbc4'},hero:{eyebrow:product?'BEYOND THE ORDINARY':luxury?'CRAFTED FOR THE EXCEPTIONAL':'YOUR NEXT CHAPTER',headline:product?'Experience every detail.':luxury?'An icon in the making.':'Build something remarkable.',description:product?'A cinematic, interactive product story.':luxury?'An immersive digital identity for the discerning.':'A complete digital home for your business.',cta:product?'Explore the product':luxury?'Discover our story':'Get in touch'},sections:[{id:'story',title:'A new perspective',body:'A crafted experience designed to captivate.'},{id:'details',title:'Made to matter',body:'Every interaction has a purpose.'}]};
}
