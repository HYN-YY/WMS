import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createInitialState,
  allocateOrders,
  releaseWave,
  resolveShortPick,
  setPackageWeight,
  confirmShipment,
  twinSummary,
  receiveInbound,
  freezeInventory,
  operationsSummary,
  submitCountVariance,
  inspectReturn,
  publishRule,
  retryIntegration,
  syncPdaQueue,
  deactivateUser,
  publishRole,
  simulatePermission,
  createUser,
  createRole,
} from '../state.js';

test('allocation requires at least one selected order', () => {
  const state = createInitialState();
  const result = allocateOrders(state, []);
  assert.equal(result.ok, false);
  assert.equal(result.message, '请先选择需要分配的订单');
});

test('allocation updates selected eligible orders', () => {
  const state = createInitialState();
  const result = allocateOrders(state, ['SO20260703001', 'SO20260703002']);
  assert.equal(result.ok, true);
  assert.equal(result.state.orders[0].status, '已分配');
  assert.equal(result.state.orders[1].status, '已分配');
});

test('wave release requires candidates and creates picking tasks', () => {
  const state = createInitialState();
  assert.equal(releaseWave(state, []).ok, false);
  const allocated = allocateOrders(state, ['SO20260703001', 'SO20260703002']).state;
  const result = releaseWave(allocated, ['SO20260703001', 'SO20260703002']);
  assert.equal(result.ok, true);
  assert.equal(result.state.wave.status, '已释放');
  assert.equal(result.state.tasks.length - allocated.tasks.length, 4);
  assert.equal(result.state.orders[0].status, '拣货中');
});

test('short-pick recovery requires a reason and changes twin alert state', () => {
  const state = createInitialState();
  assert.equal(resolveShortPick(state, { reason: '', strategy: '跨区重分配' }).ok, false);
  const result = resolveShortPick(state, { reason: '库位缺货', strategy: '跨区重分配' });
  assert.equal(result.ok, true);
  assert.equal(result.state.shortPick.status, '观察中');
  assert.equal(result.state.shortPick.audit.at(-1).action, '跨区重分配');
  assert.equal(twinSummary(result.state).blockingAlerts, 0);
});

test('shipment blocks abnormal weight and confirmation is idempotent', () => {
  let state = createInitialState();
  state = setPackageWeight(state, 10.8).state;
  assert.equal(confirmShipment(state).ok, false);
  state = setPackageWeight(state, 8.4).state;
  const first = confirmShipment(state);
  assert.equal(first.ok, true);
  assert.equal(first.state.shipment.status, '已发运');
  const second = confirmShipment(first.state);
  assert.equal(second.ok, false);
  assert.equal(second.message, '该包裹已完成发运，请勿重复提交');
});

test('released wave increases digital-twin picking workload', () => {
  const state = createInitialState();
  const before = twinSummary(state).pickingTasks;
  const allocated = allocateOrders(state, ['SO20260703001']).state;
  const released = releaseWave(allocated, ['SO20260703001']).state;
  assert.ok(twinSummary(released).pickingTasks > before);
});

test('inbound receipt records quantity and creates putaway work', () => {
  const state = createInitialState();
  assert.equal(receiveInbound(state, { asnId: 'ASN260703-041', quantity: 0 }).ok, false);
  const result = receiveInbound(state, { asnId: 'ASN260703-041', quantity: 48 });
  assert.equal(result.ok, true);
  assert.equal(result.state.inbound.received, 48);
  assert.equal(result.state.inbound.status, '待上架');
  assert.equal(result.state.inbound.putawayTasks, 2);
});

test('inventory freeze is auditable and reduces available balance', () => {
  const state = createInitialState();
  const result = freezeInventory(state, { sku: 'SKU-AX19-042', quantity: 3, reason: '短拣复核' });
  assert.equal(result.ok, true);
  assert.equal(result.state.inventory[0].available, 125);
  assert.equal(result.state.inventory[0].frozen, 3);
  assert.equal(result.state.inventoryAudit.at(-1).reason, '短拣复核');
});

test('operations summary combines inbound, outbound, and inventory state', () => {
  let state = createInitialState();
  state = receiveInbound(state, { asnId: 'ASN260703-041', quantity: 48 }).state;
  const summary = operationsSummary(state);
  assert.equal(summary.receivedToday, 1328);
  assert.equal(summary.inventoryAccuracy, 99.94);
  assert.ok(summary.outboundCompletion > 90);
});

