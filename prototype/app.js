import { kpis } from './data.js?v=6';
import {
  createInitialState, allocateOrders, releaseWave, resolveShortPick,
  setPackageWeight, confirmShipment, twinSummary, receiveInbound,
  freezeInventory, operationsSummary,
  submitCountVariance, inspectReturn, publishRule, retryIntegration, syncPdaQueue,
  deactivateUser, publishRole, simulatePermission, createUser, createRole,
} from './state.js?v=6';
import { createUiState, paginateRows, selectTab, selectTwinLayer, visibleTwinParts, searchWorkspace } from './ui-state.js?v=6';

let state = createInitialState();
let ui = createUiState();
let lastFocus = null;
const root = document.querySelector('#view-root');
const drawer = document.querySelector('#drawer');
const drawerBody = document.querySelector('#drawer-body');
const drawerTitle = document.querySelector('#drawer-title');
const scrim = document.querySelector('#scrim');
const dialogBackdrop = document.querySelector('#dialog-backdrop');
const dialog = document.querySelector('#confirm-dialog');
const toastRegion = document.querySelector('#toast-region');
const sidebar = document.querySelector('.sidebar');

const statusTone = (value) => ({ 待分配:'muted', 已分配:'info', 拣货中:'info', 异常:'danger', 已释放:'success', 草稿:'muted', 待执行:'muted', 执行中:'info', 待处理:'danger', 观察中:'warning', 已发运:'success', 待发运:'warning' }[value] || 'muted');
const badge = (text, tone = statusTone(text)) => `<span class="badge ${tone}"><i></i>${text}</span>`;
const pageHead = (eyebrow, title, desc, actions = '') => `<header class="page-head"><div><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p>${desc}</p></div><div class="head-actions">${actions}</div></header>`;
const rangeRows = (base, total, factory) => Array.from({length:total},(_,index)=>index<base.length?base[index]:factory(index,base[index%base.length]));
const paginationControls = (view, meta) => `<footer class="pagination"><span>共 ${meta.total} 条 · 当前展示 ${meta.from}–${meta.to}</span><div><button data-page-view="${view}" data-page="${meta.page-1}" ${meta.page===1?'disabled':''} aria-label="上一页">‹</button>${Array.from({length:meta.pageCount},(_,i)=>`<button data-page-view="${view}" data-page="${i+1}" class="${meta.page===i+1?'active':''}" aria-label="第 ${i+1} 页">${i+1}</button>`).join('')}<button data-page-view="${view}" data-page="${meta.page+1}" ${meta.page===meta.pageCount?'disabled':''} aria-label="下一页">›</button></div></footer>`;
const tabButton = (view,id,label) => `<button data-tab-view="${view}" data-tab="${id}" class="${ui.tabs[view]===id?'active':''}" aria-pressed="${ui.tabs[view]===id}">${label}</button>`;
const searchDocuments = () => [
  ...state.orders.map(item=>({type:'出库订单',id:item.id,title:`${item.channel} · ${item.city}`,meta:`${item.status} ${item.risk}`,view:'orders'})),
  ...state.inventory.map(item=>({type:'库存',id:item.sku,title:item.product,meta:`${item.location} ${item.batch}`,view:'inventory'})),
  ...state.tasks.map(item=>({type:'作业任务',id:item.id,title:`${item.zone} · ${item.assignee}`,meta:item.status,view:'tasks'})),
  {type:'入库单',id:state.inbound.asnId,title:state.inbound.supplier,meta:state.inbound.status,view:'inbound'},
  {type:'波次',id:state.wave.id,title:'早班出库波次',meta:state.wave.status,view:'waves'},
  {type:'异常',id:state.shortPick.id,title:state.shortPick.product,meta:state.shortPick.status,view:'exceptions'},
  ...state.integrationQueue.map(item=>({type:'接口消息',id:item.id,title:`${item.system} · ${item.event}`,meta:item.status,view:'integrations'})),
];
const searchResultsMarkup = (query) => { const results=searchWorkspace(searchDocuments(),query); if(!query.trim()) return '<div class="search-empty">输入关键词，支持模糊匹配</div>'; if(!results.length) return '<div class="search-empty">未找到匹配结果，请尝试订单号、SKU 或任务号</div>'; return results.map(item=>`<button class="search-result" data-search-view="${item.view}"><span class="badge info">${item.type}</span><span><b>${item.id}</b><small>${item.title} · ${item.meta||''}</small></span><span>→</span></button>`).join(''); };

function toast(message, ok = true, title = ok ? '操作成功' : '需要处理') {
  const item = document.createElement('div');
  item.className = `toast${ok ? '' : ' error'}`;
  item.innerHTML = `<i>${ok ? '✓' : '!'}</i><span><b>${title}</b><p>${message}</p></span>`;
  toastRegion.append(item);
  setTimeout(() => item.remove(), 3600);
}

function setView(view) {
  state.activeView = view;
  document.querySelectorAll('[data-view]').forEach((item) => item.classList.toggle('active', item.dataset.view === view && item.classList.contains('nav-item')));
  sidebar.classList.remove('open');
  document.querySelector('#mobile-menu').setAttribute('aria-expanded', 'false');
  render();
  document.querySelector('#main-content').focus({ preventScroll: true });
}

function render() {
  const views = { dashboard: dashboardView, orders: ordersView, waves: wavesView, tasks: tasksView, shipping: shippingView, exceptions: exceptionsView, twin: twinView, inventory: inventoryView, inbound: inboundView, reports: reportsView, replenishment: replenishmentView, count: countView, returns: returnsView, master: masterView, rules: rulesView, integrations: integrationsView, printing: printingView, admin: adminView, pda: pdaView };
  root.innerHTML = (views[state.activeView] || futureView)(state.activeView);
}

function dashboardView() {
  const cards = kpis.map((item, index) => `<article class="kpi-card ${item.tone}"><div class="kpi-label"><span>${item.label}</span><span class="kpi-icon">${['▤','◎','✓','!'][index]}</span></div><div class="kpi-value">${item.value}</div><div class="kpi-meta"><b>${item.delta}</b><span>${item.helper}</span></div></article>`).join('');
  const rangeText={today:'今日每小时',week:'本周每日',month:'本月每周'}[ui.tabs.dashboard];
  return `<section class="page">
    ${pageHead('CONTROL TOWER', '运营驾驶舱', '2026年7月3日 · 实时掌握履约进度、作业负载与仓内风险', '<button class="btn secondary" data-action="refresh">↻ 刷新数据</button><button class="btn primary" data-view="twin">进入数字孪生</button>')}
    <div class="kpi-grid">${cards}</div>
    <div class="dashboard-grid">
      <article class="panel"><header class="panel-head"><div class="panel-title"><h2>出库履约趋势</h2><p>${rangeText}完成单量与 SLA 目标</p></div><div class="segmented">${tabButton('dashboard','today','今日')}${tabButton('dashboard','week','本周')}${tabButton('dashboard','month','本月')}</div></header><div class="panel-body chart-wrap">
        <svg viewBox="0 0 720 220" role="img" aria-label="今日出库履约趋势图"><defs><linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b82f6" stop-opacity=".2"/><stop offset="1" stop-color="#3b82f6" stop-opacity="0"/></linearGradient></defs><g class="chart-grid"><line x1="42" y1="20" x2="700" y2="20"/><line x1="42" y1="70" x2="700" y2="70"/><line x1="42" y1="120" x2="700" y2="120"/><line x1="42" y1="170" x2="700" y2="170"/></g><path class="chart-area" d="M42 172 C100 160 100 142 160 140 S230 100 285 110 S350 72 410 80 S490 42 545 62 S630 34 700 38 L700 190 L42 190Z"/><path class="chart-target" d="M42 155 L700 52"/><path class="chart-line" d="M42 172 C100 160 100 142 160 140 S230 100 285 110 S350 72 410 80 S490 42 545 62 S630 34 700 38"/><circle class="chart-dot" cx="545" cy="62" r="4"/><g class="chart-label"><text x="32" y="24">1.2k</text><text x="32" y="74">800</text><text x="32" y="124">400</text><text x="42" y="208">06:00</text><text x="200" y="208">08:00</text><text x="365" y="208">10:00</text><text x="530" y="208">12:00</text><text x="675" y="208">14:00</text></g></svg>
      </div></article>
      <article class="panel"><header class="panel-head"><div class="panel-title"><h2>区域作业负载</h2><p>实时任务占用与产能</p></div><button class="link-button" data-view="twin">查看地图 →</button></header><div class="panel-body workload-list">
        ${[['拣选区 A',88,'warning'],['拣选区 B',72,''],['复核包装区',64,''],['发运月台',47,''],['存储区 A',81,'warning']].map(x=>`<div class="workload-row ${x[2]}"><span>${x[0]}</span><div class="progress"><i style="width:${x[1]}%"></i></div><b>${x[1]}%</b></div>`).join('')}
      </div></article>
    </div>
    <div class="mini-grid">
      <article class="panel"><header class="panel-head"><div class="panel-title"><h2>高优先级异常</h2><p>按业务影响排序</p></div><button class="link-button" data-view="exceptions">全部 17 项 →</button></header><div class="panel-body exception-list">
        <button class="exception-item link-button" data-open-shortpick><span class="exception-icon">!</span><span><h3>拣选区短拣 · ${state.shortPick.id}</h3><p>${state.shortPick.product} · 差异 3 件</p></span><time>${state.shortPick.status}</time></button>
        <div class="exception-item"><span class="exception-icon">↻</span><span><h3>OMS 回传重试</h3><p>3 条发运结果等待重试</p></span><time>3分钟前</time></div>
        <div class="exception-item"><span class="exception-icon">⌁</span><span><h3>波次产能临界</h3><p>WV20260703-019 · 拣选区 A</p></span><time>8分钟前</time></div>
      </div></article>
      <article class="panel"><header class="panel-head"><div class="panel-title"><h2>系统协同健康度</h2><p>最近 15 分钟接口状态</p></div>${badge('总体正常','success')}</header><div class="panel-body">
        ${[['OMS 订单中心','99.99% · 42ms',''],['TMS 运输平台','99.92% · 86ms',''],['ERP 主数据','98.71% · 218ms','warning'],['WCS 设备控制','99.98% · 31ms','']].map(x=>`<div class="health-row ${x[2]}"><i></i><span><b>${x[0]}</b><small>请求成功率 · P95</small></span><strong>${x[1]}</strong></div>`).join('')}
      </div></article>
    </div>
  </section>`;
}

function ordersView() {
  const meta=paginateRows(state.orders,ui.pages.orders,ui.pageSize); ui.pages.orders=meta.page;
  const rows = meta.items.map((o) => `<tr data-row-status="${o.status}" data-row-risk="${o.risk}" class="${state.selectedOrders.includes(o.id)?'selected':''}"><td data-label="选择"><input type="checkbox" aria-label="选择订单 ${o.id}" data-order-check value="${o.id}" ${state.selectedOrders.includes(o.id)?'checked':''}></td><td data-label="订单号"><button class="link-button mono" data-order-detail="${o.id}">${o.id}</button></td><td data-label="渠道">${o.channel}</td><td data-label="优先级">${badge(o.priority, o.priority==='加急'?'danger':o.priority==='整箱'?'info':'muted')}</td><td data-label="收货信息">${o.consignee} · ${o.city}</td><td data-label="订单规模"><b>${o.lines}</b> 行 / <b>${o.pieces}</b> 件</td><td data-label="截单时间" class="mono">${o.cutoff}</td><td data-label="状态">${badge(o.status)}</td><td data-label="风险">${badge(o.risk,o.risk==='正常'?'success':o.risk.includes('超时')?'danger':'warning')}</td></tr>`).join('');
  return `<section class="page">${pageHead('OUTBOUND', '出库订单池', '统一校验、分配并组织来自多渠道的履约需求', `<button class="btn secondary" data-action="export">导出</button><button class="btn primary" data-action="allocate">校验并分配 <span id="selected-count">${state.selectedOrders.length?`(${state.selectedOrders.length})`:''}</span></button>`)}
    <div class="workflow-strip"><div class="workflow-step current"><i>1</i>订单分配</div><div class="workflow-step"><i>2</i>波次释放</div><div class="workflow-step"><i>3</i>拣货作业</div><div class="workflow-step"><i>4</i>复核包装</div><div class="workflow-step"><i>5</i>发运交接</div></div>
    <div class="toolbar"><label class="search"><span>⌕</span><input id="order-search" type="search" placeholder="搜索订单号、渠道或收货城市" aria-label="搜索订单"></label><select class="select" data-table-filter="status" aria-label="订单状态"><option value="">全部状态</option><option>待分配</option><option>已分配</option><option>异常</option></select><select class="select" data-table-filter="risk" aria-label="风险等级"><option value="">全部风险</option><option>即将超时</option><option>补货等待</option><option>正常</option></select></div>
    <article class="panel table-panel"><div class="table-wrap"><table class="data-table"><thead><tr><th><input type="checkbox" aria-label="选择本页全部订单" data-check-all></th><th>订单号</th><th>渠道</th><th>优先级</th><th>收货信息</th><th>订单规模</th><th>截单时间</th><th>执行状态</th><th>风险</th></tr></thead><tbody>${rows}</tbody></table></div>${paginationControls('orders',meta)}</article>
  </section>`;
}

