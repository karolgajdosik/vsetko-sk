// These are editorially configured source hosts, not a declaration of live availability.
const SOURCE_HOSTS = new Set([
  'nbs.sk', '5penazi.sk', 'www.skp.sk', 'www.slovensko.sk',
  'alternative-fuels-observatory.ec.europa.eu', 'eznamka.sk',
  'beta.skgeodesy.sk', 'rpmn.nbs.sk', 'www.zsdis.sk', 'www.mindop.sk',
  'www.slov-lex.sk', 'www.justice.gov.sk'
]);
export const REPORT_CATEGORIES = Object.freeze({
  outdated: 'Neaktuálna informácia', broken: 'Nefunkčný odkaz', other: 'Iná nepresnosť'
});
export function contentSourceUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !SOURCE_HOSTS.has(url.hostname) || url.username || url.password || url.port) return null;
    return url.href;
  } catch { return null; }
}
export function publicReportPath(value) {
  if (typeof value !== 'string' || !/^\/(?:navody|sprievodca)\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(value)) throw new Error('Nahlásenie musí odkazovať na konkrétny verejný návod.');
  return value;
}
export function reportText({ path, category, step = '', detail = '' }) {
  const route = publicReportPath(path);
  if (!Object.hasOwn(REPORT_CATEGORIES, category)) throw new Error('Vyberte druh problému.');
  if (typeof detail !== 'string' || detail.length > 1200) throw new Error('Popis môže obsahovať najviac 1 200 znakov.');
  if (typeof step !== 'string' || (step !== '' && !/^(?:Krok|Podrobný krok) [1-9][0-9]?$/.test(step))) throw new Error('Neplatné označenie kroku.');
  const clean = detail.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim();
  return ['Podnet k obsahu VŠETKO24.sk', 'Stránka: https://vsetko24.sk' + route,
    'Problém: ' + REPORT_CATEGORIES[category], 'Miesto: ' + (step || 'Celý návod'),
    '', 'Popis:', clean || 'Bez doplňujúceho popisu.', '',
    'Tento podnet bol vytvorený lokálne. Sám sa neodoslal.'].join('\n');
}
export function reportMailto(email, text) {
  if (typeof email !== 'string' || !/^[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)) throw new Error('Neplatný kontakt.');
  if (typeof text !== 'string' || text.length > 1800) throw new Error('Podnet je príliš dlhý.');
  return 'mailto:' + email + '?subject=' + encodeURIComponent('Podnet k obsahu VŠETKO24.sk') + '&body=' + encodeURIComponent(text);
}
