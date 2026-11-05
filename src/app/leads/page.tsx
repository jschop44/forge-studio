'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
type Lead={id:string;name:string;email:string;message:string;created_at:string;project_id:string};
export default function LeadInbox(){const [leads,setLeads]=useState<Lead[]>([]),[message,setMessage]=useState('Loading lead inbox…');
 useEffect(()=>{fetch('/api/leads/inbox',{credentials:'same-origin'}).then(async r=>{if(!r.ok)throw Error(r.status===401?'Sign in to view leads':'Lead inbox unavailable');const data=await r.json();setLeads(data.leads);setMessage(data.leads.length?'':'No inquiries yet')}).catch(e=>setMessage(e.message))},[]);
 return <main style={{maxWidth:960,margin:'auto',padding:40}}><Link href="/">← Forge Studio</Link><h1>Lead inbox</h1><p>Inquiries submitted through published Forge Studio websites.</p>{message&&<p>{message}</p>}{leads.map(x=><article key={x.id} style={{border:'1px solid #444',padding:22,borderRadius:10,marginBottom:15}}><h2>{x.name}</h2><a href={'mailto:'+encodeURIComponent(x.email)}>{x.email}</a><p>{x.message}</p><small>{new Date(x.created_at).toLocaleString()}</small></article>)}</main>
}
