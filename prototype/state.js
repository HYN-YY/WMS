import { baseTasks, demoOrders, zones } from './data.js?v=6';

// Demo state is deliberately JSON-safe; this keeps the prototype compatible with Node 16.
const copy = (value) => JSON.parse(JSON.stringify(value));

export function createInitialState() {
  return {
    activeView: 'dashboard',
    orders: copy(demoOrders),
    selectedOrders: [],
    wave: { id: 'WV20260703-021', status: '草稿', orders: [], capacity: 68 },
    tasks: copy(baseTasks),
    shortPick: {
      id: 'EX260703-0086',
      orderId: 'SO20260703003',
      sku: 'SKU-AX19-042',
      product: '智能温湿度传感器',
      zone: '拣选区',
      expected: 12,
      actual: 9,
      status: '待处理',
      audit: [{ time: '09:42', actor: '系统', action: '检测到短拣，锁定差异库存' }],
    },
    package: { id: 'LPN2607030098', expectedWeight: 8.2, weight: 8.4, verified: true },
    shipment: { id: 'SHIP260703-066', status: '待发运', waybill: 'SF314159265358', carrier: '顺丰速运' },
    inbound: { asnId: 'ASN260703-041', supplier: '星云智能科技', expected: 48, received: 0, status: '待收货', putawayTasks: 0 },
    inventory: [
      { sku: 'SKU-AX19-042', product: '智能温湿度传感器', location: 'A-01-03-02', onHand: 128, allocated: 12, available: 128, frozen: 0, batch: 'BT260618-A' },
      { sku: 'SKU-PK08-116', product: '工业级手持扫码器', location: 'B-02-07-01', onHand: 64, allocated: 18, available: 46, frozen: 0, batch: 'BT260629-B' },
      { sku: 'SKU-RF22-081', product: 'RFID 抗金属标签', location: 'A-03-11-04', onHand: 2400, allocated: 860, available: 1540, frozen: 0, batch: 'BT260701-C' },
      ...Array.from({length:10},(_,index)=>({ sku:`SKU-DM${String(index+1).padStart(2,'0')}-${100+index}`, product:['防静电周转箱','工业标签打印纸','叉车电池模组','包装缓冲材料'][index%4], location:`${index%2?'A':'B'}-0${index%4+1}-${String(index+4).padStart(2,'0')}-0${index%3+1}`, onHand:80+index*37, allocated:10+index*3, available:70+index*34, frozen:index%5===0?2:0, batch:`BT2607${String(index+1).padStart(2,'0')}-D` })),
    ],
    inventoryAudit: [],
    count: { id: 'CC260703-012', mode: '盲盘', sku: 'SKU-AX19-042', book: 128, counted: null, variance: 0, status: '盘点中' },
    returnOrder: { id: 'RMA260703-028', orderId: 'SO20260628091', serial: 'SN-A19-8842', product: '智能温湿度传感器', status: '待质检', disposition: null },
    rules: [
      { id: 'RULE-ALLOC-012', name: 'B2C 效期优先分配', scope: '华东一号仓', priority: 100, version: 'v2', status: '已发布' },
      { id: 'RULE-WAVE-008', name: '早班加急波次', scope: '华东一号仓/B2C', priority: 80, version: 'v5', status: '已发布' },
      ...Array.from({length:9},(_,index)=>({id:`RULE-${['PUT','PICK','REPL'][index%3]}-${String(20+index).padStart(3,'0')}`,name:['上架同品聚合','批量拣选路径','拣选位下限补货'][index%3],scope:index%2?'华东一号仓/B2B':'华东一号仓/默认',priority:60-index,version:`v${1+index%4}`,status:index%5===0?'草稿':'已发布'})),
    ],
    integrationQueue: [{ id: 'MSG-260703-0098', system: 'TMS', event: 'shipment_confirmed', retries: 3, status: '人工处理' }],
    pda: { online: false, pendingOperations: ['OP-1001', 'OP-1002'], syncedOperations: [] },
    security: {
      users: [
        { id:'U-1001', account:'lin.an', name:'林安', employeeNo:'WH0018', organization:'华东运营中心', warehouse:'华东一号仓', position:'仓库经理', roles:['仓库经理'], status:'启用', source:'SSO', lastLogin:'2026-07-03 09:58', unfinished:0 },
        { id:'U-1002', account:'zhou.yu', name:'周宇', employeeNo:'WH0086', organization:'华东运营中心', warehouse:'华东一号仓', position:'拣货员', roles:['拣货员'], status:'启用', source:'SSO', lastLogin:'2026-07-03 09:42', unfinished:3 },
        { id:'U-1003', account:'chen.chen', name:'陈晨', employeeNo:'WH0091', organization:'华东运营中心', warehouse:'华东一号仓', position:'拣货员', roles:['拣货员'], status:'锁定', source:'本地', lastLogin:'2026-07-02 18:06', unfinished:0 },
      ],
      roles: [
        { id:'R-WH-MANAGER', name:'仓库经理', type:'管理角色', users:4, permissions:38, scope:'指定仓库/全部货主', version:'v3', status:'已发布', duty:'统筹仓内履约、资源和异常处置', modules:'驾驶舱、数字孪生、全流程监控、审批中心', actions:'查看全仓数据；分配任务；处置异常；审批库存差异和发运冲销', restrictions:'不得审批本人提交的申请；无系统安全配置权限' },
        { id:'R-ORDER-OPS', name:'订单运营', type:'业务角色', users:6, permissions:22, scope:'指定仓库/授权货主与渠道', version:'v2', status:'已发布', duty:'管理订单分配、波次和履约跟踪', modules:'出库订单、波次中心、异常中心、运营报表', actions:'查询与分配订单；创建/释放波次；挂起订单；提交异常处置', restrictions:'不可直接调整库存、确认发运或查看敏感明文字段' },
        { id:'R-INBOUND', name:'入库员', type:'作业角色', users:12, permissions:14, scope:'指定仓库/分配任务', version:'v4', status:'已发布', duty:'完成预约到货、收货和上架交接', modules:'入库管理、PDA 作业、打印中心', actions:'扫描 ASN；登记实收；提交收货差异；打印收货与容器标签', restrictions:'不可修改采购源单；超收和无单收货必须申请审批' },
        { id:'R-QC', name:'质检员', type:'作业角色', users:5, permissions:13, scope:'指定仓库/质检任务', version:'v3', status:'已发布', duty:'执行入库与退货质量检验', modules:'入库质检、退货中心、异常中心', actions:'记录检验结果；隔离不合格品；提交处置建议', restrictions:'不可审批本人检验的不合格品放行；不可调整可用库存' },
        { id:'R-PUTAWAY', name:'上架员', type:'作业角色', users:10, permissions:9, scope:'指定仓库/分配库区', version:'v2', status:'已发布', duty:'按系统建议完成商品上架', modules:'上架任务、PDA 作业、库位查询', actions:'领取任务；扫描商品与库位；确认上架；报告库位异常', restrictions:'不可更改上架规则；跨区上架需主管确认' },
        { id:'R-INVENTORY', name:'库存管理员', type:'业务角色', users:3, permissions:24, scope:'指定仓库/授权货主', version:'v5', status:'已发布', duty:'维护库存准确性和库存状态', modules:'库存中心、盘点中心、补货中心、报表', actions:'冻结/解冻；创建盘点；提交库存调整；管理批次与效期状态', restrictions:'库存调整超过阈值必须审批；不可审批本人申请' },
        { id:'R-REPLENISH', name:'补货员', type:'作业角色', users:8, permissions:10, scope:'指定仓库/分配任务', version:'v2', status:'已发布', duty:'执行存储位到拣选位的补货任务', modules:'补货中心、PDA 作业、库存查询', actions:'领取补货；扫描来源与目标库位；确认移动；上报短缺', restrictions:'不可修改补货规则或手工调整库存余额' },
        { id:'R-PICKER', name:'拣货员', type:'作业角色', users:28, permissions:11, scope:'指定仓库/本人任务', version:'v6', status:'已发布', duty:'按任务完成商品拣选与异常上报', modules:'作业监控、PDA 拣货、异常上报', actions:'领取任务；扫描库位与商品；确认拣货；上报短拣/破损', restrictions:'不可查看订单敏感信息；不可自行改变分配批次或库存' },
        { id:'R-PACKER', name:'复核包装员', type:'作业角色', users:9, permissions:12, scope:'指定仓库/复核工作站', version:'v3', status:'已发布', duty:'完成订单复核、称重、包装和面单打印', modules:'复核发运、打印中心、异常中心', actions:'扫描复核；录入重量；确认包装；打印面单；提交差异', restrictions:'重量或商品差异未解除时不可放行；无发运确认权限' },
        { id:'R-SHIPPER', name:'发运员', type:'作业角色', users:7, permissions:10, scope:'指定仓库/发运月台', version:'v3', status:'已发布', duty:'完成承运交接和发运确认', modules:'发运工作台、装车交接、打印中心', actions:'扫描运单；确认装车；完成承运交接；提交冲销申请', restrictions:'发运冲销必须审批；不可修改已复核包裹内容' },
        { id:'R-SYSTEM-ADMIN', name:'系统管理员', type:'平台角色', users:2, permissions:31, scope:'全部仓/系统配置', version:'v4', status:'已发布', duty:'维护组织、主数据、集成、设备和系统参数', modules:'主数据、集成中心、打印中心、用户管理', actions:'维护组织仓库；配置接口设备；创建用户；分配非安全角色', restrictions:'不能审批自身授权；默认不可查看业务敏感明文和审计原文' },
        { id:'R-SECURITY-ADMIN', name:'安全管理员', type:'安全角色', users:2, permissions:26, scope:'全部仓/安全配置', version:'v3', status:'已发布', duty:'管理角色权限、认证策略和高风险授权', modules:'角色管理、权限管理、审批中心、安全报告', actions:'创建角色版本；配置权限；审批临时授权；锁定/解锁账号', restrictions:'不能修改审计日志；不能审批自身提交的角色或授权变更' },
        { id:'R-AUDITOR', name:'只读审计员', type:'合规角色', users:2, permissions:12, scope:'全部仓/脱敏只读', version:'v2', status:'已发布', duty:'独立检查操作记录、权限变更和控制有效性', modules:'审计日志、安全报告、脱敏业务报表', actions:'只读查询；追踪事件链；申请导出脱敏审计证据', restrictions:'无任何业务写入和安全配置权限；明文导出必须审批' },
      ],
      permissions: [
        { resource:'inventory.adjust', label:'库存调整', level:'操作', scope:'华东一号仓', risk:'高风险', granted:true },
        { resource:'shipment.reverse', label:'发运冲销', level:'操作', scope:'需审批', risk:'高风险', granted:false },
        { resource:'pii.reveal', label:'敏感字段明文', level:'字段', scope:'当前任务', risk:'高风险', granted:false },
        { resource:'audit.export', label:'审计日志导出', level:'操作', scope:'脱敏数据', risk:'高风险', granted:true },
      ],
      approvals: [
        { id:'AP260703-018', type:'库存调整', applicant:'赵凯', object:'SKU-AX19-042', risk:'高', summary:'可用库存 -9 件', node:'仓库经理审批', sla:'剩余 38 分钟', status:'审批中' },
        { id:'AP260703-017', type:'角色发布', applicant:'系统管理员', object:'库存管理员 v6', risk:'高', summary:'新增批量冻结权限', node:'安全管理员会签', sla:'剩余 2 小时', status:'审批中' },
      ],
      audit: [
        { id:'AUD-260703-1028', time:'10:22:06', event:'inventory.frozen', category:'业务操作', actor:'林安', role:'仓库经理', terminal:'WS-08', object:'SKU-AX19-042', before:'可用 128', after:'可用 125', reason:'短拣复核', result:'成功', trace:'TRC-A81F' },
        { id:'AUD-260703-1027', time:'10:18:44', event:'access.denied', category:'访问', actor:'林安', role:'仓库经理', terminal:'WEB-01', object:'华南二号仓', before:'无访问', after:'无访问', reason:'超出数据范围', result:'拒绝', trace:'TRC-A80E' },
      ],
    },
    twin: { layer: 'utilization', selectedZone: null },
  };
}

