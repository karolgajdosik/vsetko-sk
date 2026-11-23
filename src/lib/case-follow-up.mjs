export function isCaseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01') return false;
  const date = new Date(value + 'T12:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validCaseFollowUp(value) {
  return value === undefined || (
    value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === 2 && isCaseDate(value.sentOn) &&
    isCaseDate(value.contactOn) && value.contactOn >= value.sentOn
  );
}

export function localCaseDate(date = new Date()) {
  const pad = value => String(value).padStart(2, '0');
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

export function formatCaseDate(value) {
  const [year, month, day] = value.split('-');
  return Number(day) + '. ' + Number(month) + '. ' + year;
}
