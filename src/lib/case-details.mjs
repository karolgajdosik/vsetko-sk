const amount = value => Number.isSafeInteger(value) && value >= 0 && value <= 10000000;

export function validCaseDetails(record) {
  const options = record.options;
  return (record.archived === undefined || typeof record.archived === 'boolean') &&
    (record.evidence === undefined || (Number.isInteger(record.evidence) && record.evidence >= 0 && record.evidence <= 7)) &&
    (options === undefined || (options && ['stay', 'renew', 'switch'].includes(options.choice) &&
      [options.renew, options.renewFee, options.switch, options.switchFee].every(amount)));
}

export function caseOptionTotals(current, options) {
  return [current, options.renew + options.renewFee, options.switch + options.switchFee];
}
