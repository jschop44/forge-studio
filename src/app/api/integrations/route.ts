import {NextResponse} from 'next/server';
// Integration contract for future Growth Lens and LeadFlow connections.
// This endpoint is intentionally read-only and exposes no project data.
export async function GET(){return NextResponse.json({service:'forge-studio',version:'0.1.0',status:'foundation',capabilities:['site-draft','live-preview','html-export'],integrations:{growthLens:'planned',leadFlow:'planned'}})}