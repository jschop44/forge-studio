'use client';
import {useState} from 'react';
type Summary={total:number;scope:string;reviewPriorities?:{category:string;helpful:number;total:number;action:string}[]};
const categories=['navigation','content','visual','seo','accessibility','conversion'];
export default function LearningMemoryPanel(){
 const [project,setProject]=useState(''),[category,setCategory]=useState(categories[0]),[finding,setFinding]=useState(''),[outcome,setOutcome]=useState('helpful');
 const [summary,setSummary]=useState<Summary|null>(null),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 async function load(){
  const response=await fetch('/api/intelligence/memory?projectId='+encodeURIComponent(project),{cache:'no-store'});
  const data=await response.json();
  if(!response.ok)throw Error(data.error||'Unable to load feedback');
  setSummary(data.summary);
 }
 async function act(save:boolean){
  if(!/^[a-zA-Z0-9_-]{1,100}$/.test(project)){setStatus('Enter a project ID using letters, numbers, underscores or hyphens.');return}
  setBusy(true);setStatus('');
  try{
   if(save){
    if(finding.trim().length<3)throw Error('Describe the result in at least three characters.');
    const response=await fetch('/api/intelligence/memory',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source:'owner-feedback',projectId:project,category,finding:finding.trim(),outcome,recordedAt:new Date().toISOString()})});
    const data=await response.json();if(!response.ok)throw Error(data.error||'Unable to save feedback');
    setFinding('');
   }
   await load();setStatus(save?'Feedback saved.':'Feedback loaded.');
  }catch(error){setStatus(error instanceof Error?error.message:'Feedback unavailable')}
  finally{setBusy(false)}
 }
 return <section aria-labelledby="learning-memory-heading" style={{border:'1px solid #555',borderRadius:12,padding:20,marginTop:24}}>
  <h2 id="learning-memory-heading">Project feedback</h2>
  <p>Record whether a reviewed change helped. Review priorities appear after at least three helpful outcomes and 75% helpful feedback in a category.</p>
  <label>Project ID<input value={project} maxLength={100} onChange={event=>{setProject(event.target.value);setSummary(null)}} placeholder="e.g. my-business-website"/></label>
  <label>Feedback category<select value={category} onChange={event=>setCategory(event.target.value)}>{categories.map(value=><option key={value}>{value}</option>)}</select></label>
  <label>Observed result<textarea value={finding} maxLength={500} rows={3} onChange={event=>setFinding(event.target.value)} placeholder="Describe the change and the outcome you observed"/></label>
  <label>Outcome<select value={outcome} onChange={event=>setOutcome(event.target.value)}><option value="helpful">Helpful</option><option value="unhelpful">Unhelpful</option><option value="unverified">Not yet verified</option></select></label>
  <button disabled={busy} onClick={()=>void act(true)}>Save feedback</button>{' '}<button disabled={busy} onClick={()=>void act(false)}>Load project feedback</button>
  <p role="status">{status}</p>
  {summary&&<><p>{summary.total} recent observations for this project (up to 200).</p>{summary.reviewPriorities?.length?<ul>{summary.reviewPriorities.map(priority=><li key={priority.category}>{priority.action} — {priority.helpful} of {priority.total} outcomes helpful.</li>)}</ul>:<p>More verified helpful feedback is needed before suggesting review priorities.</p>}<p>Priorities guide your review. They do not automatically change a site or train a model.</p></>}
 </section>
}
