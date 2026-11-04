import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateScenarioCatalog} from '../src/lib/scenario-integrity.mjs';
const read = path => JSON.parse(readFileSync(new URL('../' + path, import.meta.url), 'utf8'));
const guides = read('src/data/guides.json');
const scenarios = read('src/data/scenarios.json');
test('published scenarios have valid slugs, guide references and question options', () => {
  assert.deepEqual(validateScenarioCatalog(scenarios, guides), []);
});
test('duplicate slugs, missing guides and invalid official links are rejected', () => {
  const invalid = structuredClone(scenarios);
  invalid[1].slug = invalid[0].slug;
  invalid[1].guides.push('nonexistent-guide');
  invalid[1].official = 'http://example.org';
  const errors = validateScenarioCatalog(invalid, guides);
  assert.ok(errors.some(x => x.includes('duplicate slug')));
  assert.ok(errors.some(x => x.includes('unknown guide')));
  assert.ok(errors.some(x => x.includes('HTTPS')));
});
test('duplicate answer values and unknown nested guide references are rejected', () => {
  const invalid = structuredClone(scenarios);
  invalid[0].questions[0].options[1].value = invalid[0].questions[0].options[0].value;
  invalid[0].questions[0].options[0].guides.push('nonexistent-guide');
  const errors = validateScenarioCatalog(invalid, guides);
  assert.ok(errors.some(x => x.includes('duplicate option value')));
  assert.ok(errors.some(x => x.includes('unknown option guide')));
});
