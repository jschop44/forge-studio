'use client';
export default function Error({reset}:{error:Error & {digest?:string};reset:()=>void}){return <main style={{minHeight:'100vh',display:'grid',placeContent:'center',textAlign:'center',gap:20}}><h1>Something went wrong</h1><p>The editor encountered an unexpected error.</p><button onClick={reset}>Try again</button></main>}
