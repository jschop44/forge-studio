/** Read-only capture redirect policy. Only exact authorized origin is accepted. */
export function isAuthorizedCaptureDestination(destination,authorizedOrigin){
 try{
  const url=new URL(destination);
  const origin=new URL(authorizedOrigin);
  return url.protocol==='https:'&&origin.protocol==='https:'&&url.origin===origin.origin&&!url.username&&!url.password&&!url.port;
 }catch{return false}
}
