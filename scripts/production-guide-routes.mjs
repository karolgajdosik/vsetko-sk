// Keep the repaired legacy search destinations under live production monitoring.
// The search ranking itself is verified separately by tests/search.test.mjs.
export const repairedSearchTargets=Object.freeze([
 ['Kúpa ojazdeného auta','kontrola-vozidla-pred-kupou'],
 ['Prepis vozidla','prepis-auta'],
 ['STK a emisná kontrola','stk-priprava'],
 ['Elektromobilita','nabijanie-elektromobilu'],
 ['Občiansky preukaz','ako-vybavit-obciansky-preukaz'],
 ['Cestovný pas','vymena-cestovneho-pasu'],
 ['Trvalý pobyt','zmena-trvaleho-pobytu'],
 ['Živnosť','zacatie-podnikania'],
 ['Dedičstvo','dedicske-konanie']
]);

export function getRepairedGuideRoutes(search,guides){
 const urls=new Set(search.map(item=>item.url));
 const bySlug=new Map(guides.map(guide=>[guide.slug,guide]));
 return repairedSearchTargets.map(([query,slug])=>{
  const path='/navody/'+slug+'/';
  if(!urls.has(path))throw new Error('Missing repaired search destination for '+query+': '+path);
  const guide=bySlug.get(slug);
  if(!guide)throw new Error('Missing published guide for '+query+': '+slug);
  return {path,markers:['<h1>'+guide.title+'</h1>']};
 });
}
