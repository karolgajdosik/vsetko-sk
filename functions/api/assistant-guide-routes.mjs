// Conservative navigation for explicitly named Slovak legal/financial topics.
// No procedural requirements, fees, deadlines or eligibility are asserted here.
const normalize=value=>String(value??'').toLocaleLowerCase('sk-SK').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();

export function guideNavigationFor(question){
 const q=normalize(question);
 // Do not apply Slovak guidance to questions explicitly scoped to another country.
 if(/\b(?:v|vo|na|podla)\s+(?:cesk\w*|cr|rakusk\w*|nemeck\w*|polsk\w*|madarsk\w*|zahranic\w*)\b/.test(q))return null;
 // Negated topic mentions and technical inheritance are not actionable intents.
 if(/\b(?:nechcem|neriesim|nezaujima)\s+(?:riesit\s+)?(?:hypotek\w*|prepis\w*|dedicsk\w*|dedicstv\w*)\b/.test(q))return null;
 if(/\b(?:java|jave|typescript|programovan\w*|kod\w*)\b/.test(q))return null;

 if(/\bhypotek\w*\b/.test(q)&&/\b(?:porovn\w*|vybav\w*|ziad\w*|splat\w*|bank\w*|urok\w*|ponuk\w*|fixac\w*)\b/.test(q)){
  return {answer:'Pri porovnávaní alebo vybavovaní hypotéky vám pomôžu orientačné návody a kalkulačka. Aktuálne sadzby, poplatky, podmienky a schválenie úveru si overte priamo v banke; výsledky kalkulačky nie sú ponukou ani finančným poradenstvom.',sources:[{title:'Porovnanie hypoték',url:'/navody/porovnanie-hypotek/'},{title:'Porovnanie troch hypoték',url:'/financie/porovnanie-hypotek/'}],mode:'guide-navigation'};
 }
 if(/\b(?:prepis\w*|zmen\w*\s+drzit\w*)\b/.test(q)&&/\b(?:aut[aoeu]|autom|vozidl\w*|automobil\w*)\b/.test(q)){
  return {answer:'Pri prepise auta na Slovensku si pozrite orientačný návod. Konkrétne doklady, lehoty a postup sa môžu líšiť podľa situácie; pred podaním si ich overte v aktuálnych oficiálnych informáciách alebo na príslušnom pracovisku. Nejde o právne poradenstvo.',sources:[{title:'Prepis auta na Slovensku',url:'/navody/prepis-auta/'}],officialSources:[{title:'Ústredný portál verejnej správy',url:'https://www.slovensko.sk/'}],mode:'guide-navigation'};
 }
 if(/\bdedicsk\w*\s+konan\w*\b/.test(q)||(/\bdedicstv\w*\b/.test(q)&&/\b(?:ako|co|postup\w*|vybav\w*|notar\w*|po|konan\w*)\b/.test(q))){
  return {answer:'Pri dedičskom konaní vám môže pomôcť orientačný prehľad portálu. Konkrétne dokumenty, lehoty a postup si overte u príslušného notára alebo v aktuálnych oficiálnych informáciách. Nejde o právne poradenstvo.',sources:[{title:'Dedičské konanie',url:'/navody/dedicske-konanie/'},{title:'Čo vybaviť po úmrtí',url:'/navody/vybavenie-po-umrti/'}],officialSources:[{title:'Ústredný portál verejnej správy',url:'https://www.slovensko.sk/'}],mode:'guide-navigation'};
 }
 return null;
}
