import {runtimeValue} from '../../../../lib/server/runtime-env';
import { NextRequest, NextResponse } from "next/server";
import { currentUserId } from "../../../../lib/server/auth";
import { sameOrigin } from "../../../../lib/server/request-security";
import { database } from "../../../../lib/server/db";
import { LearningObservationSchema, summarizeStoredLearningObservations } from "../../../../lib/learning-observations";
export const runtime = "nodejs";
const disabled = () => runtimeValue('ENABLE_FORGE_LEARNING_MEMORY') !== "true";
export async function POST(req: NextRequest) {
  if (disabled()) return NextResponse.json({error:"Learning memory disabled"},{status:503});
  if (!sameOrigin(req)) return NextResponse.json({error:"Origin rejected"},{status:403});
  const owner = await currentUserId();
  if (!owner) return NextResponse.json({error:"Unauthorized"},{status:401});
  try {
    const raw = await req.text();
    if (raw.length > 3000) return NextResponse.json({error:"Payload too large"},{status:413});
    const parsed = LearningObservationSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return NextResponse.json({error:"Invalid observation"},{status:400});
    const sql = database();
    await sql`INSERT INTO forge_learning_observations(id,owner_id,project_key,observation) VALUES(${crypto.randomUUID()}::uuid,${owner}::uuid,${parsed.data.projectId},${JSON.stringify(parsed.data)}::jsonb)`;
    await sql`DELETE FROM forge_learning_observations WHERE owner_id=${owner}::uuid AND id NOT IN (SELECT id FROM forge_learning_observations WHERE owner_id=${owner}::uuid ORDER BY created_at DESC,id DESC LIMIT 1000)`;
    return NextResponse.json({ok:true},{status:201});
  } catch { return NextResponse.json({error:"Learning memory unavailable"},{status:503}); }
}
export async function GET(req: NextRequest) {
  if (disabled()) return NextResponse.json({error:"Learning memory disabled"},{status:503});
  const owner = await currentUserId();
  if (!owner) return NextResponse.json({error:"Unauthorized"},{status:401});
  const project = new URL(req.url).searchParams.get("projectId");
  if (project && !/^[a-zA-Z0-9_-]{1,100}$/.test(project)) return NextResponse.json({error:"Invalid projectId"},{status:400});
  try {
    const sql = database();
    const rows = project
      ? await sql`SELECT id,observation,created_at FROM forge_learning_observations WHERE owner_id=${owner}::uuid AND project_key=${project} ORDER BY created_at DESC LIMIT 200`
      : await sql`SELECT id,observation,created_at FROM forge_learning_observations WHERE owner_id=${owner}::uuid ORDER BY created_at DESC LIMIT 200`;
    return NextResponse.json({observations:rows,summary:summarizeStoredLearningObservations(rows.map(row=>row.observation))},{headers:{"Cache-Control":"no-store"}});
  } catch { return NextResponse.json({error:"Learning memory unavailable"},{status:503}); }
}
export async function DELETE(req: NextRequest) {
  if (disabled()) return NextResponse.json({error:"Learning memory disabled"},{status:503});
  if (!sameOrigin(req)) return NextResponse.json({error:"Origin rejected"},{status:403});
  const owner = await currentUserId();
  if (!owner) return NextResponse.json({error:"Unauthorized"},{status:401});
  const project = new URL(req.url).searchParams.get("projectId");
  const all = new URL(req.url).searchParams.get("all") === "true";
  if (!all && (!project || !/^[a-zA-Z0-9_-]{1,100}$/.test(project))) return NextResponse.json({error:"Valid projectId required"},{status:400});
  try {
    const sql = database();
    if (all) await sql`DELETE FROM forge_learning_observations WHERE owner_id=${owner}::uuid`;
    else await sql`DELETE FROM forge_learning_observations WHERE owner_id=${owner}::uuid AND project_key=${project}`;
    return NextResponse.json({ok:true,projectId:all ? null : project,all});
  } catch { return NextResponse.json({error:"Learning memory unavailable"},{status:503}); }
}
