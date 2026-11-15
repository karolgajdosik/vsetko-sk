export function compareServiceCosts(offers, months) {
  if (!Number.isInteger(months) || months < 1 || months > 120) throw new RangeError('Obdobie musí byť 1 až 120 mesiacov.');
  if (!Array.isArray(offers) || offers.length !== 2) throw new TypeError('Zadajte dve ponuky.');
  return offers.map(offer => {
    for (const key of ['monthly', 'annual', 'setup']) {
      if (typeof offer[key] !== 'number' || !Number.isFinite(offer[key]) || offer[key] < 0 || offer[key] > 1000000) throw new RangeError('Neplatná suma.');
    }
    const totalCents = Math.round(offer.monthly * 100) * months + Math.round(offer.annual * 100) * Math.ceil(months / 12) + Math.round(offer.setup * 100);
    return {total: totalCents / 100, averageMonthly: totalCents / 100 / months};
  });
}
