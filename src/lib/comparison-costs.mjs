export function compareServiceCosts(offers, months) {
  if (!Number.isInteger(months) || months < 1 || months > 120) throw new RangeError('Obdobie musí byť 1 až 120 mesiacov.');
  if (!Array.isArray(offers) || offers.length !== 2) throw new TypeError('Zadajte dve ponuky.');
  return offers.map(offer => {
    for (const key of ['monthly', 'annual', 'setup']) {
      if (typeof offer[key] !== 'number' || !Number.isFinite(offer[key]) || offer[key] < 0 || offer[key] > 1000000) throw new RangeError('Neplatná suma.');
    }
    const promoMonths = offer.promoMonths ?? 0;
    const promoMonthly = offer.promoMonthly ?? offer.monthly;
    if (!Number.isInteger(promoMonths) || promoMonths < 0 || promoMonths > 120 || typeof promoMonthly !== 'number' || !Number.isFinite(promoMonthly) || promoMonthly < 0 || promoMonthly > 1000000) throw new RangeError('Neplatná akciová cena alebo obdobie.');
    const discounted = Math.min(months, promoMonths);
    const promoCents = Math.round(promoMonthly * 100) * discounted;
    const regularCents = Math.round(offer.monthly * 100) * (months - discounted);
    const annualCents = Math.round(offer.annual * 100) * Math.ceil(months / 12);
    const setupCents = Math.round(offer.setup * 100);
    const total = (promoCents + regularCents + annualCents + setupCents) / 100;
    return {
      promo: promoCents / 100,
      regular: regularCents / 100,
      annual: annualCents / 100,
      setup: setupCents / 100,
      total,
      averageMonthly: total / months,
    };
  });
}