function wavesView() {
  const eligible = state.orders.filter(o=>['已分配','拣货中'].includes(o.status));
  return `<section class="page">${pageHead('WAVE ORCHESTRATION', '波次中心', '根据订单时效、库区负载与作业产能智能组织任务', `<button class="btn secondary" data-action="simulate">规则试算</button><button class="btn primary" data-action="release-wave" ${state.wave.status==='已释放'?'disabled':''}>${state.wave.status==='已释放'?'波次已释放':'校验并释放波次'}</button>`)}
    <div class="workflow-strip"><div class="workflow-step done"><i>✓</i>订单分配</div><div class="workflow-step current"><i>2</i>波次释放</div><div class="workflow-step"><i>3</i>拣货作业</div><div class="workflow-step"><i>4</i>复核包装</div><div class="workflow-step"><i>5</i>发运交接</div></div>
    <div class="split-layout"><article class="panel"><header class="panel-head"><div class="panel-title"><h2>候选订单</h2><p>波次 ${state.wave.id} · ${state.wave.status}</p></div>${badge(state.wave.status)}</header><div class="table-wrap"><table class="data-table"><thead><tr><th>订单号</th><th>渠道</th><th>件数</th><th>截单时间</th><th>库区匹配</th><th>状态</th></tr></thead><tbody>${eligible.length?eligible.map(o=>`<tr><td data-label="订单号" class="mono">${o.id}</td><td data-label="渠道">${o.channel}</td><td data-label="件数">${o.pieces}</td><td data-label="截单时间" class="mono">${o.cutoff}</td><td data-label="库区">A/B 区</td><td data-label="状态">${badge(o.status)}</td></tr>`).join(''):`<tr><td colspan="6"><div class="empty-state" style="min-height:250px"><div><div class="empty-icon">≋</div><h2>暂无已分配订单</h2><p>请先前往订单池完成库存分配。</p><button class="btn primary" data-view="orders">前往订单池</button></div></div></td></tr>`}</tbody></table></div></article>
      <aside class="panel summary-card"><h2>释放校验</h2><div class="stat-pair"><div class="stat-box"><small>候选订单</small><b>${eligible.length}</b></div><div class="stat-box"><small>预计任务</small><b>${eligible.length*2}</b></div><div class="stat-box"><small>订单件数</small><b>${eligible.reduce((a,b)=>a+b.pieces,0)}</b></div><div class="stat-box"><small>预计耗时</small><b>${eligible.length?38:0}<small> min</small></b></div></div><div class="capacity-meter"><header><span>拣选产能占用</span><b>${state.wave.capacity}%</b></header><div class="progress"><i style="width:${state.wave.capacity}%"></i></div></div><div class="rule-list"><div class="rule-item"><i>✓</i><span>库存可用量与分配结果一致</span></div><div class="rule-item"><i>✓</i><span>按最早截单时间优先</span></div><div class="rule-item"><i>✓</i><span>拆分 A/B 库区并行拣选</span></div><div class="rule-item"><i>✓</i><span>预留 18% 峰值产能缓冲</span></div></div><p class="muted" style="font-size:10px">释放后将生成不可直接删除的作业任务并保留波次版本。</p></aside>
    </div></section>`;
}

function tasksView() {
  const mode=ui.tabs.tasks; const shownTasks=mode==='running'?state.tasks.filter(t=>t.status==='执行中'):mode==='waiting'?state.tasks.filter(t=>t.status==='待执行'):state.tasks;
  return `<section class="page">${pageHead('EXECUTION', '作业监控', '追踪任务进度、人员负载并及时恢复阻断异常', `<button class="btn secondary" data-action="auto-assign">智能分配</button><button class="btn primary" data-open-shortpick>处理短拣异常</button>`)}
    <div class="workflow-strip"><div class="workflow-step done"><i>✓</i>订单分配</div><div class="workflow-step done"><i>✓</i>波次释放</div><div class="workflow-step current"><i>3</i>拣货作业</div><div class="workflow-step"><i>4</i>复核包装</div><div class="workflow-step"><i>5</i>发运交接</div></div>
    <div class="toolbar"><div class="segmented">${tabButton('tasks','all',`全部任务 ${state.tasks.length}`)}${tabButton('tasks','running','执行中')}${tabButton('tasks','waiting','待领取')}${tabButton('tasks','exception','异常 1')}</div></div>
    <div class="task-grid">${mode!=='exception'?shownTasks.map(task=>`<article class="task-card"><header><h3 class="mono">${task.id}</h3>${badge(task.status)}</header><div class="task-meta"><span>${task.zone} · ${task.pieces} 件</span><b>${task.progress}%</b></div><div class="progress"><i style="width:${task.progress}%"></i></div><footer><span>执行人：${task.assignee}</span><button class="link-button" data-task-detail="${task.id}">详情 →</button></footer></article>`).join(''):''}
      ${mode==='all'||mode==='exception'?`<article class="task-card" style="border-color:#fca5a5;background:#fffafa"><header><h3 class="mono">${state.shortPick.id}</h3>${badge(state.shortPick.status)}</header><div class="task-meta"><span>${state.shortPick.product}</span><b>差异 ${state.shortPick.expected-state.shortPick.actual}</b></div><div class="progress"><i style="width:75%;background:#ef4444"></i></div><footer><span>${state.shortPick.zone} · ${state.shortPick.actual}/${state.shortPick.expected}</span><button class="link-button" data-open-shortpick>立即处置 →</button></footer></article>`:''}
    </div></section>`;
}

function shippingView() {
  const p = state.package, s = state.shipment;
  return `<section class="page">${pageHead('VERIFY & SHIP', '复核发运工作站', '扫描复核、重量校验并完成承运交接', `<button class="btn secondary" data-action="print">打印面单</button><button class="btn primary" data-action="open-ship-dialog" ${s.status==='已发运'?'disabled':''}>${s.status==='已发运'?'已完成发运':'确认发运'}</button>`)}
    <div class="workflow-strip"><div class="workflow-step done"><i>✓</i>订单分配</div><div class="workflow-step done"><i>✓</i>波次释放</div><div class="workflow-step done"><i>✓</i>拣货作业</div><div class="workflow-step current"><i>4</i>复核包装</div><div class="workflow-step ${s.status==='已发运'?'done':''}"><i>${s.status==='已发运'?'✓':'5'}</i>发运交接</div></div>
    <div class="package-card"><article class="panel panel-body scan-box"><div><div class="scan-ring">⌗</div><h2>包裹 ${p.id}</h2><p>模拟扫码已识别 · 订单 SO20260703001</p><div style="margin-top:14px">${badge(s.status)}</div></div></article>
      <article class="panel panel-body"><div class="panel-title"><h2>复核清单</h2><p>3 个 SKU · 18 件商品</p></div><div class="verify-list" style="margin-top:14px"><div class="verify-row"><span><i>✓</i>商品与数量</span><b>18 / 18</b></div><div class="verify-row"><span><i>✓</i>序列号校验</span><b>2 / 2</b></div><div class="verify-row"><span><i>✓</i>包装材料</span><b>BX-M02</b></div><div class="verify-row"><span><i>${p.verified?'✓':'!'}</i>包裹重量</span><div class="weight-control"><input id="package-weight" type="number" min="0" step="0.1" value="${p.weight}" aria-label="包裹重量，千克"><b>kg</b></div></div><div class="weight-result ${p.verified?'':'error'}">${p.verified?'重量在允许偏差内 · 预计 8.2kg ±0.5kg':'重量超出阈值，发运已被拦截'}</div></div><div class="detail-grid" style="margin-top:14px"><div class="detail-cell"><small>承运商</small><b>${s.carrier}</b></div><div class="detail-cell"><small>运单号</small><b class="mono">${s.waybill}</b></div><div class="detail-cell"><small>发运月台</small><b>D-06</b></div><div class="detail-cell"><small>车次截止</small><b>11:00</b></div></div></article>
    </div></section>`;
}

function exceptionsView() {
  return `<section class="page">${pageHead('EXCEPTION CONTROL', '异常中心', '统一识别、分派、恢复并审计仓内业务异常', '<button class="btn secondary" data-action="rules">异常规则</button>')}
    <div class="kpi-grid"><article class="kpi-card danger"><div class="kpi-label">阻断异常</div><div class="kpi-value">${state.shortPick.status==='待处理'?3:2}</div><div class="kpi-meta"><b>需立即处理</b></div></article><article class="kpi-card warning"><div class="kpi-label">预警</div><div class="kpi-value">14</div><div class="kpi-meta"><b>较昨日 -2</b></div></article><article class="kpi-card"><div class="kpi-label">平均恢复时长</div><div class="kpi-value">12m</div><div class="kpi-meta"><b>目标 ≤ 15m</b></div></article><article class="kpi-card success"><div class="kpi-label">今日闭环率</div><div class="kpi-value">94.8%</div><div class="kpi-meta"><b>+1.2%</b></div></article></div>
    <article class="panel table-panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>异常编号</th><th>类型</th><th>业务对象</th><th>区域</th><th>严重度</th><th>状态</th><th>发生时间</th><th>处置</th></tr></thead><tbody><tr><td data-label="异常编号" class="mono">${state.shortPick.id}</td><td data-label="类型">拣货短拣</td><td data-label="业务对象">${state.shortPick.orderId}</td><td data-label="区域">${state.shortPick.zone}</td><td data-label="严重度">${badge('阻断','danger')}</td><td data-label="状态">${badge(state.shortPick.status)}</td><td data-label="发生时间">09:42</td><td data-label="处置"><button class="link-button" data-open-shortpick>查看处置 →</button></td></tr><tr><td data-label="异常编号" class="mono">EX260703-0084</td><td data-label="类型">接口重试</td><td data-label="业务对象">SHIP260703-052</td><td data-label="区域">TMS</td><td data-label="严重度">${badge('警告','warning')}</td><td data-label="状态">${badge('重试中','info')}</td><td data-label="发生时间">09:38</td><td data-label="处置"><button class="link-button" data-action="retry">立即重试</button></td></tr><tr><td data-label="异常编号" class="mono">EX260703-0079</td><td data-label="类型">称重差异</td><td data-label="业务对象">LPN2607030081</td><td data-label="区域">复核台 P-03</td><td data-label="严重度">${badge('警告','warning')}</td><td data-label="状态">${badge('待处理','danger')}</td><td data-label="发生时间">09:21</td><td data-label="处置"><button class="link-button" data-view="shipping">前往复核 →</button></td></tr></tbody></table></div></article>
  </section>`;
}

