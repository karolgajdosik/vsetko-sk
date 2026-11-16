export const METRICS_KEY='v24-completions-v6';
export const TOOL_NAMES=Object.freeze({health:'Kontrola financií',comparison:'Porovnanie rozhodnutí',plan:'Prijatý plán',contracts:'Uložená zmluva',annual:'Ročný výdavok',csv:'Import rozpočtu'});
export function normalizeMetrics(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['version','enabled','counts'].includes(k))||value.version!==1||typeof value.enabled!=='boolean'||!value.counts||typeof value.counts!=='object'||Array.isArray(value.counts))throw Error('Neplatné miestne počítadlá.');
 const counts={};for(const [k,n] of Object.entries(value.counts)){if(!Object.hasOwn(TOOL_NAMES,k)||!Number.isSafeInteger(n)||n<0||n>1000000)throw Error('Neplatné počítadlo.');counts[k]=n;}
 return {version:1,enabled:value.enabled,counts};
}
export const emptyMetrics=()=>({version:1,enabled:false,counts:{}});
export function readMetrics(storage){const raw=storage.getItem(METRICS_KEY);return raw===null?emptyMetrics():normalizeMetrics(JSON.parse(raw));}
export function recordCompletion(storage,tool){if(!Object.hasOwn(TOOL_NAMES,tool))return false;const data=readMetrics(storage);if(!data.enabled)return false;data.counts[tool]=Math.min(1000000,(data.counts[tool]??0)+1);storage.setItem(METRICS_KEY,JSON.stringify(data));return true;}
