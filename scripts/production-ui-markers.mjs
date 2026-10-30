// Production HTML may include Astro-scoped attributes on headings.
// Match the rendered heading text, not the exact opening <h1> tag.
export function hasProductionMarker(html,marker){
 if(typeof marker==='string')return html.includes(marker);
 if(!marker||typeof marker.heading!=='string')return false;
 const match=html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
 if(!match)return false;
 const text=match[1].replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
 return text===marker.heading;
}
export function productionMarkerLabel(marker){
 return typeof marker==='string'?marker:'H1 heading: '+marker.heading;
}
