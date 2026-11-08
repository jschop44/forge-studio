import type { Metadata } from 'next';
import './style.css';
export const metadata:Metadata={title:'Forge Studio | Website Builder',description:'Design cinematic, responsive websites'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><a href="/builds" style={{position:"fixed",right:16,top:12,zIndex:50,background:"#18241a",color:"#d2e6b9",padding:"8px 12px",border:"1px solid #465b3d",borderRadius:8,fontSize:12,textDecoration:"none"}}>Build console ↗</a>{children}</body></html>}