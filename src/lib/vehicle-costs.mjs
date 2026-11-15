export const VEHICLE_COST_KEY = 'v24-vehicle-costs-v1';
export const VEHICLE_CATEGORIES = Object.freeze({ energy: 'Palivo / elektrina', service: 'Servis a pneumatiky', insurance: 'Poistenie', other: 'Ostatná prevádzka' });
export const emptyVehicleCosts = () => ({ version: 1, distance: 0, entries: [] });
export function validVehicleDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T12:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function validVehicleCosts(value) {
  if (!value || value.version !== 1 || !Number.isFinite(value.distance) ||
      value.distance < 0 || value.distance > 10000000 ||
      !Array.isArray(value.entries) || value.entries.length > 500) return false;

  const ids = new Set();
  for (const entry of value.entries) {
    if (!entry || typeof entry.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(entry.id) ||
        ids.has(entry.id) || !validVehicleDate(entry.date) ||
        typeof entry.category !== 'string' || !Object.hasOwn(VEHICLE_CATEGORIES, entry.category) ||
        !Number.isInteger(entry.cents) || entry.cents <= 0 || entry.cents > 100000000) return false;
    ids.add(entry.id);
  }
  return true;
}
export function vehicleCostSummary(state) {
  if (!validVehicleCosts(state)) throw new TypeError('Neplatná evidencia nákladov');
  const categories = Object.fromEntries(Object.keys(VEHICLE_CATEGORIES).map(key => [key, 0]));
  for (const entry of state.entries) categories[entry.category] += entry.cents;
  const totalCents = Object.values(categories).reduce((sum, cents) => sum + cents, 0);
  return { totalCents, categories, perKm: state.distance > 0 ? totalCents / 100 / state.distance : null };
}
