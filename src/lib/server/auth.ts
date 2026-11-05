import {SignJWT,jwtVerify} from 'jose';
import {randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers';
const cookieName='forge_session';
function secret(){const key=process.env.AUTH_SECRET;if(!key||key.length<32)throw new Error('AUTH_SECRET must be at least 32 characters');return new TextEncoder().encode(key)}
export function hashPassword(password:string){if(password.length<12||password.length>256)throw new Error('Password must be 12–256 characters');const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(password,salt,64).toString('hex')}
export function verifyPassword(password:string,stored:string){try{const [salt,hash]=stored.split(':');const expected=Buffer.from(hash,'hex');const actual=scryptSync(password,salt,expected.length);return expected.length===actual.length&&timingSafeEqual(expected,actual)}catch{return false}}
export async function createSession(userId:string){return new SignJWT({sub:userId}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('7d').sign(secret())}
export async function currentUserId(){try{const token=(await cookies()).get(cookieName)?.value;if(!token)return null;const result=await jwtVerify(token,secret(),{algorithms:['HS256']});return typeof result.payload.sub==='string'?result.payload.sub:null}catch{return null}}
export const sessionCookie=cookieName;