function result(state, ok, message) {
  return { state, ok, message };
}

export function allocateOrders(current, orderIds) {
  if (!orderIds.length) return result(current, false, '请先选择需要分配的订单');
  const state = copy(current);
  let changed = 0;
  state.orders = state.orders.map((order) => {
    if (orderIds.includes(order.id) && order.status === '待分配') {
      changed += 1;
      return { ...order, status: '已分配', risk: '正常' };
    }
    return order;
  });
  if (!changed) return result(current, false, '所选订单当前不可分配');
  state.selectedOrders = [...new Set([...state.selectedOrders, ...orderIds])];
  return result(state, true, `已完成 ${changed} 个订单的库存分配`);
}

export function releaseWave(current, orderIds) {
  if (!orderIds.length) return result(current, false, '请先将已分配订单加入波次');
  const eligible = current.orders.filter((order) => orderIds.includes(order.id) && ['已分配', '波次中'].includes(order.status));
  if (!eligible.length) return result(current, false, '没有可释放的已分配订单');
  const state = copy(current);
  state.wave = { ...state.wave, status: '已释放', orders: eligible.map((item) => item.id), capacity: 82 };
  state.orders = state.orders.map((order) => eligible.some((item) => item.id === order.id) ? { ...order, status: '拣货中' } : order);
  state.tasks = [
    ...state.tasks,
    ...eligible.flatMap((order, index) => [
      { id: `PK260703-${1201 + index * 2}`, zone: index % 2 ? '存储区 B' : '拣选区 A', assignee: '待领取', progress: 0, status: '待执行', pieces: Math.ceil(order.pieces / 2) },
      { id: `PK260703-${1202 + index * 2}`, zone: '拣选区', assignee: '待领取', progress: 0, status: '待执行', pieces: Math.floor(order.pieces / 2) },
    ]),
  ];
  return result(state, true, `波次 ${state.wave.id} 已释放，生成 ${eligible.length * 2} 个拣货任务`);
}

