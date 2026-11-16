const money = new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' });
export const documentHeadings = {
  request: 'Žiadosť', statement: 'Čestné vyhlásenie', handover: 'Odovzdávací protokol',
  termination: 'Výpoveď služby', complaint: 'Reklamácia'
};
export function caseDocumentDraft(item) {
  if (!item || !['car', 'home', 'savings'].includes(item.kind) || typeof item.title !== 'string') throw new Error('Vyberte platnú situáciu.');
  const values = item.values || {};
  const amount = key => typeof values[key] === 'number' && Number.isFinite(values[key]) && values[key] >= 0 ? money.format(values[key]) : null;
  const lines = ['V súvislosti so situáciou „' + item.title.slice(0, 120) + '“ žiadam o poskytnutie informácií a podmienok.'];
  if (item.kind === 'car' || item.kind === 'home') {
    if (amount('purchasePrice') !== null) lines.push('Zadaná predpokladaná kúpna cena: ' + amount('purchasePrice') + '.');
    if (amount('downPayment') !== null) lines.push('Zadané vlastné prostriedky: ' + amount('downPayment') + '.');
    lines.push('Prosím o uvedenie všetkých súvisiacich poplatkov a podkladov potrebných na ďalší postup.');
  } else {
    lines.push('Prosím o predloženie podmienok služby vrátane pravidelných a jednorazových poplatkov, viazanosti a spôsobu ukončenia.');
  }
  return { type: 'request', subject: 'Žiadosť o informácie – ' + item.title.slice(0, 120), body: lines.join('\n') };
}
export function documentMissingFields(kind, value) {
  const fields = ['sender', 'body'];
  if (['termination', 'complaint'].includes(kind)) fields.push('recipient', 'subject', 'date', 'reference');
  return fields.filter(key => typeof value[key] !== 'string' || !value[key].trim());
}
export function documentTemplate(kind) {
  if (kind === 'termination') return {
    subject: 'Výpoveď služby', body: 'Žiadam o ukončenie uvedenej služby v termíne a spôsobom podľa príslušnej zmluvy.\nProsím o písomné potvrdenie prijatia výpovede, dátumu ukončenia a prípadného konečného vyúčtovania.\nDoplňte názov služby, identifikáciu zmluvy a požadovaný termín. Pred odoslaním overte výpovednú lehotu a spôsob doručenia.'
  };
  if (kind === 'complaint') return {
    subject: 'Reklamácia tovaru alebo služby', body: 'Opis reklamovaného tovaru alebo služby:\nDátum nákupu alebo poskytnutia:\nOpis zistenej vady a dátum jej zistenia:\nPožadovaný spôsob vybavenia:\nPriložené podklady:\nProsím o potvrdenie prijatia reklamácie. Pred odoslaním nahraďte všetky riadky konkrétnymi údajmi.'
  };
  return { subject: '', body: '' };
}
