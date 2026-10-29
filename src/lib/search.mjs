// Pure, offline search ranking shared by the portal and unit tests.
export const normalizeSearch = value => String(value ?? '').toLocaleLowerCase('sk-SK').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
const synonyms={obciansky:['obcianka','doklad'],obcianka:['obciansky','doklad'],pas:['cestovny'],hypoteka:['uver','byvanie'],auto:['vozidlo'],vozidlo:['auto'],stk:['technicka'],nabijanie:['elektromobil'],dedicstvo:['notar'],umrtie:['pozostalost'],zivnost:['podnikanie'],plat:['mzda'],mzda:['plat']};
const stop=new Set(['som','chcem','ako','mam','potrebujem','kde','mozem','sa','si','na','do','pre','pri','je','a','v','s','mi','to','ten','ta','co','ked']);
const distanceOne=(a,b)=>{if(Math.abs(a.length-b.length)>1)return false;let i=0,j=0,edits=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue}if(++edits>1)return false;if(a.length>b.length)i++;else if(a.length<b.length)j++;else{i++;j++;}}return edits+(a.length-i)+(b.length-j)<=1;};
export function searchPortal(items,query,limit=25){
 const words=[...new Set(normalizeSearch(query).split(' ').filter(w=>w.length>1&&!stop.has(w)))].slice(0,12);
 if(!words.length)return [];
 return items.map(item=>{
  const title=normalizeSearch(item.title),description=normalizeSearch(item.description),keywords=normalizeSearch(item.keywords);
  const fields=[title,keywords,description];let score=0,found=0;
  for(const word of words){
   const variants=[word,...(synonyms[word]||[])];
   let best=0;
   for(const variant of variants){
    if(title.split(' ').includes(variant))best=Math.max(best,12);
    else if(title.includes(variant))best=Math.max(best,8);
    if(keywords.split(' ').includes(variant))best=Math.max(best,5);
    else if(keywords.includes(variant)&&variant.length>=4)best=Math.max(best,3);
    if(description.split(' ').includes(variant))best=Math.max(best,2);
    else if(description.includes(variant)&&variant.length>=4)best=Math.max(best,1);
   }
   if(!best&&word.length>=4){
    const tokens=fields.flatMap(field=>field.split(' ')).filter(t=>t.length>=3);
    if(tokens.some(t=>distanceOne(word,t)))best=1;
   }
   if(best){found++;score+=best;}
  }
  return {item,score,found};
 }).filter(hit=>hit.found>0).sort((a,b)=>b.found-a.found||b.score-a.score||a.item.title.localeCompare(b.item.title,'sk')).slice(0,Math.max(0,limit));
}
