// Diagnostic only: an independent GitHub runner probe cannot prove Cloudflare connectivity.
// It never changes the result of the production API health check.
export async function probeOfficialRpo({fetchImpl=globalThis.fetch,ico='31333532',timeoutMs=8000}={}){
 const url=new URL('https://api.statistics.sk/rpo/v1/search');
 url.searchParams.set('identifier',ico);
 try{
  const response=await fetchImpl(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(timeoutMs)});
  if(!response.ok)return {status:'upstream_http_error',detail:'HTTP '+response.status};
  let data;
  try{data=await response.json();}catch{return {status:'invalid_json',detail:'HTTP '+response.status+' with invalid JSON'};}
  const items=Array.isArray(data)?data:Array.isArray(data?.results)?data.results:Array.isArray(data?.items)?data.items:null;
  if(!items)return {status:'invalid_schema',detail:'HTTP '+response.status+' without a results array'};
  const matching=items.some(item=>item&&typeof item==='object'&&(
   String(item.identifier??item.identificationNumber??item.ico??'')===ico||
   (Array.isArray(item.identifiers)&&item.identifiers.some(id=>id?.value===ico))
  ));
  return {status:matching?'ok':'no_matching_record',detail:'HTTP '+response.status+(matching?' with matching IČO':' without matching IČO')};
 }catch(error){
  return {status:'network_error',detail:error?.name||'Error'};
 }
}
