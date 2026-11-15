// Catalogue links to existing tools; it does not store document contents.
export const documentCatalog = [
  { id: 'request', title: 'Všeobecná žiadosť', category: 'urady', categoryLabel: 'Úrady a osobné veci', description: 'Pripravte vlastný text žiadosti s adresátom, predmetom a podpisom.', format: 'Word (.docx), tlač alebo PDF', href: '#doc-editor', template: 'request', keywords: 'ziadost list urad podanie' },
  { id: 'statement', title: 'Čestné vyhlásenie', category: 'urady', categoryLabel: 'Úrady a osobné veci', description: 'Všeobecný vzor na uvedenie vašich vlastných pravdivých skutočností.', format: 'Word (.docx), tlač alebo PDF', href: '#doc-editor', template: 'statement', keywords: 'cestne vyhlasenie potvrdenie' },
  { id: 'handover', title: 'Všeobecný odovzdávací protokol', category: 'byvanie', categoryLabel: 'Bývanie a odovzdanie', description: 'Zaznamenajte odovzdanie vecí medzi dvoma stranami vlastným textom.', format: 'Word (.docx), tlač alebo PDF', href: '#doc-editor', template: 'handover', keywords: 'odovzdanie prevzatie veci protokol' },
  { id: 'moving', title: 'Odovzdanie bytu alebo domu', category: 'byvanie', categoryLabel: 'Bývanie a odovzdanie', description: 'Podrobný protokol so stavmi meračov, kľúčmi, inventárom a vadami.', format: 'Vyplniteľný formulár / tlač', href: '/stahovanie/#formular-odovzdania', keywords: 'stahovanie prenajom kluce merace nehnutelnost' },
  { id: 'claim', title: 'Reklamačný list', category: 'nakupy', categoryLabel: 'Nákupy a reklamácie', description: 'Sprievodný list k reklamácii tovaru s popisom vady a vaším návrhom.', format: 'Text na kopírovanie / tlač', href: '/generator-reklamacie/', keywords: 'reklamacia tovar obchodnik vada nakup' }
];

export function normalizeDocumentSearch(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('sk-SK').trim();
}

export function matchesDocumentSearch(text, query) {
  const haystack = normalizeDocumentSearch(text);
  return normalizeDocumentSearch(query).split(/\s+/).filter(Boolean).every(term => haystack.includes(term));
}
