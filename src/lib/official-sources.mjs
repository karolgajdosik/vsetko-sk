// Exact official hosts only. Never trust arbitrary API-supplied links in the chat UI.
const OFFICIAL_HOSTS=new Set(['www.slovensko.sk','nbs.sk','www.justice.gov.sk']);

export function trustedOfficialUrl(value){
 if(typeof value!=='string')return null;
 try{
  const url=new URL(value);
  if(url.protocol!=='https:'||!OFFICIAL_HOSTS.has(url.hostname)||url.username||url.password||url.port)return null;
  return url.href;
 }catch{return null;}
}
