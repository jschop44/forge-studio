import {NextResponse} from 'next/server';
import {checkLocalAiReadiness,localAiCapacity} from '../../../../lib/server/local-ai';

export const runtime='nodejs';
export const dynamic='force-dynamic';

// Readiness confirms that Ollama is reachable and the configured model is
// installed. It does NOT imply a successful end-to-end generation.
export async function GET(){
 const [readiness,capacity]=await Promise.all([
  checkLocalAiReadiness(),
  Promise.resolve(localAiCapacity())
 ]);
 return NextResponse.json({
  ready:readiness.ready,
  reason:readiness.reason,
  capacity,
  generationVerified:false
 },{
  status:readiness.ready?200:503,
  headers:{'Cache-Control':'no-store'}
 });
}
