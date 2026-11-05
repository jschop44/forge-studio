'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
type Job={id:string;kind:string;source:string;status:string;created_at:string;last_error:string|null;result?:{summary?:string;data?:Record<string,unknown>}|null};
const kinds=['lead-enrichment','website-audit','site-plan','site-generation','quality-review','publish-review'];
export default function IntelligenceJobs(){
 const [jobs,setJobs]=useState<Job[]>([]),[kind,setKind]=useState(kinds[0]),[website,setWebsite]=useState(''),[status,setStatus]=useState('');
 async function refresh(){const r=await fetch('/api/agents/jobs');if(!r.ok)throw Error(r.status===401?'Sign in to view jobs':'Queue unavailable');setJobs((await r.json()).jobs)}
 useEffect(()=>{refresh().catch(e=>setStatus(e.message))},[]);
 async function create(){try{const payload=website?{website}:{};const r=await fetch('/api/agents/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,source:'forge-studio',payload})});const data=await r.json();if(!r.ok)throw Error(data.error);setStatus('Job queued for evaluation');await refresh()}catch(e){setStatus(e instanceof Error?e.message:'Unable to queue')}}
 async function evaluate(id:string){try{const r=await fetch('/api/agents/jobs/'+id,{method:'POST'});const data=await r.json();if(!r.ok)throw Error(data.error);setStatus(data.decision.reason);await refresh()}catch(e){setStatus(e instanceof Error?e.message:'Unable to evaluate')}}
 return <main style={{maxWidth:960,margin:'auto',padding:40}}><Link href="/">← Forge Studio</Link><h1>Intelligence jobs</h1><p>Tenant-scoped task planning with approval gates. This is not an autonomous background worker; tasks must be evaluated explicitly.</p><label>Agent task <select value={kind} onChange={e=>setKind(e.target.value)}>{kinds.map(x=><option key={x}>{x}</option>)}</select></label><label>Website URL <input value={website} onChange={e=>setWebsite(e.target.value)} placeholder="https://example.com"/></label><button onClick={create}>Queue task</button><p role="status">{status}</p><h2>Recent tasks</h2>{jobs.map(x=><article key={x.id} style={{padding:20,border:'1px solid #444',marginBottom:10,borderRadius:8}}><strong>{x.kind}</strong><p>{x.source} · {x.status}</p>{x.last_error&&<p>{x.last_error}</p>}{x.result&&<details><summary>{x.result.summary||'Agent result'}</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(x.result.data,null,2)}</pre></details>}{x.status==='pending'&&<button onClick={()=>evaluate(x.id)}>Evaluate policy</button>}</article>)}</main>
}
