import {NextResponse} from 'next/server';
export async function POST(){return NextResponse.json({error:'Business publishing is temporarily unavailable; use HTML export.'},{status:503})}
