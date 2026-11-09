import {NextResponse} from 'next/server';
import {ecosystemReadiness} from '../../../lib/server/ecosystem-readiness';
export async function GET(){const readiness=ecosystemReadiness();return NextResponse.json({service:'forge-studio',version:'1',capabilities:['site-draft','live-preview','html-export','signed-events','six-stage-agent-pipeline'],integrations:{growthLens:readiness.status,leadFlow:readiness.status},readiness},{headers:{'Cache-Control':'no-store'}})}
