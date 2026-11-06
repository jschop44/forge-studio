'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
type Publication={id:string;pageCount:number;createdAt:string;url:string};
type Version={version:number;pageCount:number;createdAt:string};
export default function BusinessPublications(){
 const [items,setItems]=useState<Publication[]>([]),[versions,setVersions]=useState<Record<string,Version[]>>({}),[busy,setBusy]=useState(''),[status,setStatus]=useState('Loading your publications…');
 async function refresh(){
  try{const res=await fetch('/api/business/publish',{cache:'no-store'});const data=await res.json();if(!res.ok)throw Error(data.error||'Unable to load publications');setItems(data.publications||[]);setStatus((data.publications||[]).length?'':'No published business websites yet.')}catch(error){setStatus(error instanceof Error?error.message:'Unable to load publications')}
 }
 useEffect(()=>{void refresh()},[]);
 async function showVersions(id:string){
  setBusy(id);
  try{const res=await fetch('/api/business/publish/'+id+'/versions',{cache:'no-store'});const data=await res.json();if(!res.ok)throw Error(data.error||'Unable to load versions');setVersions(current=>({...current,[id]:data.versions||[]}));setStatus('')}catch(error){setStatus(error instanceof Error?error.message:'Unable to load versions')}finally{setBusy('')}
 }
 async function rollback(id:string,version:number){
  if(!window.confirm('Restore snapshot version '+version+'? This replaces the current page content.'))return;
  setBusy(id);
  try{const res=await fetch('/api/business/publish/'+id+'/rollback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version})});const data=await res.json();if(!res.ok)throw Error(data.error||'Rollback failed');setStatus('Restored version '+version+'. Verify every page.')}catch(error){setStatus(error instanceof Error?error.message:'Rollback failed')}finally{setBusy('')}
 }
 async function unpublish(id:string){
  if(!window.confirm('Permanently unpublish this website and delete its saved snapshots?'))return;
  setBusy(id);
  try{const res=await fetch('/api/business/publish/'+id,{method:'DELETE'});const data=await res.json();if(!res.ok)throw Error(data.error||'Unpublish failed');setStatus('Website unpublished and snapshots removed.');await refresh()}catch(error){setStatus(error instanceof Error?error.message:'Unpublish failed')}finally{setBusy('')}
 }
 return <main style={{maxWidth:900,margin:'4rem auto',padding:'0 1.5rem'}}>
  <p><Link href="/business">← Back to website builder</Link></p>
  <h1>Business website publications</h1>
  <p>Only publications belonging to your signed-in account appear here. Publishing must be enabled on the server.</p>
  <p role="status">{status}</p>
  {items.map(item=><section key={item.id} style={{padding:'1.5rem',margin:'1rem 0',border:'1px solid #888',borderRadius:12}}>
   <h2>Publication {item.id.slice(0,8)}</h2>
   <p>{item.pageCount} pages · {new Date(item.createdAt).toLocaleDateString()}</p>
   <p><a href={item.url} target="_blank" rel="noopener noreferrer">Open published homepage</a></p>
   <button disabled={busy===item.id} onClick={()=>void showVersions(item.id)}>View saved versions</button>{' '}
   <button disabled={busy===item.id} onClick={()=>void unpublish(item.id)}>Unpublish and delete snapshots</button>
   {(versions[item.id]||[]).map(v=><div key={v.version} style={{marginTop:12}}>
    Version {v.version} · {v.pageCount} pages · {new Date(v.createdAt).toLocaleDateString()}{' '}
    <button disabled={busy===item.id} onClick={()=>void rollback(item.id,v.version)}>Restore version {v.version}</button>
   </div>)}
  </section>)}
 </main>;
}
