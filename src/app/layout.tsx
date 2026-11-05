import type { Metadata } from 'next';
import './style.css';
export const metadata:Metadata={title:'Forge Studio | Website Builder',description:'Design cinematic, responsive websites'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}