function twinView() {
  const summary = twinSummary(state);
  const parts=visibleTwinParts(ui);
  const zones = summary.zones.map(z=>`<button class="zone ${parts.heat?z.tone:''} ${state.twin.selectedZone===z.id?'selected':''}" data-zone="${z.id}" style="left:${z.x}%;top:${z.y}%;width:${z.w}%;height:${z.h}%"><h3>${z.name}</h3><div class="zone-stats"><span>${ui.twinLayer==='tasks'?'任务密度':'利用率'}<b>${ui.twinLayer==='tasks'?z.tasks:z.utilization+(ui.twinLayer==='utilization'?'%':'')}</b></span><span>${ui.twinLayer==='equipment'?'设备':'任务'}<b>${ui.twinLayer==='equipment'?(z.id==='picking'?'7/8':'4/4'):z.tasks}</b></span></div></button>`).join('');
  return `<section class="page twin-page">${pageHead('DIGITAL TWIN · LIVE', '仓库数字孪生', '实时映射库区负载、作业任务、人员设备与风险告警', '<button class="btn secondary" data-action="locate-alert">⌖ 定位短拣</button>')}
    <div class="twin-layout"><div class="twin-canvas layer-${ui.twinLayer}" aria-label="华东一号仓数字孪生俯视画布"><div class="twin-toolbar" role="toolbar" aria-label="孪生图层">${[['utilization','利用率'],['tasks','任务热力'],['equipment','人员设备'],['alerts','告警']].map(([id,label])=>`<button data-layer="${id}" class="${ui.twinLayer===id?'active':''}" aria-pressed="${ui.twinLayer===id}">${label}</button>`).join('')}</div><div class="twin-meta"><span><i class="status-dot"></i>数据延迟 1.2s</span><span>F1 · 28,600m²</span></div>
      <div class="warehouse-map"><div class="map-aisle" style="left:0;top:39%;width:100%;height:4%"></div><div class="map-aisle" style="left:57%;top:0;width:2%;height:100%"></div>${zones}
        ${parts.equipment?'<span class="entity" style="left:18%;top:51%" title="拣货员 周宇">人</span><span class="entity" style="left:38%;top:58%" title="拣货员 陈晨">人</span><span class="entity forklift" style="left:48%;top:23%" title="叉车 FL-08">F</span><span class="entity agv" style="left:68%;top:40%" title="AGV-12">A</span><span class="entity agv" style="left:78%;top:63%" title="AGV-09">A</span>':''}
        ${parts.routes?'<span class="route" style="left:20%;top:53%;width:42%;transform:rotate(-3deg)"></span><span class="route" style="left:58%;top:61%;width:29%;transform:rotate(8deg)"></span>':''}
        ${parts.alerts?(state.shortPick.status==='待处理'?'<button class="map-alert" data-open-shortpick style="left:33%;top:50%"><i></i>短拣 · 差异 3 件</button>':'<div class="map-alert" style="left:33%;top:50%;border-color:rgba(251,191,36,.45);background:rgba(120,53,15,.88)"><i style="background:#fbbf24"></i>短拣已重分配 · 观察中</div>'):''}
      </div></div>
      <aside class="twin-side"><section class="dark-panel"><header class="panel-head"><div class="panel-title"><h2>实时态势</h2><p>全仓运行摘要</p></div>${badge('LIVE','success')}</header><div class="dark-stat-grid"><div class="dark-stat"><small>在线人员</small><b>86</b></div><div class="dark-stat"><small>运行设备</small><b>24/26</b></div><div class="dark-stat"><small>进行中任务</small><b>${state.tasks.length+117}</b></div><div class="dark-stat"><small>阻断告警</small><b style="color:#fca5a5">${summary.blockingAlerts}</b></div></div></section>
        <section class="dark-panel"><header class="panel-head"><div class="panel-title"><h2>实时告警</h2><p>按影响等级排序</p></div></header><div class="dark-alerts"><div class="dark-alert"><i></i><span><b>拣选区短拣</b><small>${state.shortPick.product} · ${state.shortPick.status}</small></span><button data-open-shortpick>查看</button></div><div class="dark-alert warning"><i></i><span><b>存储区 A 高位占用</b><small>利用率 86% · 建议补货平衡</small></span><button data-zone="storage-a">定位</button></div><div class="dark-alert warning"><i></i><span><b>叉车 FL-03 离线</b><small>最后心跳 6 分钟前</small></span><button data-action="dispatch">派单</button></div></div></section>
        <section class="dark-panel"><header class="panel-head"><div class="panel-title"><h2>图例</h2></div></header><div class="legend"><div class="legend-row"><i></i>运行正常 / 低负载</div><div class="legend-row"><i class="warning"></i>容量预警 / 需关注</div><div class="legend-row"><i class="danger"></i>阻断异常 / 需处置</div></div></section>
      </aside></div></section>`;
}

function inventoryView() {
  const total = state.inventory.reduce((sum,item)=>sum+item.onHand,0);
  const available = state.inventory.reduce((sum,item)=>sum+item.available,0);
  const meta=paginateRows(state.inventory,ui.pages.inventory,ui.pageSize); ui.pages.inventory=meta.page;
  return `<section class="page">${pageHead('INVENTORY LEDGER', '库存中心', '以库位、批次和库存状态为主线，统一查看可用、占用与冻结余额', '<button class="btn secondary" data-action="inventory-reconcile">库存对账</button><button class="btn primary" data-action="open-freeze">冻结库存</button>')}
    <div class="kpi-grid"><article class="kpi-card"><div class="kpi-label">当前在库</div><div class="kpi-value">${total.toLocaleString()}</div><div class="kpi-meta"><b>3 个 SKU</b><span>当前筛选范围</span></div></article><article class="kpi-card success"><div class="kpi-label">可用库存</div><div class="kpi-value">${available.toLocaleString()}</div><div class="kpi-meta"><b>${((available/total)*100).toFixed(1)}%</b><span>可参与分配</span></div></article><article class="kpi-card warning"><div class="kpi-label">已分配</div><div class="kpi-value">${state.inventory.reduce((s,i)=>s+i.allocated,0).toLocaleString()}</div><div class="kpi-meta"><b>待出库</b><span>锁定至订单</span></div></article><article class="kpi-card danger"><div class="kpi-label">冻结库存</div><div class="kpi-value">${state.inventory.reduce((s,i)=>s+i.frozen,0)}</div><div class="kpi-meta"><b>${state.inventoryAudit.length} 条变更</b><span>全程可审计</span></div></article></div>
    <div class="toolbar"><label class="search"><span>⌕</span><input id="inventory-search" type="search" placeholder="搜索 SKU、商品、库位或批次" aria-label="搜索库存"></label><select class="select" aria-label="库存状态"><option>全部库存状态</option><option>可用</option><option>已分配</option><option>冻结</option></select><select class="select" aria-label="库区"><option>全部库区</option><option>存储区 A</option><option>存储区 B</option></select></div>
    <article class="panel table-panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>SKU / 商品</th><th>库位</th><th>批次</th><th>在库</th><th>已分配</th><th>可用</th><th>冻结</th><th>库存状态</th><th>操作</th></tr></thead><tbody>${meta.items.map(i=>`<tr><td data-label="商品"><b class="mono">${i.sku}</b><br><span class="muted">${i.product}</span></td><td data-label="库位" class="mono">${i.location}</td><td data-label="批次" class="mono">${i.batch}</td><td data-label="在库"><b>${i.onHand}</b></td><td data-label="已分配">${i.allocated}</td><td data-label="可用"><b style="color:#047857">${i.available}</b></td><td data-label="冻结">${i.frozen}</td><td data-label="状态">${badge(i.frozen?'部分冻结':'可用',i.frozen?'warning':'success')}</td><td data-label="操作"><button class="link-button" data-inventory-detail="${i.sku}">查看台账 →</button></td></tr>`).join('')}</tbody></table></div>${paginationControls('inventory',meta)}</article>
    ${state.inventoryAudit.length?`<article class="panel" style="margin-top:16px"><header class="panel-head"><div class="panel-title"><h2>最近库存事务</h2><p>受控操作与审计证据</p></div></header><div class="panel-body timeline">${state.inventoryAudit.map(a=>`<div class="timeline-item"><b>${a.sku} 冻结 ${a.quantity} 件 · ${a.reason}</b><small>${a.time} · ${a.actor}</small></div>`).join('')}</div></article>`:''}
  </section>`;
}

function inboundView() {
  const inbound=state.inbound;
  return `<section class="page">${pageHead('INBOUND RECEIVING', '入库管理', '从 ASN 预约、收货差异到质检与上架任务的可追溯闭环', '<button class="btn secondary" data-action="scan-asn">模拟扫描 ASN</button>')}
    <div class="workflow-strip"><div class="workflow-step ${inbound.status==='待收货'?'current':'done'}"><i>${inbound.status==='待收货'?'1':'✓'}</i>预约到仓</div><div class="workflow-step ${inbound.status==='待收货'?'':'done'}"><i>${inbound.status==='待收货'?'2':'✓'}</i>收货确认</div><div class="workflow-step ${inbound.status==='待上架'?'current':''}"><i>3</i>质检判定</div><div class="workflow-step"><i>4</i>上架任务</div><div class="workflow-step"><i>5</i>入库完成</div></div>
    <div class="split-layout"><article class="panel"><header class="panel-head"><div class="panel-title"><h2>今日预约到货</h2><p>月台 D-02 · 预计 10:30 到仓</p></div>${badge(inbound.status)}</header><div class="panel-body"><div class="detail-grid"><div class="detail-cell"><small>ASN 单号</small><b class="mono">${inbound.asnId}</b></div><div class="detail-cell"><small>供应商</small><b>${inbound.supplier}</b></div><div class="detail-cell"><small>采购单</small><b class="mono">PO260701-118</b></div><div class="detail-cell"><small>承运车辆</small><b>沪A·8W21Q</b></div></div><div class="verify-list" style="margin-top:16px"><div class="verify-row"><span><i>✓</i>ASN 与采购单匹配</span><b>已校验</b></div><div class="verify-row"><span><i>✓</i>商品与包装规则</span><b>2 箱 / ${inbound.expected} 件</b></div><div class="verify-row"><span><i>${inbound.received?'✓':'⌗'}</i>实收数量</span><b>${inbound.received} / ${inbound.expected}</b></div></div></div></article>
      <aside class="panel summary-card"><h2>收货工作台</h2><form id="inbound-form" class="form-grid" novalidate><div class="field"><label for="inbound-asn">ASN 单号</label><input id="inbound-asn" value="${inbound.asnId}" readonly></div><div class="field"><label for="received-quantity">实收数量 *</label><input id="received-quantity" type="number" min="1" max="${inbound.expected}" value="${inbound.received||inbound.expected}"><p class="field-error" id="inbound-error" hidden></p></div><div class="field"><label for="quality-result">质检策略</label><select id="quality-result"><option>免检 · 直接生成上架任务</option><option>抽检 · 10%</option><option>全检</option></select></div><button class="btn primary" type="submit" ${inbound.status==='待上架'?'disabled':''}>${inbound.status==='待上架'?'收货已确认':'确认收货并生成上架'}</button></form>${inbound.putawayTasks?`<div class="weight-result" style="margin-top:14px">已生成 ${inbound.putawayTasks} 个上架任务，推荐目标库区：存储区 A。</div>`:''}</aside>
    </div></section>`;
}

