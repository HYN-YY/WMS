import test from 'node:test';
import assert from 'node:assert/strict';
import { paginateRows, createUiState, selectTab, selectTwinLayer, visibleTwinParts, searchWorkspace } from '../ui-state.js';
import { kpis } from '../data.js';

test('pagination clamps page and returns complete metadata', () => {
  const rows = Array.from({ length: 23 }, (_, index) => index + 1);
  assert.deepEqual(paginateRows(rows, 2, 5).items, [6, 7, 8, 9, 10]);
  const last = paginateRows(rows, 99, 5);
  assert.equal(last.page, 5);
  assert.equal(last.items.length, 3);
  assert.equal(last.from, 21);
  assert.equal(last.to, 23);
});

test('tab selection is tracked independently by view', () => {
  const ui = createUiState();
  const next = selectTab(ui, 'tasks', 'exception');
  assert.equal(next.tabs.tasks, 'exception');
  assert.equal(next.tabs.master, 'locations');
});

test('digital-twin layer controls actual map parts', () => {
  let ui = createUiState();
  ui = selectTwinLayer(ui, 'equipment');
  assert.deepEqual(visibleTwinParts(ui), { zones: true, heat: false, routes: false, equipment: true, alerts: false });
  ui = selectTwinLayer(ui, 'alerts');
  assert.equal(visibleTwinParts(ui).alerts, true);
  assert.equal(visibleTwinParts(ui).equipment, false);
});

test('KPI tone names do not collide with global brand layout class', () => {
  assert.notEqual(kpis[0].tone, 'brand');
});

test('workspace search matches identifiers and Chinese titles', () => {
  const docs = [
    { type: '订单', id: 'SO20260703001', title: '天猫旗舰店订单', view: 'orders' },
    { type: '库存', id: 'SKU-AX19-042', title: '智能温湿度传感器', view: 'inventory' },
  ];
  assert.equal(searchWorkspace(docs, 'SO20260703001')[0].view, 'orders');
  assert.equal(searchWorkspace(docs, '温湿度')[0].id, 'SKU-AX19-042');
  assert.deepEqual(searchWorkspace(docs, '不存在'), []);
});