export function resolveShortPick(current, { reason, strategy }) {
  if (!reason) return result(current, false, '请选择短拣原因');
  if (!strategy) return result(current, false, '请选择恢复策略');
  const state = copy(current);
  state.shortPick.status = '观察中';
  state.shortPick.reason = reason;
  state.shortPick.strategy = strategy;
  state.shortPick.audit.push({ time: '10:06', actor: '仓库经理 · 林安', action: strategy });
  return result(state, true, `异常已按“${strategy}”处理，差异库存保持锁定`);
}

export function setPackageWeight(current, weight) {
  const state = copy(current);
  state.package.weight = Number(weight);
  state.package.verified = Math.abs(state.package.weight - state.package.expectedWeight) <= 0.5;
  return result(state, true, state.package.verified ? '重量校验通过' : '重量超出允许偏差 ±0.5kg');
}

export function confirmShipment(current) {
  if (current.shipment.status === '已发运') return result(current, false, '该包裹已完成发运，请勿重复提交');
  if (!current.package.verified) return result(current, false, '包裹重量异常，请复核后再发运');
  const state = copy(current);
  state.shipment.status = '已发运';
  state.shipment.confirmedAt = '2026-07-03 10:18';
  return result(state, true, `发运成功，运单 ${state.shipment.waybill} 已回传`);
}