function reportsView() {
  const s=operationsSummary(state);
  return `<section class="page">${pageHead('OPERATIONS ANALYTICS', '分析报表', '统一观察入库、库存、出库和人员作业效率，定位趋势与瓶颈', `<select class="select" id="report-range" aria-label="报表时间范围"><option ${ui.tabs.reports==='today'?'selected':''}>今日</option><option ${ui.tabs.reports==='week'?'selected':''}>本周</option><option ${ui.tabs.reports==='month'?'selected':''}>本月</option></select><button class="btn secondary" data-action="report-export">导出报表</button>`)}
    <div class="kpi-grid"><article class="kpi-card"><div class="kpi-label">今日收货</div><div class="kpi-value">${s.receivedToday.toLocaleString()}</div><div class="kpi-meta"><b>+8.2%</b><span>件</span></div></article><article class="kpi-card success"><div class="kpi-label">出库完成率</div><div class="kpi-value">${s.outboundCompletion}%</div><div class="kpi-meta"><b>目标 98.5%</b></div></article><article class="kpi-card success"><div class="kpi-label">库存准确率</div><div class="kpi-value">${s.inventoryAccuracy}%</div><div class="kpi-meta"><b>目标 99.9%</b></div></article><article class="kpi-card warning"><div class="kpi-label">任务效率指数</div><div class="kpi-value">${s.taskEfficiency}</div><div class="kpi-meta"><b>+2.1</b><span>较昨日</span></div></article></div>
    <div class="dashboard-grid"><article class="panel"><header class="panel-head"><div class="panel-title"><h2>仓内吞吐趋势</h2><p>收货、上架、拣货与发运每小时完成量</p></div><div>${badge('实时','success')}</div></header><div class="panel-body chart-wrap"><svg viewBox="0 0 720 220" role="img" aria-label="仓内吞吐趋势"><g class="chart-grid"><line x1="42" y1="20" x2="700" y2="20"/><line x1="42" y1="70" x2="700" y2="70"/><line x1="42" y1="120" x2="700" y2="120"/><line x1="42" y1="170" x2="700" y2="170"/></g><path d="M42 155 C130 135 165 145 230 112 S360 88 420 78 S570 55 700 42" class="chart-line"/><path d="M42 170 C130 160 180 130 240 138 S350 118 430 105 S560 92 700 72" fill="none" stroke="#10b981" stroke-width="2"/><path d="M42 182 C120 170 190 168 250 150 S370 142 440 120 S590 110 700 96" fill="none" stroke="#f59e0b" stroke-width="2"/><g class="chart-label"><text x="42" y="208">06:00</text><text x="200" y="208">08:00</text><text x="365" y="208">10:00</text><text x="530" y="208">12:00</text><text x="675" y="208">14:00</text></g></svg></div></article>
      <article class="panel"><header class="panel-head"><div class="panel-title"><h2>流程健康评分</h2><p>结合 SLA、差异与积压</p></div></header><div class="panel-body workload-list">${[['收货与上架',92,''],['库存准确性',99,''],['订单分配',96,''],['拣货执行',88,'warning'],['复核发运',97,'']].map(x=>`<div class="workload-row ${x[2]}"><span>${x[0]}</span><div class="progress"><i style="width:${x[1]}%"></i></div><b>${x[1]}</b></div>`).join('')}<button class="btn secondary" data-view="twin" style="margin-top:10px">在数字孪生中定位瓶颈</button></div></article></div>
    <div class="mini-grid"><article class="panel"><header class="panel-head"><div class="panel-title"><h2>效率洞察</h2><p>系统根据实时作业数据生成</p></div></header><div class="panel-body rule-list"><div class="rule-item"><i>↗</i><span><b>拣选区 A 接近容量上限</b><br>建议将下一波次的 18% 任务平衡至 B 区。</span></div><div class="rule-item"><i>✓</i><span><b>短拣恢复时间改善</b><br>跨区重分配策略使平均恢复时长下降 3.8 分钟。</span></div></div></article><article class="panel"><header class="panel-head"><div class="panel-title"><h2>数据新鲜度</h2><p>指标来源与最近更新时间</p></div></header><div class="panel-body">${[['WMS 事务库','10:22:06'],['OMS 订单中心','10:21:58'],['TMS 运输平台','10:21:42'],['WCS 设备事件','10:22:04']].map(x=>`<div class="health-row"><i></i><span><b>${x[0]}</b><small>增量同步正常</small></span><strong>${x[1]}</strong></div>`).join('')}</div></article></div>
  </section>`;
}

function replenishmentView() {
  const rows=rangeRows([['RP260703-031','拣选区 A / A-PK-018','SKU-RF22-081','120 → 600','480','紧急','待释放'],['RP260703-030','拣选区 B / B-PK-006','SKU-PK08-116','8 → 32','24','普通','执行中'],['RP260703-029','拣选区 A / A-PK-022','SKU-AX19-042','6 → 30','24','普通','已完成']],14,(i)=>[`RP260703-${String(31-i).padStart(3,'0')}`,`拣选区 ${i%2?'A':'B'} / ${i%2?'A':'B'}-PK-${String(i+8).padStart(3,'0')}`,`SKU-DM${String(i+1).padStart(2,'0')}-${100+i}`,`${4+i} → ${24+i*3}`,`${20+i*2}`,i%5===0?'紧急':'普通',['待释放','执行中','已完成'][i%3]]); const meta=paginateRows(rows,ui.pages.replenishment,ui.pageSize); ui.pages.replenishment=meta.page;
  return `<section class="page">${pageHead('REPLENISHMENT', '补货管理', '根据拣选位上下限、波次需求与库区容量生成不重复的补货任务','<button class="btn secondary" data-action="replenish-simulate">需求试算</button><button class="btn primary" data-action="release-replenishment">释放补货任务</button>')}<div class="kpi-grid">${[['待补货 SKU','18','5 紧急'],['预计补货量','2,486','件'],['执行中任务','9','3 即将超时'],['今日完成率','96.2%','目标 95%']].map((x,i)=>`<article class="kpi-card ${i===2?'warning':i===3?'success':''}"><div class="kpi-label">${x[0]}</div><div class="kpi-value">${x[1]}</div><div class="kpi-meta"><b>${x[2]}</b></div></article>`).join('')}</div><article class="panel table-panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>任务</th><th>目标拣选位</th><th>SKU</th><th>当前 → 上限</th><th>建议量</th><th>优先级</th><th>状态</th><th>操作</th></tr></thead><tbody>${meta.items.map(r=>`<tr>${r.map((c,i)=>`<td data-label="${['任务','库位','SKU','上下限','建议量','优先级','状态'][i]||'操作'}">${i===5?badge(c,c==='紧急'?'danger':'muted'):i===6?badge(c):c}</td>`).join('')}<td><button class="link-button" data-action="replenish-detail">详情 →</button></td></tr>`).join('')}</tbody></table></div>${paginationControls('replenishment',meta)}</article></section>`;
}

function countView() {
  const c=state.count;
  return `<section class="page">${pageHead('CYCLE COUNT', '盘点中心', '支持计划、循环、动碰与临时盘点，差异超过阈值自动进入复盘或审批','<button class="btn secondary" data-action="create-count">新建盘点计划</button>')}<div class="split-layout"><article class="panel"><header class="panel-head"><div class="panel-title"><h2>当前盲盘任务</h2><p>${c.id} · 拣选区 A</p></div>${badge(c.status)}</header><div class="panel-body"><div class="detail-grid"><div class="detail-cell"><small>盘点模式</small><b>${c.mode}（隐藏账面数）</b></div><div class="detail-cell"><small>盘点 SKU</small><b>${c.sku}</b></div><div class="detail-cell"><small>盘点库位</small><b>A-01-03-02</b></div><div class="detail-cell"><small>冻结策略</small><b>冻结库位出库</b></div></div><div class="weight-result ${c.status==='待审批'?'error':''}" style="margin-top:14px">${c.status==='盘点中'?'盲盘模式已启用：盘点员无法查看账面数量。':`实盘 ${c.counted} 件，差异 ${c.variance} 件，已生成差异审批。`}</div></div></article><aside class="panel summary-card"><h2>提交初盘</h2><form id="count-form" class="form-grid"><div class="field"><label for="counted-quantity">实盘数量 *</label><input id="counted-quantity" type="number" min="0" value="119"></div><div class="field"><label for="count-note">盘点备注</label><input id="count-note" value="库位实物已全部清点"></div><button class="btn primary" type="submit" ${c.status!=='盘点中'?'disabled':''}>${c.status==='盘点中'?'提交初盘结果':'已提交审批'}</button></form></aside></div></section>`;
}

function returnsView() {
  const r=state.returnOrder;
  return `<section class="page">${pageHead('RETURN INSPECTION', '退货中心', '关联 RMA、原订单和序列号，完成良品入库、隔离、返工或报损处置','<button class="btn secondary" data-action="scan-rma">扫描 RMA</button>')}<div class="split-layout"><article class="panel"><header class="panel-head"><div class="panel-title"><h2>退货质检单</h2><p>${r.id} · 原订单 ${r.orderId}</p></div>${badge(r.status)}</header><div class="panel-body"><div class="detail-grid"><div class="detail-cell"><small>商品</small><b>${r.product}</b></div><div class="detail-cell"><small>预期序列号</small><b class="mono">${r.serial}</b></div><div class="detail-cell"><small>退货原因</small><b>功能异常</b></div><div class="detail-cell"><small>原包裹</small><b>LPN2606280188</b></div></div><div class="rule-list"><div class="rule-item"><i>✓</i>原订单与 RMA 关联有效</div><div class="rule-item"><i>✓</i>商品处于可退货时限内</div></div></div></article><aside class="panel summary-card"><h2>质检处置</h2><form id="return-form" class="form-grid"><div class="field"><label for="return-serial">扫描序列号 *</label><input id="return-serial" value="${r.serial}"></div><div class="field"><label for="return-disposition">处置结果</label><select id="return-disposition"><option>良品入库</option><option>残次隔离</option><option>返工</option><option>退供</option><option>报损</option></select></div><p class="field-error" id="return-error" hidden></p><button class="btn primary" type="submit" ${r.status!=='待质检'?'disabled':''}>${r.status==='待质检'?'完成质检处置':r.status}</button></form></aside></div></section>`;
}

function masterView() {
  const datasets={
    locations:{headers:['编码','类型','所属区域','容量占用','温层','状态'],rows:rangeRows([['A-01-03-02','存储位','存储区 A','1.2 / 1.8m³','常温','启用'],['B-PK-006','拣选位','拣选区 B','32 / 40 件','常温','启用']],14,(i)=>[`A-${String(i%4+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}-01`,i%3?'存储位':'拣选位',`存储区 ${i%2?'A':'B'}`,`${.6+(i%8)/10} / 1.8m³`,'常温',i%7?'启用':'限制'])},
    products:{headers:['SKU','商品名称','基础单位','箱规','批次策略','状态'],rows:rangeRows([['SKU-AX19-042','智能温湿度传感器','件','12件/箱','批次+序列号','启用']],13,(i)=>[`SKU-${['RF','PK','BX'][i%3]}${String(100+i)}`,['RFID抗金属标签','工业扫码器','防静电周转箱'][i%3],'件',`${6+(i%4)*6}件/箱`,i%2?'批次+效期':'序列号','启用'])},
    barcodes:{headers:['扫描码','类型','映射 SKU','包装层级','来源','状态'],rows:rangeRows([['6971234567890','主条码','SKU-AX19-042','单件','主数据平台','有效']],12,(i)=>[`69712345${String(67900+i)}`,i%2?'辅条码':'箱码',`SKU-${['RF','PK','BX'][i%3]}${100+i}`,i%2?'单件':'整箱','ERP','有效'])},
    owners:{headers:['组织/货主编码','名称','类型','授权仓库','数据来源','状态'],rows:rangeRows([['OWN-001','星云智能科技','货主','华东一号仓','ERP','启用']],11,(i)=>[`OWN-${String(i+2).padStart(3,'0')}`,['华东商贸','极光零售','北辰制造'][i%3],i%4?'货主':'业务组织',i%2?'华东一号仓':'华东/华南仓','主数据平台','启用'])},
  }; const dataset=datasets[ui.tabs.master]; const meta=paginateRows(dataset.rows,ui.pages.master,ui.pageSize); ui.pages.master=meta.page;
  return `<section class="page">${pageHead('MASTER DATA', '主数据中心', '维护组织、货主、仓库、库位、商品、包装、条码和库存属性','<button class="btn secondary" data-action="sync-master">同步主数据</button><button class="btn primary" data-action="new-master">新增主数据</button>')}<div class="toolbar"><div class="segmented">${tabButton('master','locations','仓库与库位')}${tabButton('master','products','商品与包装')}${tabButton('master','barcodes','条码映射')}${tabButton('master','owners','组织与货主')}</div><label class="search"><span>⌕</span><input class="list-search" type="search" placeholder="搜索当前列表"></label></div><article class="panel table-panel"><div class="table-wrap"><table class="data-table"><thead><tr>${dataset.headers.map(h=>`<th>${h}</th>`).join('')}<th>操作</th></tr></thead><tbody>${meta.items.map(r=>`<tr>${r.map((c,i)=>`<td data-label="${dataset.headers[i]}">${i===5?badge(c,c==='限制'?'warning':'success'):c}</td>`).join('')}<td><button class="link-button" data-action="location-detail">编辑 →</button></td></tr>`).join('')}</tbody></table></div>${paginationControls('master',meta)}</article></section>`;
}