test('large count variance creates approval instead of changing stock', () => {
  const state = createInitialState();
  const result = submitCountVariance(state, { counted: 119, book: 128 });
  assert.equal(result.ok, true);
  assert.equal(result.state.count.status, '待审批');
  assert.equal(result.state.inventory[0].onHand, 128);
});

test('return inspection rejects mismatched serial and accepts valid disposition', () => {
  const state = createInitialState();
  assert.equal(inspectReturn(state, { serial: 'SN-WRONG', disposition: '良品入库' }).ok, false);
  const result = inspectReturn(state, { serial: 'SN-A19-8842', disposition: '良品入库' });
  assert.equal(result.ok, true);
  assert.equal(result.state.returnOrder.status, '待上架');
});

test('rule publication blocks conflicting scope and supports valid version', () => {
  const state = createInitialState();
  assert.equal(publishRule(state, { scope: '华东一号仓', priority: 100 }).ok, false);
  const result = publishRule(state, { scope: '华东一号仓/B2C', priority: 90 });
  assert.equal(result.ok, true);
  assert.equal(result.state.rules.at(-1).version, 'v3');
});

test('integration retry and PDA queue are idempotent', () => {
  let state = createInitialState();
  const retried = retryIntegration(state, 'MSG-260703-0098');
  assert.equal(retried.state.integrationQueue[0].status, '成功');
  state = retried.state;
  const synced = syncPdaQueue(state, ['OP-1001', 'OP-1001', 'OP-1002']);
  assert.equal(synced.state.pda.syncedOperations.length, 2);
  assert.equal(syncPdaQueue(synced.state, ['OP-1001']).state.pda.syncedOperations.length, 2);
});

test('user deactivation requires unfinished-work handoff', () => {
  const state = createInitialState();
  assert.equal(deactivateUser(state, { userId: 'U-1002', handoffTo: '' }).ok, false);
  const result = deactivateUser(state, { userId: 'U-1002', handoffTo: 'U-1001' });
  assert.equal(result.ok, true);
  assert.equal(result.state.security.users[1].status, '停用');
  assert.equal(result.state.security.audit.at(-1).event, 'user.deactivated');
});

test('published role creates a new immutable version', () => {
  const state = createInitialState();
  const result = publishRole(state, 'R-WH-MANAGER');
  assert.equal(result.ok, true);
  assert.equal(result.state.security.roles[0].version, 'v4');
  assert.equal(result.state.security.audit.at(-1).event, 'role.published');
});

test('permission simulation explains denied warehouse access and audits it', () => {
  const state = createInitialState();
  const result = simulatePermission(state, { userId: 'U-1001', resource: 'inventory.view', warehouse: '华南二号仓' });
  assert.equal(result.allowed, false);
  assert.match(result.reason, /数据范围/);
  assert.equal(result.state.security.audit.at(-1).result, '拒绝');
});

test('new user is created as pending activation with an audit event', () => {
  const state = createInitialState();
  const result = createUser(state, { account: 'wang.min', name: '王敏', employeeNo: 'WH0108', role: '入库员' });
  assert.equal(result.ok, true);
  assert.equal(result.state.security.users.at(-1).status, '待激活');
  assert.equal(result.state.security.audit.at(-1).event, 'user.created');
  assert.equal(createUser(result.state, { account: 'wang.min', name: '王敏', employeeNo: 'WH0108', role: '入库员' }).ok, false);
});

test('new role is created as a draft without overwriting published roles', () => {
  const state = createInitialState();
  const result = createRole(state, { code: 'R-QC-LEAD', name: '质检主管', scope: '华东一号仓' });
  assert.equal(result.ok, true);
  assert.equal(result.state.security.roles.at(-1).status, '草稿');
  assert.equal(result.state.security.roles[0].version, 'v3');
  assert.equal(result.state.security.audit.at(-1).event, 'role.created');
});

test('standard role catalog covers the complete warehouse and governance workflow', () => {
  const state = createInitialState();
  const roleIds = state.security.roles.map((role) => role.id);
  assert.equal(state.security.roles.length, 13);
  assert.deepEqual(roleIds, [
    'R-WH-MANAGER', 'R-ORDER-OPS', 'R-INBOUND', 'R-QC', 'R-PUTAWAY',
    'R-INVENTORY', 'R-REPLENISH', 'R-PICKER', 'R-PACKER', 'R-SHIPPER',
    'R-SYSTEM-ADMIN', 'R-SECURITY-ADMIN', 'R-AUDITOR',
  ]);
  state.security.roles.forEach((role) => {
    assert.ok(role.duty);
    assert.ok(role.modules);
    assert.ok(role.actions);
    assert.ok(role.restrictions);
  });
});
