import {NextResponse} from 'next/server';
import {checkLocalAiReadiness,localAiCapacity} from '../../../../lib/server/local-ai';

export const runtime='nodejs';
export const dynamic='force-dynamic';

// Readiness checks the available AI binding or local Ollama model.
// Binding presence does NOT prove successful inference or generation.
export async function GET(){
 const [readiness,capacity]=await Promise.all([
  checkLocalAiReadiness(),
  Promise.resolve(localAiCapacity())
 ]);
 return NextResponse.json({
  ready:readiness.ready,
  reason:readiness.reason,
  capacity,
  generationVerified:false,
  verification:'A successful end-to-end generation is required before marking AI production-ready'
 },{
  status:readiness.ready?200:503,
  headers:{'Cache-Control':'no-store'}
 });
}