function rulesView() {
  const meta=paginateRows(state.rules,ui.pages.rules,ui.pageSize); ui.pages.rules=meta.page;
  return `<section class="page">${pageHead('RULE ENGINE', '规则中心', '配置分配、上架、波次、拣选、补货与效期规则，并保留版本和审批链','<button class="btn secondary" data-action="rule-simulate">样例试算</button><button class="btn primary" data-action="open-rule">创建新版本</button>')}<article class="panel table-panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>规则编号</th><th>名称</th><th>适用范围</th><th>优先级</th><th>版本</th><th>状态</th><th>最近发布</th><th>操作</th></tr></thead><tbody>${meta.items.map(r=>`<tr><td class="mono">${r.id}</td><td>${r.name}</td><td>${r.scope}</td><td>${r.priority}</td><td>${r.version}</td><td>${badge(r.status,r.status==='已发布'?'success':'muted')}</td><td>林安 · 2026-07-02</td><td><button class="link-button" data-action="rule-detail">版本记录 →</button></td></tr>`).join('')}</tbody></table></div>${paginationControls('rules',meta)}</article><div class="mini-grid"><article class="panel panel-body"><h2 style="font-size:14px;margin-top:0">规则发布保护</h2><div class="rule-list"><div class="rule-item"><i>✓</i>发布前执行范围与优先级冲突检测</div><div class="rule-item"><i>✓</i>已发布规则只能创建新版本</div><div class="rule-item"><i>✓</i>历史任务保留生成时规则版本</div></div></article><article class="panel panel-body"><h2 style="font-size:14px;margin-top:0">待审批变更</h2><div class="exception-item"><span class="exception-icon">⌁</span><span><h3>FEFO 最小剩余效期</h3><p>v4 · 待供应链负责人审批</p></span>${badge('待审批','warning')}</div></article></div></section>`;
}

function integrationsView() {
  const q=state.integrationQueue[0];
  return `<section class="page">${pageHead('INTEGRATION OPS', '集成平台', '监控 API、消息事件、幂等请求、失败重试与上下游对账','<button class="btn secondary" data-action="reconcile">业务对账</button><button class="btn primary" data-action="integration-docs">接口目录</button>')}<div class="kpi-grid">${[['今日请求','1.84M','+11.2%'],['成功率','99.96%','目标 99.9%'],['P95 延迟','84ms','稳定'],['人工队列',q.status==='成功'?'0':'1',q.status]].map((x,i)=>`<article class="kpi-card ${i===1?'success':i===3&&q.status!=='成功'?'danger':''}"><div class="kpi-label">${x[0]}</div><div class="kpi-value">${x[1]}</div><div class="kpi-meta"><b>${x[2]}</b></div></article>`).join('')}</div><article class="panel table-panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>消息 ID</th><th>系统</th><th>事件</th><th>追踪 ID</th><th>重试</th><th>状态</th><th>最后响应</th><th>操作</th></tr></thead><tbody><tr><td class="mono">${q.id}</td><td>${q.system}</td><td class="mono">${q.event}</td><td class="mono">TRC-8F21A6</td><td>${q.retries}</td><td>${badge(q.status,q.status==='成功'?'success':'danger')}</td><td>${q.status==='成功'?'200 OK':'504 Gateway Timeout'}</td><td><button class="link-button" data-action="retry-integration" ${q.status==='成功'?'disabled':''}>${q.status==='成功'?'已恢复':'重新执行'}</button></td></tr><tr><td class="mono">MSG-260703-0097</td><td>OMS</td><td class="mono">order_created</td><td class="mono">TRC-7D18C4</td><td>0</td><td>${badge('成功','success')}</td><td>200 OK</td><td><button class="link-button" data-action="trace-detail">查看链路</button></td></tr></tbody></table></div></article></section>`;
}

function printingView() {
  return `<section class="page">${pageHead('PRINT SERVICE', '打印中心', '管理标签与单据模板、打印队列、失败重试和受控重打','<button class="btn secondary" data-action="printer-test">打印机测试</button><button class="btn primary" data-action="new-print">创建打印任务</button>')}<div class="split-layout"><article class="panel"><header class="panel-head"><div class="panel-title"><h2>打印队列</h2><p>业务数据与打印任务解耦</p></div>${badge('服务在线','success')}</header><div class="table-wrap"><table class="data-table"><thead><tr><th>任务</th><th>模板</th><th>打印机</th><th>份数</th><th>状态</th><th>操作</th></tr></thead><tbody><tr><td class="mono">PR260703-0918</td><td>顺丰电子面单 v8</td><td>PT-06</td><td>1</td><td>${badge('已完成','success')}</td><td><button class="link-button" data-action="reprint">受控重打</button></td></tr><tr><td class="mono">PR260703-0917</td><td>库位标签 v3</td><td>PT-02</td><td>24</td><td>${badge('可重试','danger')}</td><td><button class="link-button" data-action="retry-print">重试</button></td></tr><tr><td class="mono">PR260703-0916</td><td>装箱单 v5</td><td>PT-06</td><td>1</td><td>${badge('排队中','info')}</td><td><button class="link-button" data-action="print-detail">详情</button></td></tr></tbody></table></div></article><aside class="panel summary-card"><h2>模板覆盖</h2><div class="stat-pair"><div class="stat-box"><small>商品标签</small><b>8</b></div><div class="stat-box"><small>容器/库位</small><b>12</b></div><div class="stat-box"><small>箱唛/面单</small><b>16</b></div><div class="stat-box"><small>业务单据</small><b>9</b></div></div><div class="rule-list"><div class="rule-item"><i>✓</i>按货主、仓库与渠道匹配模板</div><div class="rule-item"><i>✓</i>重打记录原因、次数与操作者</div></div></aside></div></section>`;
}

function adminView() {
  const sec=state.security; const tab=ui.tabs.admin;
  const tabs=`<div class="toolbar"><div class="segmented">${tabButton('admin','approvals','审批中心')}${tabButton('admin','users','用户管理')}${tabButton('admin','roles','角色管理')}${tabButton('admin','permissions','权限管理')}${tabButton('admin','audit','审计日志')}</div></div>`;
  const approvals=`<div class="kpi-grid"><article class="kpi-card warning"><div class="kpi-label">待我审批</div><div class="kpi-value">${sec.approvals.length}</div><div class="kpi-meta"><b>1 项高风险</b></div></article><article class="kpi-card"><div class="kpi-label">即将超时</div><div class="kpi-value">1</div><div class="kpi-meta"><b>剩余 38 分钟</b></div></article><article class="kpi-card success"><div class="kpi-label">今日已处理</div><div class="kpi-value">12</div><div class="kpi-meta"><b>平均 8.6 分钟</b></div></article><article class="kpi-card"><div class="kpi-label">执行失败</div><div class="kpi-value">0</div><div class="kpi-meta"><b>受控事务正常</b></div></article></div><article class="panel table-panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>审批单</th><th>类型</th><th>申请人</th><th>业务对象</th><th>变更摘要</th><th>风险</th><th>当前节点 / SLA</th><th>操作</th></tr></thead><tbody>${sec.approvals.map(a=>`<tr><td class="mono">${a.id}</td><td>${a.type}</td><td>${a.applicant}</td><td>${a.object}</td><td>${a.summary}</td><td>${badge(a.risk==='高'?'高风险':a.risk,a.risk==='高'?'danger':'warning')}</td><td>${a.node}<br><span class="muted">${a.sla}</span></td><td><button class="link-button" data-action="approval-detail">处理 →</button></td></tr>`).join('')}</tbody></table></div></article>`;
  const users=`<article class="panel table-panel"><header class="panel-head"><div class="panel-title"><h2>用户账号</h2><p>账号生命周期、认证来源、角色与工作交接</p></div><button class="btn primary" data-action="new-user">新增用户</button></header><div class="table-wrap"><table class="data-table"><thead><tr><th>账号 / 姓名</th><th>工号</th><th>组织 / 仓库</th><th>岗位与角色</th><th>认证来源</th><th>最近登录</th><th>状态</th><th>操作</th></tr></thead><tbody>${sec.users.map(u=>`<tr><td><b>${u.account}</b><br><span class="muted">${u.name}</span></td><td>${u.employeeNo}</td><td>${u.organization}<br><span class="muted">${u.warehouse}</span></td><td>${u.position}<br><span class="muted">${u.roles.join('、')}</span></td><td>${u.source}</td><td>${u.lastLogin}</td><td>${badge(u.status,u.status==='启用'?'success':u.status==='锁定'?'danger':'muted')}</td><td>${u.id==='U-1002'?`<button class="link-button" data-action="deactivate-user" data-user-id="${u.id}">停用与交接</button>`:`<button class="link-button" data-action="user-detail" data-user-id="${u.id}">详情</button>`}</td></tr>`).join('')}</tbody></table></div></article>`;
  const roles=`<article class="panel table-panel"><header class="panel-head"><div class="panel-title"><h2>角色版本</h2><p>功能、字段与数据范围的版本化授权</p></div><button class="btn primary" data-action="new-role">新建角色</button></header><div class="table-wrap"><table class="data-table"><thead><tr><th>角色编码</th><th>名称</th><th>类型</th><th>用户数</th><th>权限项</th><th>数据范围</th><th>版本 / 状态</th><th>操作</th></tr></thead><tbody>${sec.roles.map(r=>`<tr><td class="mono">${r.id}</td><td>${r.name}</td><td>${r.type}</td><td>${r.users}</td><td>${r.permissions}</td><td>${r.scope}</td><td>${r.version} · ${badge(r.status,r.status==='已发布'?'success':'muted')}</td><td>${r.id==='R-WH-MANAGER'?`<button class="link-button" data-action="publish-role" data-role-id="${r.id}">发布新版本</button>`:`<button class="link-button" data-action="role-diff" data-role-id="${r.id}">权限差异</button>`}</td></tr>`).join('')}</tbody></table></div></article>`;
  const permissions=`<div class="split-layout"><article class="panel table-panel"><header class="panel-head"><div class="panel-title"><h2>有效权限策略</h2><p>默认拒绝；显式禁止与职责分离优先</p></div></header><div class="table-wrap"><table class="data-table"><thead><tr><th>资源</th><th>权限名称</th><th>层级</th><th>数据/条件范围</th><th>风险</th><th>结果</th></tr></thead><tbody>${sec.permissions.map(p=>`<tr><td class="mono">${p.resource}</td><td>${p.label}</td><td>${p.level}</td><td>${p.scope}</td><td>${badge(p.risk,'danger')}</td><td>${badge(p.granted?'允许':'拒绝',p.granted?'success':'muted')}</td></tr>`).join('')}</tbody></table></div></article><aside class="panel summary-card"><h2>权限模拟器</h2><div class="form-grid"><div class="field"><label>用户</label><select id="sim-user"><option value="U-1001">林安 · 仓库经理</option></select></div><div class="field"><label>资源</label><select id="sim-resource"><option value="inventory.view">库存查看</option><option value="inventory.adjust">库存调整</option></select></div><div class="field"><label>目标仓库</label><select id="sim-warehouse"><option>华南二号仓</option><option>华东一号仓</option></select></div><button class="btn primary" data-action="simulate-permission">计算有效权限</button><div id="permission-result" class="weight-result">选择条件后模拟权限来源和拒绝原因。</div></div><div class="rule-list"><div class="rule-item"><i>!</i>申请人与审批人职责互斥</div><div class="rule-item"><i>!</i>角色管理员不能审批自身授权</div></div></aside></div>`;
  const auditRows=rangeRows(sec.audit,12,(i,s)=>({...s,id:`AUD-260703-${1010+i}`,time:`09:${String(58-i).padStart(2,'0')}:12`,event:['order.allocated','rule.published','pii.revealed','export.created'][i%4],category:['业务操作','安全配置','数据访问','导出'][i%4],object:['SO20260703001','RULE-ALLOC-012','收件人电话','库存流水'][i%4],result:i%7===0?'拒绝':'成功',trace:`TRC-${8000+i}`})); const auditMeta=paginateRows(auditRows,ui.pages.admin,ui.pageSize); ui.pages.admin=auditMeta.page;
  const audit=`<article class="panel table-panel"><header class="panel-head"><div class="panel-title"><h2>不可变审计日志</h2><p>登录、访问、安全配置、业务操作、数据访问与接口设备事件</p></div><button class="btn secondary" data-action="audit-export">受控导出</button></header><div class="toolbar" style="padding:12px 14px;margin:0"><label class="search"><span>⌕</span><input class="list-search" placeholder="用户、对象、事件或追踪 ID"></label><select class="select"><option>全部分类</option><option>访问</option><option>安全配置</option><option>业务操作</option></select><select class="select"><option>全部结果</option><option>成功</option><option>拒绝</option></select></div><div class="table-wrap"><table class="data-table"><thead><tr><th>时间 / 日志 ID</th><th>事件 / 分类</th><th>操作者 / 角色</th><th>终端</th><th>业务对象</th><th>变更前 → 后</th><th>原因</th><th>结果</th><th>追踪 ID</th></tr></thead><tbody>${auditMeta.items.map(a=>`<tr><td>${a.time}<br><span class="mono muted">${a.id}</span></td><td><b>${a.event}</b><br><span class="muted">${a.category}</span></td><td>${a.actor}<br><span class="muted">${a.role}</span></td><td>${a.terminal}</td><td>${a.object}</td><td>${a.before} → ${a.after}</td><td>${a.reason}</td><td>${badge(a.result,a.result==='成功'?'success':'danger')}</td><td class="mono">${a.trace}</td></tr>`).join('')}</tbody></table></div>${paginationControls('admin',auditMeta)}</article>`;
  const content={approvals,users,roles,permissions,audit}[tab];
  return `<section class="page">${pageHead('SECURITY GOVERNANCE', '安全治理中心', '管理用户、角色、有效权限、审批流程与不可变审计证据','<button class="btn secondary" data-action="security-report">安全态势报告</button>')}${tabs}${content}</section>`;
}

