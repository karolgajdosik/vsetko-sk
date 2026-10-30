// Pure diagnostic classification: a stale RPO cache is useful to visitors but is never live API health.
export function evaluateApiResponse(path,status,data,check){
  let valid=false;
  if(status>=200&&status<300){
    try{valid=Boolean(check(data));}catch{valid=false;}
  }
  if(valid)return {ok:true,reason:''};
  if(path==='/api/rpo'&&status===503){
    const upstream=Number.isInteger(data?.upstreamStatus)&&data.upstreamStatus>=400&&data.upstreamStatus<=599?' (upstream HTTP '+data.upstreamStatus+')':(['TimeoutError','AbortError','TypeError'].includes(data?.upstreamFailureType)?' (upstream '+data.upstreamFailureType+')':'');
    const date=data?.stale===true&&typeof data.checkedAt==='string'&&!Number.isNaN(Date.parse(data.checkedAt))?data.checkedAt:null;
    return {ok:false,reason:date
      ?'HTTP 503: RPO live lookup unavailable'+upstream+'; verified cached data from '+date+' marked stale'
       :'HTTP 503: RPO live lookup unavailable'+upstream+'; no verified cached result'};
  }
  if(status>=200&&status<300)return {ok:false,reason:'HTTP '+status+': unexpected response schema'};
  if(status===429)return {ok:false,reason:'HTTP 429: rate limited'};
  return {ok:false,reason:'HTTP '+status};
}