export function twinSummary(state) {
  return {
    blockingAlerts: state.shortPick.status === '待处理' ? 1 : 0,
    pickingTasks: state.tasks.filter((task) => task.zone.includes('拣选')).length,
    dockTasks: state.shipment.status === '已发运' ? 7 : 8,
    zones: zones.map((zone) => zone.id === 'picking'
      ? { ...zone, tasks: zone.tasks + Math.max(0, state.tasks.length - baseTasks.length), tone: state.shortPick.status === '待处理' ? 'danger' : 'warning' }
      : zone.id === 'dock' ? { ...zone, tasks: state.shipment.status === '已发运' ? 7 : zone.tasks } : zone),
  };
}

export function receiveInbound(current, { asnId, quantity }) {
  if (asnId !== current.inbound.asnId) return result(current, false, 'ASN 单号不存在或不属于当前仓库');
  if (!Number(quantity) || Number(quantity) < 1) return result(current, false, '收货数量必须大于 0');
  if (Number(quantity) > current.inbound.expected) return result(current, false, '收货数量超过 ASN 预计数量');
  const state = copy(current);
  state.inbound.received = Number(quantity);
  state.inbound.status = Number(quantity) === state.inbound.expected ? '待上架' : '差异待确认';
  state.inbound.putawayTasks = Math.ceil(Number(quantity) / 24);
  return result(state, true, `收货确认成功，已生成 ${state.inbound.putawayTasks} 个上架任务`);
}