function pdaView() {
  return `<section class="page">${pageHead('MOBILE OPERATIONS', 'PDA 作业模拟器', '扫描优先的移动作业体验，支持弱网缓存、恢复续作与幂等提交','<button class="btn secondary" data-action="toggle-offline">切换在线/离线</button>')}<div class="split-layout"><article class="panel panel-body" style="display:grid;place-items:center;background:#e9eef5"><div style="width:320px;min-height:570px;border:9px solid #0f172a;border-radius:28px;background:#fff;overflow:hidden;box-shadow:0 25px 50px rgba(15,23,42,.2)"><header style="padding:14px 16px;color:#fff;background:#0b1d33;display:flex;justify-content:space-between"><b>拣货任务</b>${badge(state.pda.online?'在线':'离线',state.pda.online?'success':'warning')}</header><div style="padding:16px"><span class="eyebrow">PK260703-1201 · 1/4</span><h2 style="margin:6px 0">前往 A-01-03-02</h2><p class="muted">智能温湿度传感器 · SKU-AX19-042</p><div class="scan-box" style="min-height:150px;margin:18px 0"><div><div class="scan-ring">⌗</div><h2>扫描库位条码</h2></div></div><div class="detail-grid"><div class="detail-cell"><small>应拣数量</small><b>12 件</b></div><div class="detail-cell"><small>已扫描</small><b>${state.pda.pendingOperations.length} 条</b></div></div><button class="btn primary" data-action="pda-scan" style="width:100%;margin-top:14px">模拟扫描</button><button class="btn secondary" data-action="pda-sync" style="width:100%;margin-top:8px">恢复网络并安全续作</button><p class="muted" style="font-size:9px;text-align:center">库存最终确认以服务端响应为准</p></div></div></article><aside class="panel summary-card"><h2>离线保护状态</h2><div class="stat-pair"><div class="stat-box"><small>网络状态</small><b>${state.pda.online?'在线':'弱网/离线'}</b></div><div class="stat-box"><small>待同步操作</small><b>${state.pda.pendingOperations.length}</b></div><div class="stat-box"><small>已安全同步</small><b>${state.pda.syncedOperations.length}</b></div><div class="stat-box"><small>重复事务</small><b>0</b></div></div><div class="rule-list"><div class="rule-item"><i>✓</i>仅缓存当前任务所需数据</div><div class="rule-item"><i>✓</i>操作携带设备级幂等号</div><div class="rule-item"><i>✓</i>恢复后逐条确认服务端结果</div></div></aside></div></section>`;
}

function futureView(view) {
  const names = { inventory:'库存中心', inbound:'入库管理', reports:'分析报表' };
  return `<section class="page">${pageHead('ROADMAP', names[view] || '扩展模块', '该模块已纳入完整 PRD，当前原型聚焦出库履约与数字孪生')}</section><article class="panel empty-state"><div><div class="empty-icon">⌘</div><h2>${names[view] || '扩展模块'}将在下一画布展开</h2><p>首版保留信息架构入口，避免用无反馈的死按钮伪装已实现功能。当前可以体验运营驾驶舱、订单分配、波次释放、短拣处置、复核发运和数字孪生。</p><button class="btn primary" data-view="dashboard">返回运营驾驶舱</button></div></article>`;
}

function openDrawer(title, content, trigger = document.activeElement) {
  lastFocus = trigger;
  drawerTitle.textContent = title;
  drawerBody.innerHTML = content;
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  scrim.hidden = false;
  drawer.querySelector('[data-close-drawer]').focus();
}

function closeDrawer() {
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
  scrim.hidden = true;
  lastFocus?.focus();
}

function shortPickDrawer(trigger) {
  const s = state.shortPick;
  openDrawer('短拣异常处置', `<div class="detail-section"><div style="display:flex;justify-content:space-between;align-items:center"><span class="mono">${s.id}</span>${badge(s.status)}</div></div><div class="detail-section"><h3>差异明细</h3><div class="detail-grid"><div class="detail-cell"><small>关联订单</small><b>${s.orderId}</b></div><div class="detail-cell"><small>所在区域</small><b>${s.zone}</b></div><div class="detail-cell"><small>商品</small><b>${s.product}</b></div><div class="detail-cell"><small>SKU</small><b>${s.sku}</b></div><div class="detail-cell"><small>任务数量</small><b>${s.expected} 件</b></div><div class="detail-cell"><small>实际数量</small><b style="color:#dc2626">${s.actual} 件</b></div></div></div>
    ${s.status==='待处理'?`<form id="shortpick-form" class="form-grid" novalidate><div class="field"><label for="shortpick-reason">短拣原因 *</label><select id="shortpick-reason" required><option value="">请选择原因</option><option>库位缺货</option><option>商品破损</option><option>条码无法识别</option><option>账实不符</option></select><p class="field-error" id="reason-error" hidden>请选择短拣原因</p></div><div class="field"><label for="shortpick-strategy">恢复策略 *</label><select id="shortpick-strategy"><option>跨区重分配</option><option>部分发货并通知上游</option><option>转人工复核</option><option>挂起订单</option></select></div><div class="field"><label for="shortpick-note">处理备注</label><input id="shortpick-note" value="优先从存储区 B 重新分配" maxlength="80"></div><button class="btn primary" type="submit">提交处置方案</button></form>`:`<div class="weight-result">异常已处理，系统正在观察重分配任务执行结果。</div>`}
    <div class="detail-section"><h3>操作时间线</h3><div class="timeline">${s.audit.map(a=>`<div class="timeline-item"><b>${a.action}</b><small>${a.time} · ${a.actor}</small></div>`).join('')}</div></div>`, trigger);
}

function orderDrawer(id, trigger) {
  const order = state.orders.find(o=>o.id===id);
  openDrawer('出库订单详情', `<div class="detail-section"><div style="display:flex;justify-content:space-between;align-items:center"><span class="mono">${order.id}</span>${badge(order.status)}</div></div><div class="detail-grid"><div class="detail-cell"><small>销售渠道</small><b>${order.channel}</b></div><div class="detail-cell"><small>截单时间</small><b>${order.cutoff}</b></div><div class="detail-cell"><small>收货城市</small><b>${order.city}</b></div><div class="detail-cell"><small>优先级</small><b>${order.priority}</b></div><div class="detail-cell"><small>订单行</small><b>${order.lines}</b></div><div class="detail-cell"><small>总件数</small><b>${order.pieces}</b></div></div><div class="detail-section"><h3>履约检查</h3><div class="rule-list"><div class="rule-item"><i>✓</i>地址与服务范围校验通过</div><div class="rule-item"><i>✓</i>库存候选批次可用</div><div class="rule-item"><i>✓</i>收件信息已按角色脱敏</div></div></div>`, trigger);
}

function zoneDrawer(id, trigger) {
  const z = twinSummary(state).zones.find(item=>item.id===id);
  state.twin.selectedZone = id;
  render();
  openDrawer(z.name, `<div class="detail-grid"><div class="detail-cell"><small>空间利用率</small><b>${z.utilization}%</b></div><div class="detail-cell"><small>进行中任务</small><b>${z.tasks}</b></div><div class="detail-cell"><small>在线人员</small><b>${id==='picking'?18:9}</b></div><div class="detail-cell"><small>运行设备</small><b>${id==='picking'?'7/8':'4/4'}</b></div></div><div class="detail-section"><h3>容量趋势</h3><div class="capacity-meter"><header><span>当前负载</span><b>${z.utilization}%</b></header><div class="progress"><i style="width:${z.utilization}%"></i></div></div></div><div class="detail-section"><h3>建议动作</h3><div class="rule-list"><div class="rule-item"><i>✓</i>${z.tone==='danger'?'优先处理短拣并平衡跨区任务':'当前无需人工干预，持续监控即可'}</div></div></div>`, trigger);
}

function openDialog(trigger) {
  lastFocus = trigger;
  dialogBackdrop.hidden = false;
  dialog.focus();
}
function closeDialog() { dialogBackdrop.hidden = true; lastFocus?.focus(); }

