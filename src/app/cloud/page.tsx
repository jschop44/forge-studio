'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {readProjects,saveProject,type Project} from '../../lib/projects';
type Remote={id:string;site:{name:string};revision:number;updated_at:string};
export default function CloudProjects(){
 const [local,setLocal]=useState<Project[]>([]),[remote,setRemote]=useState<Remote[]>([]),[status,setStatus]=useState(''),[urls,setUrls]=useState<Record<string,string>>({});
 useEffect(()=>{setLocal(readProjects());refresh().catch(e=>setStatus(e.message))},[]);
 async function refresh(){const r=await fetch('/api/projects');if(!r.ok)throw Error(r.status===401?'Sign in to access cloud projects':'Database unavailable');setRemote((await r.json()).projects)}
 async function upload(project:Project){try{const site={...project.site,id:/^[a-f0-9-]{36}$/i.test(project.site.id)?project.site.id:crypto.randomUUID()};const r=await fetch('/api/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(site)});const data=await r.json();if(!r.ok)throw Error(data.error);saveProject(site);setLocal(readProjects());setStatus('Saved '+site.name+' to your account');await refresh()}catch(e){setStatus(e instanceof Error?e.message:'Save failed')}}
 async function publish(id:string){try{const r=await fetch('/api/publish',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId:id})});const data=await r.json();if(!r.ok)throw Error(data.error);setUrls(u=>({...u,[id]:data.url}));setStatus('Published successfully. Quality score '+data.quality.score+'/100')}catch(e){setStatus(e instanceof Error?e.message:'Publishing failed')}}
 return <main style={{maxWidth:1050,margin:'auto',padding:40}}><Link href="/">← Forge Studio</Link><h1>Cloud projects and publishing</h1><p>Sign in, save local projects to your private account, and publish after passing the quality gate. Publishing is disabled by default until the database and deployment are configured.</p><p role="status">{status}</p><h2>Local drafts</h2>{local.map(p=><article key={p.id} style={{padding:16,borderBottom:'1px solid #444'}}><strong>{p.site.name}</strong> <button onClick={()=>upload(p)}>Save to cloud</button></article>)}<h2>Cloud projects</h2>{remote.map(p=><article key={p.id} style={{padding:16,borderBottom:'1px solid #444'}}><strong>{p.site.name}</strong> <small>Revision {p.revision}</small> <button onClick={()=>publish(p.id)}>Publish</button> {urls[p.id]&&<a href={urls[p.id]} target="_blank" rel="noreferrer">Open published site</a>}</article>)}</main>
}