export function freezeInventory(current, { sku, quantity, reason }) {
  if (!reason) return result(current, false, '冻结库存必须填写原因');
  const index = current.inventory.findIndex((item) => item.sku === sku);
  if (index < 0) return result(current, false, '未找到指定库存');
  const amount = Number(quantity);
  if (!amount || amount < 1 || amount > current.inventory[index].available) return result(current, false, '冻结数量无效或超过可用库存');
  const state = copy(current);
  state.inventory[index].available -= amount;
  state.inventory[index].frozen += amount;
  state.inventoryAudit.push({ time: '10:22', actor: '林安', sku, quantity: amount, reason });
  return result(state, true, `已冻结 ${amount} 件库存并记录审计日志`);
}

export function operationsSummary(state) {
  return {
    receivedToday: 1280 + state.inbound.received,
    outboundCompletion: state.shipment.status === '已发运' ? 98.7 : 96.4,
    inventoryAccuracy: 99.94,
    taskEfficiency: state.shortPick.status === '观察中' ? 93.8 : 91.6,
  };
}

export function submitCountVariance(current, { counted, book }) {
  if (Number(counted) < 0) return result(current, false, '盘点数量不能小于 0');
  const state = copy(current);
  state.count.counted = Number(counted);
  state.count.variance = Number(counted) - Number(book);
  state.count.status = Math.abs(state.count.variance) > 5 ? '待审批' : '已完成';
  return result(state, true, state.count.status === '待审批' ? '差异超过阈值，已生成审批任务' : '盘点已完成并生成库存事务');
}

export function inspectReturn(current, { serial, disposition }) {
  if (serial !== current.returnOrder.serial) return result(current, false, '序列号不属于原订单，已转异常处理');
  const state = copy(current);
  state.returnOrder.disposition = disposition;
  state.returnOrder.status = disposition === '良品入库' ? '待上架' : '已隔离';
  return result(state, true, `退货质检完成：${disposition}`);
}

export function publishRule(current, { scope, priority }) {
  const conflict = current.rules.some((rule) => rule.scope === scope && rule.priority === Number(priority) && rule.status === '已发布');
  if (conflict) return result(current, false, '检测到相同范围和优先级的冲突规则');
  const state = copy(current);
  state.rules.push({ id: `RULE-NEW-${state.rules.length + 1}`, name: '新建规则版本', scope, priority: Number(priority), version: 'v3', status: '已发布' });
  return result(state, true, '规则冲突检测通过，新版本已发布');
}

export function retryIntegration(current, messageId) {
  const index = current.integrationQueue.findIndex((message) => message.id === messageId);
  if (index < 0) return result(current, false, '未找到失败消息');
  const state = copy(current);
  if (state.integrationQueue[index].status === '成功') return result(state, false, '该消息已处理成功，不会重复执行');
  state.integrationQueue[index].status = '成功';
  state.integrationQueue[index].retries += 1;
  return result(state, true, '重试成功，已复用原幂等号');
}

export function syncPdaQueue(current, operationIds) {
  const state = copy(current);
  state.pda.online = true;
  state.pda.syncedOperations = [...new Set([...state.pda.syncedOperations, ...operationIds])];
  state.pda.pendingOperations = state.pda.pendingOperations.filter((id) => !state.pda.syncedOperations.includes(id));
  return result(state, true, `已安全同步 ${new Set(operationIds).size} 个离线操作`);
}