document.addEventListener('click', (event) => {
  const view = event.target.closest('[data-view]');
  if (view) return setView(view.dataset.view);
  const searchTarget=event.target.closest('[data-search-view]');
  if(searchTarget){closeDrawer(); setView(searchTarget.dataset.searchView); return;}
  const pageButton=event.target.closest('[data-page-view]');
  if(pageButton){ui.pages[pageButton.dataset.pageView]=Number(pageButton.dataset.page); render(); return;}
  const tab=event.target.closest('[data-tab-view]');
  if(tab){ui=selectTab(ui,tab.dataset.tabView,tab.dataset.tab); render(); return;}
  const layer = event.target.closest('[data-layer]');
  if (layer) { ui=selectTwinLayer(ui,layer.dataset.layer); render(); toast(`已切换至“${layer.textContent}”图层`,true,'图层已更新'); return; }
  if (event.target.closest('[data-open-shortpick]')) return shortPickDrawer(event.target.closest('[data-open-shortpick]'));
  const orderDetail = event.target.closest('[data-order-detail]');
  if (orderDetail) return orderDrawer(orderDetail.dataset.orderDetail, orderDetail);
  const zone = event.target.closest('[data-zone]');
  if (zone) return zoneDrawer(zone.dataset.zone, zone);
  const task = event.target.closest('[data-task-detail]');
  if (task) return openDrawer('作业任务详情', `<div class="detail-section"><span class="mono">${task.dataset.taskDetail}</span></div><div class="detail-grid"><div class="detail-cell"><small>任务类型</small><b>按单拣选</b></div><div class="detail-cell"><small>优先级</small><b>普通</b></div><div class="detail-cell"><small>来源库区</small><b>拣选区 A</b></div><div class="detail-cell"><small>截止时间</small><b>10:50</b></div></div>`, task);
  const inventoryDetail = event.target.closest('[data-inventory-detail]');
  if (inventoryDetail) {
    const item=state.inventory.find(i=>i.sku===inventoryDetail.dataset.inventoryDetail);
    return openDrawer('库存事务台账', `<div class="detail-section"><span class="mono">${item.sku}</span><h3>${item.product}</h3></div><div class="detail-grid"><div class="detail-cell"><small>库位</small><b>${item.location}</b></div><div class="detail-cell"><small>批次</small><b>${item.batch}</b></div><div class="detail-cell"><small>在库</small><b>${item.onHand}</b></div><div class="detail-cell"><small>可用</small><b>${item.available}</b></div></div><div class="detail-section"><h3>最近事务</h3><div class="timeline"><div class="timeline-item"><b>出库分配 ${item.allocated} 件</b><small>09:56 · 系统规则</small></div><div class="timeline-item"><b>采购入库 ${item.onHand} 件</b><small>07:18 · 收货员 王敏</small></div></div></div>`,inventoryDetail);
  }
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'allocate') {
    const result = allocateOrders(state, state.selectedOrders); state = result.state; toast(result.message, result.ok); render();
  } else if (action === 'release-wave') {
    const ids = state.orders.filter(o=>o.status==='已分配').map(o=>o.id); const result = releaseWave(state, ids); state=result.state; toast(result.message,result.ok); render();
  } else if (action === 'open-ship-dialog') openDialog(event.target.closest('[data-action]'));
  else if (action === 'open-freeze') openDrawer('冻结库存', `<form id="freeze-form" class="form-grid" novalidate><div class="field"><label for="freeze-sku">选择库存</label><select id="freeze-sku">${state.inventory.map(i=>`<option value="${i.sku}">${i.sku} · ${i.product} · 可用 ${i.available}</option>`).join('')}</select></div><div class="field"><label for="freeze-quantity">冻结数量 *</label><input id="freeze-quantity" type="number" min="1" value="3"></div><div class="field"><label for="freeze-reason">冻结原因 *</label><select id="freeze-reason"><option>短拣复核</option><option>质量异常</option><option>盘点冻结</option><option>客户保留</option></select></div><p class="field-error" id="freeze-error" hidden></p><button class="btn primary" type="submit">确认冻结并记录审计</button></form>`,event.target);
  else if (action === 'open-rule') openDrawer('创建规则新版本', `<form id="rule-form" class="form-grid"><div class="field"><label for="rule-scope">适用范围</label><select id="rule-scope"><option>华东一号仓</option><option selected>华东一号仓/B2C</option><option>华东一号仓/B2B</option></select></div><div class="field"><label for="rule-priority">优先级</label><input id="rule-priority" type="number" value="90"></div><div class="field"><label>规则动作</label><select><option>FEFO + 整箱优先</option><option>库区优先</option></select></div><p class="field-error" id="rule-error" hidden></p><button class="btn primary" type="submit">冲突检测并发布</button></form>`,event.target);
  else if (action === 'reprint') openDrawer('受控重打', `<form id="reprint-form" class="form-grid"><div class="field"><label>打印任务</label><input value="PR260703-0918" readonly></div><div class="field"><label>重打原因 *</label><select><option>标签破损</option><option>打印内容模糊</option><option>现场丢失</option></select></div><div class="field"><label>份数</label><input type="number" value="1" min="1" max="3"></div><button class="btn primary" type="submit">确认重打并记录</button></form>`,event.target);
  else if (action === 'approval-detail') openDrawer('高风险审批', `<div class="detail-grid"><div class="detail-cell"><small>申请人</small><b>库存管理员 · 赵凯</b></div><div class="detail-cell"><small>申请数量</small><b>调整 -9 件</b></div><div class="detail-cell"><small>对象</small><b>SKU-AX19-042</b></div><div class="detail-cell"><small>风险等级</small><b>高</b></div></div><div class="timeline"><div class="timeline-item"><b>提交库存调整申请</b><small>10:16 · 工作站 WS-08</small></div><div class="timeline-item"><b>系统校验超过自动阈值</b><small>10:16 · 需要仓库经理审批</small></div></div><div class="action-bar"><button class="btn secondary" data-action="reject-approval">驳回</button><button class="btn primary" data-action="approve">批准并生成事务</button></div>`,event.target);
  else if (action === 'locate-alert') { state.twin.selectedZone='picking'; render(); shortPickDrawer(event.target); }
  else if (action === 'refresh') toast('数据已同步至 10:18:32', true, '同步完成');
  else if (action === 'export') toast('已生成脱敏订单清单 · 2,486 条', true, '导出任务已创建');
  else if (action === 'simulate') toast('规则试算通过：库存、产能与任务总量一致');
  else if (action === 'auto-assign') toast('4 个待执行任务已按区域与负载智能分配');
  else if (action === 'print') toast('面单已发送至工作站打印机 PT-06');
  else if (action === 'inventory-reconcile') toast('库存余额与有效事务核对一致，差异 0 件');
  else if (action === 'scan-asn') toast(`已识别 ASN ${state.inbound.asnId}`,true,'扫描成功');
  else if (action === 'report-export') toast('运营日报已生成，所有敏感字段均按角色脱敏');
  else if (action === 'retry-integration') { const result=retryIntegration(state,'MSG-260703-0098'); state=result.state; toast(result.message,result.ok,result.ok?'接口恢复':'无法重试'); render(); }
  else if (action === 'pda-sync') { const result=syncPdaQueue(state,state.pda.pendingOperations); state=result.state; toast(result.message,result.ok,'离线续作完成'); render(); }
  else if (action === 'pda-scan') { const id=`OP-${1001+state.pda.pendingOperations.length}`; state.pda.pendingOperations=[...state.pda.pendingOperations,id]; toast(`扫描已保存在本机队列：${id}`,true,'离线缓存成功'); render(); }
  else if (action === 'toggle-offline') { state.pda.online=!state.pda.online; toast(state.pda.online?'网络已恢复，可安全同步':'已进入离线保护模式'); render(); }
  else if (action === 'permission-denied') toast('当前角色无权访问华南二号仓，事件已记录',false,'403 · 无权限');
  else if (action === 'approve') { closeDrawer(); toast('审批通过，库存调整事务已进入执行队列'); }
  else if (action === 'reject-approval') { closeDrawer(); toast('审批已驳回并通知申请人'); }
  else if (action === 'retry-print') toast('打印服务已恢复，原任务重新进入队列');
  else if (action === 'release-replenishment') toast('已释放 2 个补货任务，重复需求已自动合并');
  else if (action === 'rule-simulate') toast('样例试算完成：48 个订单命中，无规则冲突');
  else if (action === 'sync-master') toast('主数据增量同步完成：更新 12 条，冲突 0 条');
  else if (action === 'new-master') openDrawer('新增库位', '<div class="form-grid"><div class="field"><label>库位编码</label><input value="A-01-03-04"></div><div class="field"><label>库位类型</label><select><option>存储位</option><option>拣选位</option><option>质检暂存</option></select></div><div class="field"><label>所属库区</label><select><option>存储区 A</option><option>存储区 B</option></select></div><div class="weight-result">保存时将校验编码唯一性、容量和混放规则。</div><button class="btn primary" data-action="save-location">校验并保存</button></div>',event.target);
  else if (action === 'save-location') { closeDrawer(); toast('库位 A-01-03-04 已创建，审计日志已记录'); }
  else if (action === 'global-search') { openDrawer('全局搜索',`<div class="field"><label for="global-query">单据、任务、SKU、LPN 或运单</label><input id="global-query" type="search" autocomplete="off" placeholder="例如 SO20260703001"></div><div class="global-results" id="global-results">${searchResultsMarkup('')}</div>`,event.target); document.querySelector('#global-query').focus(); }
  else if (action === 'notifications') openDrawer('通知中心','<div class="exception-list"><div class="exception-item"><span class="exception-icon">!</span><span><h3>3 个高风险异常待处理</h3><p>拣选短拣、称重差异和接口失败</p></span><time>刚刚</time></div><div class="exception-item"><span class="exception-icon">✓</span><span><h3>波次释放完成</h3><p>WV20260703-021 已生成任务</p></span><time>8分钟前</time></div></div>',event.target);
  else if (action === 'account') openDrawer('账户与班次','<div class="detail-grid"><div class="detail-cell"><small>用户</small><b>林安</b></div><div class="detail-cell"><small>角色</small><b>仓库经理</b></div><div class="detail-cell"><small>当前班次</small><b>早班</b></div><div class="detail-cell"><small>数据范围</small><b>华东一号仓</b></div></div>',event.target);
  else if (action === 'switch-warehouse') openDrawer('切换运营仓','<div class="form-grid"><button class="btn primary" data-action="warehouse-current">华东一号仓 · 当前</button><button class="btn secondary" data-action="permission-denied">华南二号仓 · 无权限</button></div>',event.target);
  else if (action === 'deactivate-user') openDrawer('停用用户与工作交接','<form id="deactivate-user-form" class="form-grid"><div class="weight-result error">周宇仍有 3 个执行中/待领取任务，停用前必须交接。</div><div class="field"><label>目标用户</label><input value="zhou.yu · 周宇" readonly></div><div class="field"><label for="handoff-user">工作交接人 *</label><select id="handoff-user"><option value="">请选择交接人</option><option value="U-1001">林安 · 仓库经理</option><option value="U-1003">陈晨 · 拣货员</option></select></div><p class="field-error" id="handoff-error" hidden></p><button class="btn danger" type="submit">确认交接并停用</button></form>',event.target);
  else if (action === 'publish-role') { const result=publishRole(state,'R-WH-MANAGER'); state=result.state; toast(result.message,result.ok,'角色版本已发布'); render(); }
  else if (action === 'simulate-permission') { const result=simulatePermission(state,{userId:document.querySelector('#sim-user').value,resource:document.querySelector('#sim-resource').value,warehouse:document.querySelector('#sim-warehouse').value}); state=result.state; const box=document.querySelector('#permission-result'); box.classList.toggle('error',!result.allowed); box.textContent=`${result.allowed?'允许':'拒绝'}：${result.reason}`; toast(result.reason,result.allowed,result.allowed?'权限允许':'权限拒绝'); }
  else if (action === 'audit-export') openDrawer('审计日志受控导出','<div class="weight-result error">审计日志导出属于高风险数据访问操作。</div><div class="form-grid" style="margin-top:14px"><div class="field"><label>导出范围</label><select><option>当前筛选结果 · 脱敏</option><option>当前筛选结果 · 明文（需审批）</option></select></div><div class="field"><label>导出原因 *</label><input value="季度合规抽查"></div><button class="btn primary" data-action="submit-audit-export">提交导出申请</button></div>',event.target);
  else if (action === 'submit-audit-export') { closeDrawer(); toast('审计日志导出申请已提交审批，导出行为已记录'); }
  else if (action === 'new-user') openDrawer('新增用户',`<form id="new-user-form" class="form-grid"><div class="field"><label for="new-account">登录账号 *</label><input id="new-account" value="wang.min"></div><div class="detail-grid"><div class="field"><label for="new-name">姓名 *</label><input id="new-name" value="王敏"></div><div class="field"><label for="new-employee">工号 *</label><input id="new-employee" value="WH0108"></div></div><div class="field"><label for="new-user-role">初始角色 *</label><select id="new-user-role"><option>入库员</option><option>质检员</option><option>拣货员</option><option>库存管理员</option></select></div><div class="field"><label>认证来源</label><select><option>统一身份认证 SSO</option><option>本地账号</option></select></div><p class="field-error" id="new-user-error" hidden></p><button class="btn primary" type="submit">创建用户并发送激活</button></form>`,event.target);
  else if (action === 'new-role') openDrawer('新建角色',`<form id="new-role-form" class="form-grid"><div class="field"><label for="new-role-code">角色编码 *</label><input id="new-role-code" value="R-QC-LEAD"></div><div class="field"><label for="new-role-name">角色名称 *</label><input id="new-role-name" value="质检主管"></div><div class="field"><label for="new-role-scope">数据范围 *</label><select id="new-role-scope"><option>华东一号仓</option><option>华东一号仓/3货主</option><option>全部仓/脱敏</option></select></div><div class="detail-section"><h3>初始权限模板</h3><label class="rule-item"><input type="checkbox" checked> 质检任务查看与执行</label><label class="rule-item"><input type="checkbox" checked> 不合格品处置申请</label><label class="rule-item"><input type="checkbox"> 不合格品放行审批（高风险）</label></div><p class="field-error" id="new-role-error" hidden></p><button class="btn primary" type="submit">创建角色草稿</button></form>`,event.target);
  else if (action === 'user-detail') { const id=event.target.closest('[data-user-id]')?.dataset.userId; const user=state.security.users.find(item=>item.id===id); openDrawer('用户详情',`<div class="detail-grid"><div class="detail-cell"><small>账号</small><b>${user.account}</b></div><div class="detail-cell"><small>姓名 / 工号</small><b>${user.name} · ${user.employeeNo}</b></div><div class="detail-cell"><small>组织</small><b>${user.organization}</b></div><div class="detail-cell"><small>默认仓库</small><b>${user.warehouse}</b></div><div class="detail-cell"><small>岗位</small><b>${user.position}</b></div><div class="detail-cell"><small>认证来源</small><b>${user.source}</b></div></div><div class="detail-section"><h3>有效角色</h3><div class="rule-list">${user.roles.map(role=>`<div class="rule-item"><i>✓</i>${role}</div>`).join('')}</div></div><div class="timeline"><div class="timeline-item"><b>最近登录成功</b><small>${user.lastLogin} · WEB-01</small></div><div class="timeline-item"><b>角色授权生效</b><small>2026-07-01 · 安全管理员</small></div></div>`,event.target); }
  else if (action === 'role-diff') { const id=event.target.closest('[data-role-id]')?.dataset.roleId; const role=state.security.roles.find(item=>item.id===id); openDrawer('角色权限差异',`<div style="display:flex;justify-content:space-between;align-items:center"><span><b>${role.name}</b><br><small class="mono">${role.id}</small></span>${badge(role.version,'info')}</div><div class="detail-section" style="margin-top:18px"><h3>${role.version} 相对上一版本</h3><div class="rule-list"><div class="rule-item"><i style="color:#059669">＋</i>新增：库存流水脱敏导出</div><div class="rule-item"><i style="color:#dc2626">－</i>移除：敏感字段明文查看</div><div class="rule-item"><i>↔</i>数据范围：${role.scope}</div></div></div><div class="weight-result">预计影响 ${role.users} 名用户；历史任务继续使用生成时角色版本。</div>`,event.target); }
  else if (action === 'security-report') openDrawer('安全态势报告',`<div class="stat-pair"><div class="stat-box"><small>启用用户</small><b>${state.security.users.filter(u=>u.status==='启用').length}</b></div><div class="stat-box"><small>锁定/停用</small><b>${state.security.users.filter(u=>u.status!=='启用').length}</b></div><div class="stat-box"><small>高风险权限</small><b>${state.security.permissions.filter(p=>p.risk==='高风险').length}</b></div><div class="stat-box"><small>拒绝事件</small><b>${state.security.audit.filter(a=>a.result==='拒绝').length}</b></div></div><div class="detail-section"><h3>安全建议</h3><div class="rule-list"><div class="rule-item"><i>!</i>复核锁定账号是否需要停用和交接</div><div class="rule-item"><i>✓</i>职责分离规则运行正常</div><div class="rule-item"><i>✓</i>审计日志完整性校验通过</div></div></div><button class="btn secondary" data-action="security-report-export">导出脱敏报告</button>`,event.target);
  else if (action === 'security-report-export') { closeDrawer(); toast('安全态势报告已生成，导出操作已写入审计日志'); }
  else if (action === 'retry') toast('接口重试成功，业务结果未重复落账');
  else if (action) toast('此操作已记录为原型演示反馈');
  if (event.target.closest('[data-close-drawer]') || event.target===scrim) closeDrawer();
  if (event.target.closest('[data-dialog-cancel]') || event.target===dialogBackdrop) closeDialog();
  if (event.target.closest('[data-dialog-confirm]')) { const result=confirmShipment(state); state=result.state; closeDialog(); toast(result.message,result.ok,result.ok?'发运交接完成':'发运被阻止'); render(); }
});

