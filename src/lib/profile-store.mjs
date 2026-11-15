// Profile data is deliberately limited to catalogue IDs; no free-text personal data.
export const PROFILE_KEY = 'v24-local-profile-v1';
export const PROFILE_TOPICS = [
  { id: 'financie', title: 'Financie', href: '/financie/' },
  { id: 'auto', title: 'Auto a doprava', href: '/auto/' },
  { id: 'urady', title: 'Úrady a doklady', href: '/urady/' },
  { id: 'byvanie', title: 'Bývanie', href: '/byvanie/' },
];
export const PROFILE_LINKS = [
  { id: 'centrum', title: 'Moje úlohy a rozpočet', href: '/moje-centrum/' },
  { id: 'kalendar', title: 'Kalendár povinností', href: '/kalendar/' },
  { id: 'zoznamy', title: 'Moje kontrolné zoznamy', href: '/moje-kontrolne-zoznamy/' },
  { id: 'dokumenty', title: 'Centrum dokumentov', href: '/dokumenty/' },
  { id: 'ai', title: 'VŠETKO AI', href: '/ai/' },
  { id: 'mzda', title: 'Kalkulačka čistej mzdy', href: '/kalkulacky/cista-mzda/' },
  { id: 'auto', title: 'Náklady na auto', href: '/kalkulacky/naklady-na-auto/' },
  { id: 'byvanie', title: 'Náklady na bývanie', href: '/kalkulacky/naklady-na-byvanie/' },
];
export const emptyProfile = () => ({ version: 1, topics: [], favorites: [] });
const catalogueIds = (value, catalogue) => Array.isArray(value)
  ? [...new Set(value.filter(id => typeof id === 'string' && catalogue.some(item => item.id === id)))].slice(0, catalogue.length)
  : [];
export function normalizeProfile(value) {
  if (!value || typeof value !== 'object' || value.version !== 1) return emptyProfile();
  return { version: 1, topics: catalogueIds(value.topics, PROFILE_TOPICS), favorites: catalogueIds(value.favorites, PROFILE_LINKS) };
}
export function readProfile(storage) {
  const raw = storage.getItem(PROFILE_KEY);
  if (raw === null) return emptyProfile();
  return normalizeProfile(JSON.parse(raw));
}
export function writeProfile(storage, value) {
  const normalized = normalizeProfile(value);
  storage.setItem(PROFILE_KEY, JSON.stringify(normalized));
  return normalized;
}
export function centerSummary(value, today) {
  if (!value || typeof value !== 'object' || value.version !== 1) return { tasks: 0, deadlines: 0 };
  const tasks = Array.isArray(value.tasks) ? value.tasks.slice(0, 500).filter(item => item && typeof item.title === 'string' && item.done === false).length : 0;
  const deadlines = Array.isArray(value.deadlines) ? value.deadlines.slice(0, 500).filter(item => {
    if (!item || typeof item.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) return false;
    const date = new Date(item.date + 'T12:00:00');
    const roundtrip = Number.isFinite(date.getTime()) && [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-') === item.date;
    return roundtrip && item.date >= today;
  }).length : 0;
  return { tasks, deadlines };
}
