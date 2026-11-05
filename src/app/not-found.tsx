import Link from 'next/link';
export default function NotFound(){return <main style={{minHeight:'100vh',display:'grid',placeContent:'center',textAlign:'center',gap:20}}><h1>Page not found</h1><p>The page you're looking for isn't here.</p><Link href="/" style={{color:'#ff9a78'}}>Return to Forge Studio</Link></main>}