document.addEventListener('change', (event) => {
  if (event.target.matches('[data-order-check]')) {
    state.selectedOrders = event.target.checked ? [...new Set([...state.selectedOrders,event.target.value])] : state.selectedOrders.filter(id=>id!==event.target.value);
    event.target.closest('tr').classList.toggle('selected',event.target.checked);
    const count=document.querySelector('#selected-count'); if(count) count.textContent=state.selectedOrders.length?`(${state.selectedOrders.length})`:'';
  }
  if (event.target.matches('[data-check-all]')) { const visible=[...document.querySelectorAll('[data-order-check]')].map(input=>input.value); state.selectedOrders=event.target.checked?[...new Set([...state.selectedOrders,...visible])]:state.selectedOrders.filter(id=>!visible.includes(id)); render(); }
  if (event.target.id==='report-range') { ui=selectTab(ui,'reports',{'今日':'today','本周':'week','本月':'month'}[event.target.value]); toast(`报表已切换至${event.target.value}口径`,true,'时间范围已更新'); render(); }
  if (event.target.matches('[data-table-filter]')) { const filters=[...document.querySelectorAll('[data-table-filter]')]; document.querySelectorAll('.data-table tbody tr').forEach(row=>{row.hidden=filters.some(filter=>filter.value && row.dataset[`row${filter.dataset.tableFilter[0].toUpperCase()}${filter.dataset.tableFilter.slice(1)}`]!==filter.value);}); }
  if (event.target.id==='package-weight') { const result=setPackageWeight(state,event.target.value); state=result.state; toast(result.message,result.state.package.verified,result.state.package.verified?'重量校验通过':'发运被拦截'); render(); }
});

document.addEventListener('input', (event) => {
  if (event.target.id==='order-search') { const q=event.target.value.toLowerCase(); document.querySelectorAll('.data-table tbody tr').forEach(row=>row.hidden=!row.textContent.toLowerCase().includes(q)); }
  if (event.target.id==='inventory-search') { const q=event.target.value.toLowerCase(); document.querySelectorAll('.data-table tbody tr').forEach(row=>row.hidden=!row.textContent.toLowerCase().includes(q)); }
  if (event.target.classList.contains('list-search')) { const q=event.target.value.toLowerCase(); document.querySelectorAll('.data-table tbody tr').forEach(row=>row.hidden=!row.textContent.toLowerCase().includes(q)); }
  if (event.target.id==='global-query') { document.querySelector('#global-results').innerHTML=searchResultsMarkup(event.target.value); }
  if (event.target.id==='package-weight') {
    const result=setPackageWeight(state,event.target.value); state=result.state;
    const feedback=document.querySelector('.weight-result');
    feedback.classList.toggle('error',!state.package.verified);
    feedback.textContent=state.package.verified?'重量在允许偏差内 · 预计 8.2kg ±0.5kg':'重量超出阈值，发运已被拦截';
    const shipButton=document.querySelector('[data-action="open-ship-dialog"]');
    if(shipButton) shipButton.disabled=!state.package.verified;
  }
});

document.addEventListener('submit', (event) => {
  if (event.target.id==='shortpick-form') {
    event.preventDefault(); const reason=document.querySelector('#shortpick-reason'); const strategy=document.querySelector('#shortpick-strategy');
    const result=resolveShortPick(state,{reason:reason.value,strategy:strategy.value});
    if(!result.ok){ const error=document.querySelector('#reason-error'); error.hidden=false; reason.setAttribute('aria-invalid','true'); reason.focus(); return; }
    state=result.state; closeDrawer(); toast(result.message,true,'异常已进入恢复流程'); render(); return;
  }
  if (event.target.id==='inbound-form') {
    event.preventDefault(); const quantity=document.querySelector('#received-quantity'); const result=receiveInbound(state,{asnId:state.inbound.asnId,quantity:quantity.value});
    if(!result.ok){const error=document.querySelector('#inbound-error'); error.hidden=false; error.textContent=result.message; quantity.setAttribute('aria-invalid','true'); quantity.focus(); return;}
    state=result.state; toast(result.message,true,'收货确认完成'); render(); return;
  }
  if (event.target.id==='freeze-form') {
    event.preventDefault(); const sku=document.querySelector('#freeze-sku'); const quantity=document.querySelector('#freeze-quantity'); const reason=document.querySelector('#freeze-reason'); const result=freezeInventory(state,{sku:sku.value,quantity:quantity.value,reason:reason.value});
    if(!result.ok){const error=document.querySelector('#freeze-error'); error.hidden=false; error.textContent=result.message; return;}
    state=result.state; closeDrawer(); toast(result.message,true,'库存冻结完成'); render();
  }
  if (event.target.id==='count-form') {
    event.preventDefault(); const counted=document.querySelector('#counted-quantity'); const result=submitCountVariance(state,{counted:counted.value,book:state.count.book}); state=result.state; toast(result.message,result.ok,result.state.count.status==='待审批'?'差异审批已创建':'盘点完成'); render();
  }
  if (event.target.id==='return-form') {
    event.preventDefault(); const serial=document.querySelector('#return-serial'); const disposition=document.querySelector('#return-disposition'); const result=inspectReturn(state,{serial:serial.value,disposition:disposition.value});
    if(!result.ok){const error=document.querySelector('#return-error'); error.hidden=false; error.textContent=result.message; serial.setAttribute('aria-invalid','true'); serial.focus(); toast(result.message,false,'序列号拦截'); return;}
    state=result.state; toast(result.message,true,'退货质检完成'); render();
  }
  if (event.target.id==='rule-form') {
    event.preventDefault(); const scope=document.querySelector('#rule-scope'); const priority=document.querySelector('#rule-priority'); const result=publishRule(state,{scope:scope.value,priority:priority.value});
    if(!result.ok){const error=document.querySelector('#rule-error'); error.hidden=false; error.textContent=result.message; toast(result.message,false,'规则冲突'); return;}
    state=result.state; closeDrawer(); toast(result.message,true,'规则发布完成'); render();
  }
  if (event.target.id==='reprint-form') { event.preventDefault(); closeDrawer(); toast('重打任务已创建，原因与操作者已记录'); }
  if (event.target.id==='deactivate-user-form') { event.preventDefault(); const handoff=document.querySelector('#handoff-user'); const result=deactivateUser(state,{userId:'U-1002',handoffTo:handoff.value}); if(!result.ok){const error=document.querySelector('#handoff-error'); error.hidden=false; error.textContent=result.message; handoff.focus(); return;} state=result.state; closeDrawer(); ui=selectTab(ui,'admin','users'); toast(result.message,true,'用户已停用'); render(); }
  if (event.target.id==='new-user-form') { event.preventDefault(); const result=createUser(state,{account:document.querySelector('#new-account').value.trim(),name:document.querySelector('#new-name').value.trim(),employeeNo:document.querySelector('#new-employee').value.trim(),role:document.querySelector('#new-user-role').value}); if(!result.ok){const error=document.querySelector('#new-user-error'); error.hidden=false; error.textContent=result.message; return;} state=result.state; closeDrawer(); ui=selectTab(ui,'admin','users'); toast(result.message,true,'用户创建成功'); render(); }
  if (event.target.id==='new-role-form') { event.preventDefault(); const result=createRole(state,{code:document.querySelector('#new-role-code').value.trim(),name:document.querySelector('#new-role-name').value.trim(),scope:document.querySelector('#new-role-scope').value}); if(!result.ok){const error=document.querySelector('#new-role-error'); error.hidden=false; error.textContent=result.message; return;} state=result.state; closeDrawer(); ui=selectTab(ui,'admin','roles'); toast(result.message,true,'角色草稿已创建'); render(); }
});

document.addEventListener('keydown', (event) => { if(event.key==='Escape'){ if(!dialogBackdrop.hidden) closeDialog(); else if(drawer.classList.contains('open')) closeDrawer(); else if(sidebar.classList.contains('open')) sidebar.classList.remove('open'); } });
document.querySelector('#mobile-menu').addEventListener('click', (event) => { const open=sidebar.classList.toggle('open'); event.currentTarget.setAttribute('aria-expanded',String(open)); });

render();
