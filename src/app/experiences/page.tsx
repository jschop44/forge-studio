'use client';
import {useEffect,useState} from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {makeExperience,type Experience} from '../../lib/experiences';
import {loadExperiences,saveExperience,deleteExperience} from '../../lib/experience-store';
const ExperienceCanvas=dynamic(()=>import('../../components/ExperienceCanvas'),{ssr:false});
export default function Experiences(){
 const [items,setItems]=useState<Experience[]>([]),[current,setCurrent]=useState<Experience|null>(null),[loaded,setLoaded]=useState(false);
 useEffect(()=>{const existing=loadExperiences();setItems(existing);setCurrent(existing[0]||makeExperience('cinematic-product'));setLoaded(true)},[]);
 function update(patch:Partial<Experience>){setCurrent(p=>p?{...p,...patch}:p)}
 function updateScene(patch:Partial<Experience['scene']>){setCurrent(p=>p?{...p,scene:{...p.scene,...patch}}:p)}
 function updateHero(patch:Partial<Experience['hero']>){setCurrent(p=>p?{...p,hero:{...p.hero,...patch}}:p)}
 function create(category:Experience['category']){setCurrent(makeExperience(category,category==='luxury-brand'?'fashion':category==='business'?'services':'technology'))}
 function save(){if(!current)return;saveExperience(current);setItems(loadExperiences())}
 function remove(){if(!current)return;deleteExperience(current.id);const all=loadExperiences();setItems(all);setCurrent(all[0]||makeExperience('cinematic-product'))}
 if(!loaded||!current)return <main style={{padding:40}}>Loading experiences…</main>;
 return <div className="experience-app"><div className="experience-top"><Link href="/">← Forge Studio</Link><strong>EXPERIENCE LAB</strong><button onClick={save}>Save experience</button></div>
 <div className="experience-grid"><aside className="experience-panel"><p className="eyebrow">GENERATE</p><div className="experience-actions"><button onClick={()=>create('cinematic-product')}>3D product</button><button onClick={()=>create('luxury-brand')}>Luxury brand</button><button onClick={()=>create('business')}>Business</button></div>
 <label>Experience name<input value={current.name} onChange={e=>update({name:e.target.value})}/></label>
 <label>Industry<select value={current.industry} onChange={e=>update({industry:e.target.value as Experience['industry']})}>{['automotive','fashion','jewelry','hospitality','real-estate','technology','services','other'].map(x=><option key={x}>{x}</option>)}</select></label>
 <p className="eyebrow">3D ART DIRECTION</p>
 <label>3D object<select value={current.scene.object} onChange={e=>updateScene({object:e.target.value as Experience['scene']['object']})}>{['knot','sphere','box','torus'].map(x=><option key={x}>{x}</option>)}</select></label>
 <label>Metalness <input type="range" min="0" max="1" step="0.05" value={current.scene.metalness} onChange={e=>updateScene({metalness:Number(e.target.value)})}/></label>
 <label>Roughness <input type="range" min="0" max="1" step="0.05" value={current.scene.roughness} onChange={e=>updateScene({roughness:Number(e.target.value)})}/></label>
 <label>Rotation speed <input type="range" min="0" max="2" step="0.1" value={current.scene.rotationSpeed} onChange={e=>updateScene({rotationSpeed:Number(e.target.value)})}/></label>
 <label>Accent<input type="color" value={current.scene.accent} onChange={e=>updateScene({accent:e.target.value})}/></label>
 <label>Background<input type="color" value={current.scene.background} onChange={e=>updateScene({background:e.target.value})}/></label>
 <label><input type="checkbox" checked={current.scene.particles} onChange={e=>updateScene({particles:e.target.checked})}/> Particle field</label>
 <label><input type="checkbox" checked={current.scene.scrollMotion} onChange={e=>updateScene({scrollMotion:e.target.checked})}/> Scroll motion</label>
 <p className="eyebrow">BRAND STORY</p>
 <label>Eyebrow<input value={current.hero.eyebrow} onChange={e=>updateHero({eyebrow:e.target.value})}/></label>
 <label>Headline<input value={current.hero.headline} onChange={e=>updateHero({headline:e.target.value})}/></label>
 <label>Description<textarea value={current.hero.description} onChange={e=>updateHero({description:e.target.value})}/></label>
 <label>Button text<input value={current.hero.cta} onChange={e=>updateHero({cta:e.target.value})}/></label>
 <p className="eyebrow">SAVED EXPERIENCES</p>{items.map(x=><button key={x.id} onClick={()=>setCurrent(x)}>{x.name}</button>)}<button onClick={remove}>Delete current saved experience</button>
 </aside><div className="experience-preview" style={{background:current.scene.background}}><div className="experience-navigation"><strong>{current.name.toUpperCase()}</strong><span>EXPERIENCE / 001</span></div>
 <div className="experience-hero"><div className="experience-art"><ExperienceCanvas scene={current.scene}/></div><div className="experience-copy"><span>{current.hero.eyebrow}</span><h1>{current.hero.headline}</h1><p>{current.hero.description}</p><a href="#experience-story">{current.hero.cta} ↗</a></div></div>
 {current.sections.map(x=><section id={x.id} key={x.id} className="experience-section"><h2>{x.title}</h2><p>{x.body}</p></section>)}
 <footer>FORGE STUDIO · INTERACTIVE EXPERIENCE PREVIEW</footer></div></div></div>
}
