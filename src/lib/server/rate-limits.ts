import {createHmac} from 'node:crypto';
import {database} from './db';
export async function initializeRateLimits(){const sql=database();await sql`CREATE TABLE IF NOT EXISTS forge_rate_limits(key TEXT PRIMARY KEY,window_start TIMESTAMPTZ NOT NULL DEFAULT now(),hits INTEGER NOT NULL DEFAULT 1)`;}
export async function allowLeadSubmission(ip:string,projectId:string):Promise<boolean>{
 const secret=process.env.AUTH_SECRET;if(!secret||secret.length<32)throw Error('Rate limit secret not configured');
 const key=createHmac('sha256',secret).update('lead:'+projectId+':'+ip).digest('hex');
 const sql=database();
 const rows=await sql`INSERT INTO forge_rate_limits(key,window_start,hits) VALUES(${key},now(),1) ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN forge_rate_limits.window_start<now()-interval '1 hour' THEN 1 ELSE forge_rate_limits.hits+1 END,window_start=CASE WHEN forge_rate_limits.window_start<now()-interval '1 hour' THEN now() ELSE forge_rate_limits.window_start END RETURNING hits`;
 return Number(rows[0]?.hits||999)<=5;
}
