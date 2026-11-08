export function validateScenarioCatalog(scenarios, guides) {
  const errors = [];
  const knownGuides = new Set(guides.map(guide => guide.slug));
  const slugs = new Set();
  for (const [index, scenario] of scenarios.entries()) {
    const label = scenario.slug || `scenario[${index}]`;
    if (typeof scenario.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(scenario.slug)) errors.push(`${label}: invalid slug`);
    if (slugs.has(scenario.slug)) errors.push(`${label}: duplicate slug`);
    slugs.add(scenario.slug);
    if (!scenario.title?.trim() || !scenario.category?.trim()) errors.push(`${label}: missing title or category`);
    if (!Array.isArray(scenario.guides) || scenario.guides.length === 0) errors.push(`${label}: missing guides`);
    for (const slug of scenario.guides || []) if (!knownGuides.has(slug)) errors.push(`${label}: unknown guide ${slug}`);
    const questionIds = new Set();
    for (const question of scenario.questions || []) {
      if (!question.id || questionIds.has(question.id)) errors.push(`${label}: missing or duplicate question id`);
      questionIds.add(question.id);
      if (!Array.isArray(question.options) || !question.options.length) errors.push(`${label}: question has no options`);
      const values = new Set();
      for (const option of question.options || []) {
        if (!option.value || values.has(option.value)) errors.push(`${label}: missing or duplicate option value`);
        values.add(option.value);
        for (const slug of option.guides || []) if (!knownGuides.has(slug)) errors.push(`${label}: unknown option guide ${slug}`);
        for (const route of option.calculators || []) if (typeof route !== 'string' || !route.startsWith('/') || route.startsWith('//')) errors.push(`${label}: invalid calculator route`);
      }
    }
    for (const route of scenario.calculators || []) if (typeof route !== 'string' || !route.startsWith('/') || route.startsWith('//')) errors.push(`${label}: invalid calculator route`);
    try { if (new URL(scenario.official).protocol !== 'https:') errors.push(`${label}: official URL must use HTTPS`); }
    catch { errors.push(`${label}: invalid official URL`); }
  }
  return errors;
}
