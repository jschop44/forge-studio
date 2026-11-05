import Link from 'next/link';import BlockEditor from '../../components/BlockEditor';
export default function Composer(){return <main className="composer-shell"><nav className="composer-nav"><Link href="/">← Forge Studio</Link><b>Page composer · experimental</b></nav><BlockEditor/></main>}
