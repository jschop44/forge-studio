'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
type Asset={id:string;name:string;mime_type:string;created_at:string};
export default function AssetLibrary(){
 const [items,setItems]=useState<Asset[]>([]),[file,setFile]=useState<File|null>(null),[status,setStatus]=useState('');
 async function refresh(){const r=await fetch('/api/assets',{credentials:'same-origin'});if(!r.ok)throw Error(r.status===401?'Sign in to view assets':'Unable to load assets');const data=await r.json();setItems(data.assets)}
 useEffect(()=>{refresh().catch(e=>setStatus(e.message))},[]);
 async function upload(){if(!file)return;setStatus('Uploading…');try{const form=new FormData();form.append('file',file);const r=await fetch('/api/assets',{method:'POST',body:form,credentials:'same-origin'});const data=await r.json();if(!r.ok)throw Error(data.error||'Upload failed');setStatus('Uploaded '+data.name);setFile(null);await refresh()}catch(e){setStatus(e instanceof Error?e.message:'Upload failed')}}
 return <main style={{maxWidth:920,margin:'auto',padding:40}}><Link href="/">← Forge Studio</Link><h1>Asset library</h1><p>Private project assets. Maximum 12 MB per file. Supported: GLB, glTF, PNG, JPEG, WebP and AVIF.</p><label>Choose an asset<input type="file" accept=".glb,.gltf,image/png,image/jpeg,image/webp,image/avif" onChange={e=>setFile(e.target.files?.[0]||null)}/></label><button disabled={!file} onClick={upload}>Upload asset</button><p role="status">{status}</p><h2>Your files</h2>{items.length===0&&<p>No files found.</p>}{items.map(x=><article key={x.id} style={{padding:15,borderBottom:'1px solid #444'}}><strong>{x.name}</strong> <small>{x.mime_type}</small> <a href={'/api/assets/'+x.id} target="_blank" rel="noreferrer">View private file</a></article>)}</main>
}