export function deactivateUser(current, { userId, handoffTo }) {
  const index=current.security.users.findIndex(user=>user.id===userId);
  if(index<0) return result(current,false,'未找到用户');
  const user=current.security.users[index];
  if(user.unfinished>0 && !handoffTo) return result(current,false,`用户存在 ${user.unfinished} 个未完成任务，请先指定交接人`);
  const state=copy(current); state.security.users[index].status='停用'; state.security.users[index].unfinished=0;
  state.security.audit.push({id:`AUD-260703-${1030+state.security.audit.length}`,time:'10:36:12',event:'user.deactivated',category:'安全配置',actor:'林安',role:'仓库经理',terminal:'WEB-01',object:user.account,before:'启用',after:'停用',reason:`离职交接至 ${handoffTo}`,result:'成功',trace:'TRC-SEC1'});
  return result(state,true,`用户 ${user.name} 已停用，未完成工作已交接`);
}

export function publishRole(current, roleId) {
  const index=current.security.roles.findIndex(role=>role.id===roleId); if(index<0) return result(current,false,'未找到角色');
  const state=copy(current); const role=state.security.roles[index]; const next=Number(role.version.slice(1))+1; const before=role.version; role.version=`v${next}`;
  state.security.audit.push({id:`AUD-260703-${1030+state.security.audit.length}`,time:'10:38:20',event:'role.published',category:'安全配置',actor:'林安',role:'仓库经理',terminal:'WEB-01',object:role.id,before,after:role.version,reason:'权限变更审批通过',result:'成功',trace:'TRC-SEC2'});
  return result(state,true,`${role.name} ${role.version} 已发布，原版本保持可追溯`);
}

export function simulatePermission(current, { userId, resource, warehouse }) {
  const state=copy(current); const user=state.security.users.find(item=>item.id===userId); const allowed=Boolean(user && user.warehouse===warehouse); const reason=allowed?'功能权限和数据范围均满足':`用户仅授权 ${user?.warehouse||'无'}，目标仓库超出数据范围`;
  state.security.audit.push({id:`AUD-260703-${1030+state.security.audit.length}`,time:'10:40:02',event:'access.simulated',category:'访问',actor:user?.name||userId,role:user?.roles?.join(',')||'未知',terminal:'WEB-01',object:`${warehouse}/${resource}`,before:'-',after:'-',reason,result:allowed?'允许':'拒绝',trace:'TRC-SEC3'});
  return {state,allowed,reason};
}

export function createUser(current, { account, name, employeeNo, role }) {
  if (!account || !name || !employeeNo || !role) return result(current,false,'请完整填写账号、姓名、工号和角色');
  if (current.security.users.some(user=>user.account===account || user.employeeNo===employeeNo)) return result(current,false,'账号或工号已存在');
  const state=copy(current); const id=`U-${1001+state.security.users.length}`;
  state.security.users.push({id,account,name,employeeNo,organization:'华东运营中心',warehouse:'华东一号仓',position:role,roles:[role],status:'待激活',source:'SSO',lastLogin:'尚未登录',unfinished:0});
  state.security.audit.push({id:`AUD-260703-${1030+state.security.audit.length}`,time:'10:44:16',event:'user.created',category:'安全配置',actor:'林安',role:'仓库经理',terminal:'WEB-01',object:account,before:'不存在',after:'待激活',reason:'新增仓内作业人员',result:'成功',trace:'TRC-SEC4'});
  return result(state,true,`用户 ${name} 已创建，等待 SSO 激活`);
}

export function createRole(current, { code, name, scope }) {
  if (!code || !name || !scope) return result(current,false,'请完整填写角色编码、名称和数据范围');
  if (current.security.roles.some(role=>role.id===code)) return result(current,false,'角色编码已存在');
  const state=copy(current); state.security.roles.push({id:code,name,type:'自定义角色',users:0,permissions:0,scope,version:'v1',status:'草稿'});
  state.security.audit.push({id:`AUD-260703-${1030+state.security.audit.length}`,time:'10:46:08',event:'role.created',category:'安全配置',actor:'林安',role:'仓库经理',terminal:'WEB-01',object:code,before:'不存在',after:'草稿 v1',reason:'新增业务角色',result:'成功',trace:'TRC-SEC5'});
  return result(state,true,`角色 ${name} 已创建为草稿，请配置权限后发布`);
}
