export const REMINDER_DAYS = [0, 1, 7, 14, 30, 60];
export const deadlineTemplates = {
  stk: { title: 'Koniec platnosti STK / EK', help: 'Presný dátum prevezmite z dokladu o kontrole alebo z overeného záznamu vozidla. Predloha neurčuje zákonnú periodicitu.', next: 'Skontrolujte doklady vozidla, predchádzajúce protokoly a objednajte si kontrolu podľa vlastnej potreby.', href: '/navody/stk-priprava/' },
  pzp: { title: 'Úhrada alebo obnova PZP', help: 'Dátum úhrady a výročia overte v poistnej zmluve. Pri výpovedi si osobitne overte lehotu a spôsob doručenia.', next: 'Pripravte poistnú zmluvu, platobný predpis a podmienky obnovy. Výpovednú lehotu overte v konkrétnej zmluve.', href: '/navody/povinne-zmluvne-poistenie/' },
  service: { title: 'Servis vozidla', help: 'Zvoľte vlastný termín podľa servisného plánu výrobcu a aktuálneho nájazdu.', next: 'Pripravte servisnú históriu, nájazd a zoznam závad; overte rozsah a cenu s vybraným servisom.', href: '/auto/moje-auto/' },
  identity: { title: 'Koniec platnosti občianskeho preukazu', help: 'Dátum odpíšte z dokladu; prípravu výmeny si môžete uložiť ako samostatný skorší termín.', next: 'Skontrolujte aktuálny postup výmeny a potrebné podklady na oficiálnom zdroji v návode.', href: '/navody/ako-vybavit-obciansky-preukaz/' },
  passport: { title: 'Koniec platnosti cestovného pasu', help: 'Dátum odpíšte z dokladu. Požadovanú zostávajúcu platnosť pri cestovaní overte pre cieľovú krajinu.', next: 'Pripravte si doklady na výmenu a overte podmienky vstupu do cieľovej krajiny.', href: '/navody/vymena-cestovneho-pasu/' },
  driving: { title: 'Koniec platnosti vodičského preukazu', help: 'Dátum odpíšte z dokladu; osobitné zdravotné alebo profesijné povinnosti overte na príslušnom úrade.', next: 'Overte postup výmeny a prípadné osobitné podmienky na príslušnom úrade.', href: '/urady/' },
  insurance: { title: 'Kontrola poistenia domácnosti', help: 'Zvoľte dátum podľa vlastnej poistnej zmluvy alebo plánovanej revízie krytia.', next: 'Pripravte zmluvu, poistné sumy, spoluúčasť a výluky; porovnávajte rovnaký rozsah krytia.', href: '/porovnavace/' },
  mortgage: { title: 'Koniec fixácie úveru', help: 'Dátum a podmienky overte v banke alebo zmluve. Ponuku a možné poplatky posúďte samostatne.', next: 'Pripravte oznámenie banky, zostatok úveru, novú sadzbu a poplatky; prepočítajte dopad na rozpočet.', href: '/navody/refinancovanie-uveru/' },
  contract: { title: 'Kontrola obnovy zmluvy', help: 'Skontrolujte dátum obnovy, výpovednú lehotu a požadovaný spôsob doručenia v konkrétnej zmluve.', next: 'Pripravte zmluvu, viazanosť, poplatky a spôsob doručenia prípadnej výpovede.', href: '/dokumenty/' },
};
export function validDeadlineDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01' || value > '9999-12-31') return false;
  const date = new Date(value + 'T12:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function normalizeDeadline(value) {
  if (!value || typeof value !== 'object' || typeof value.id !== 'string' || !value.id || value.id.length > 120 || typeof value.title !== 'string' || !value.title.trim() || value.title.length > 120 || !validDeadlineDate(value.date)) return null;
  return { id: value.id, title: value.title.trim(), date: value.date, type: Object.hasOwn(deadlineTemplates, value.type) ? value.type : '', reminderDays: REMINDER_DAYS.includes(value.reminderDays) ? value.reminderDays : 0 };
}
export function deadlineTiming(date, today) {
  if (!validDeadlineDate(date) || !validDeadlineDate(today)) return null;
  const days = Math.round((Date.parse(date + 'T12:00:00Z') - Date.parse(today + 'T12:00:00Z')) / 86400000);
  return { days, label: days < 0 ? 'Po termíne: ' + Math.abs(days) + ' dní' : days === 0 ? 'Dnes' : days === 1 ? 'Zajtra' : 'O ' + days + ' dní', urgent: days <= 30 };
}
export const escapeIcs = value => String(value).replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
export function foldIcsLine(line) {
  const encoder = new TextEncoder(); let out = '', part = '', bytes = 0;
  for (const ch of line) { const size = encoder.encode(ch).length; if (bytes + size > 75) { out += part + '\r\n'; part = ' '; bytes = 1; } part += ch; bytes += size; }
  return out + part;
}
export function createDeadlineCalendar(values, now = new Date()) {
  const deadlines = values.slice(0, 500).map(normalizeDeadline).filter(Boolean);
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//VSETKO24//Calendar SK//EN', 'CALSCALE:GREGORIAN'];
  for (const d of deadlines) {
    const template = deadlineTemplates[d.type];
    const next = new Date(d.date + 'T12:00:00Z'); next.setUTCDate(next.getUTCDate() + 1);
    // Date 9999-12-31 cannot have a four-digit next day: omit DTEND (one-day default).
    lines.push('BEGIN:VEVENT', 'UID:' + encodeURIComponent(d.id) + '@vsetko24.sk', 'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + d.date.replaceAll('-', ''));
    if (next.getUTCFullYear() <= 9999) lines.push('DTEND;VALUE=DATE:' + next.toISOString().slice(0, 10).replaceAll('-', ''));
    lines.push('SUMMARY:' + escapeIcs(d.title), 'DESCRIPTION:' + escapeIcs(template?.next || 'Pripravte si vlastné podklady a overte presný postup a termín.'));
    if (template?.href) lines.push('URL:https://vsetko24.sk' + template.href);
    if (d.reminderDays > 0) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:-P' + d.reminderDays + 'D', 'DESCRIPTION:' + escapeIcs('Príprava: ' + d.title), 'END:VALARM');
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldIcsLine).join('\r\n') + '\r\n';
}
