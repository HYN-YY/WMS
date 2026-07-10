import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('prototype shell contains required accessible landmarks and views', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  for (const required of [
    'class="skip-link"', '<nav', '<main', 'aria-live="polite"', 'role="dialog"',
    'data-view="dashboard"', 'data-view="orders"', 'data-view="waves"',
    'data-view="tasks"', 'data-view="shipping"', 'data-view="exceptions"',
    'data-view="twin"', 'name="viewport"',
    'data-view="replenishment"', 'data-view="count"', 'data-view="returns"',
    'data-view="documents"', 'data-view="transactions"', 'data-view="alerts"',
    'data-view="finance"',
    'data-view="master"', 'data-view="rules"', 'data-view="integrations"',
    'data-view="printing"', 'data-view="printJobs"', 'data-view="admin"', 'data-view="pda"',
  ]) assert.ok(html.includes(required), `missing ${required}`);
  assert.equal(html.includes('参考系统复刻'), false);
  assert.equal(html.includes('data-view="protonInbound"'), false);
});

test('prototype keeps styles and scripts local for offline delivery', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(html.includes('href="./styles.css?v=17"'));
  assert.ok(html.includes('src="./app.js?v=17"'));
  assert.equal(/https?:\/\//.test(html), false);
});
