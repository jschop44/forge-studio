import {NextResponse} from 'next/server';
export async function GET(){return NextResponse.json({ok:true,service:'forge-studio',version:'0.2.0',revision:process.env.FORGE_BUILD_REVISION || 'unknown'},{headers:{'Cache-Control':'no-store'}})}
