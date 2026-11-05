import {createHmac,timingSafeEqual} from 'node:crypto';
export function verifySignedEvent(secret:string,timestamp:string,signature:string,body:string,now=Date.now()):boolean{
 if(secret.length<32||!/^[0-9]{13}$/.test(timestamp)||Math.abs(now-Number(timestamp))>300000||!/^[a-f0-9]{64}$/i.test(signature)||body.length>16000)return false;
 const expected=createHmac('sha256',secret).update(timestamp+'.'+body).digest();
 const supplied=Buffer.from(signature,'hex');return supplied.length===expected.length&&timingSafeEqual(expected,supplied);
}
export function signEvent(secret:string,timestamp:string,body:string):string{return createHmac('sha256',secret).update(timestamp+'.'+body).digest('hex')}
