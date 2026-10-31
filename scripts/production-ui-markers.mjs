// Production HTML may include Astro-scoped attributes on headings.
// Match the rendered heading text, not the exact opening <h1> tag.
export function hasProductionMarker(html,marker){
 if(typeof marker==='string')return html.includes(marker);
 if(marker&&Array.isArray(marker.practicalTitles)){
  // Require a real table-of-contents link and headings inside the rendered section.
  // Do not accept titles found only in embedded JSON or elsewhere in the page.
  const navs=[...html.matchAll(/<nav\\b[^>]*>([\\s\\S]*?)<\\/nav>/gi)];
  if(!navs.some(match=>/\\bhref=["']#prakticke-tipy["']/.test(match[1])))return false;
  const section=html.match(/<section\\b[^>]*\\bid=["']prakticke-tipy["'][^>]*>([\\s\\S]*?)<\\/section>/i);
  if(!section)return false;
  const text=fragment=>fragment.replace(/<[^>]*>/g,' ').replace(/&(?:amp|lt|gt|quot|apos|#39);/g,entity=>({ '&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&#39;':"'" })[entity]).replace(/\\s+/g,' ').trim();
  const headings=[...section[1].matchAll(/<h3\\b[^>]*>([\\s\\S]*?)<\\/h3>/gi)].map(match=>text(match[1]));
  const paragraphs=[...section[1].matchAll(/<p\\b[^>]*>([\\s\\S]*?)<\\/p>/gi)].map(match=>text(match[1]));
  return headings.length===marker.practicalTitles.length && headings.every((title,index)=>title===marker.practicalTitles[index]) && paragraphs.length===headings.length && paragraphs.every(body=>body.length>40);
 }
 if(!marker||typeof marker.heading!=='string')return false;
 const match=html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
 if(!match)return false;
 const text=match[1].replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
 return text===marker.heading;
}
export function productionMarkerLabel(marker){
 return typeof marker==='string'?marker:Array.isArray(marker?.practicalTitles)?'Practical tips section and navigation ('+marker.practicalTitles.length+' tips)':'H1 heading: '+marker.heading;
}
