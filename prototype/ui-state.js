const clone = (value) => JSON.parse(JSON.stringify(value));

export function createUiState() {
  return {
    pages: { orders: 1, inventory: 1, master: 1, exceptions: 1, replenishment: 1, rules: 1, integrations: 1, printing: 1, admin: 1 },
    pageSize: 5,
    tabs: { dashboard: 'today', tasks: 'all', master: 'locations', reports: 'today', admin: 'approvals' },
    twinLayer: 'utilization',
  };
}

export function paginateRows(rows, requestedPage = 1, pageSize = 5) {
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(pageCount, Math.max(1, Number(requestedPage) || 1));
  const start = (page - 1) * pageSize;
  return { items: rows.slice(start, start + pageSize), page, pageCount, total, from: total ? start + 1 : 0, to: Math.min(start + pageSize, total) };
}

export function selectTab(current, view, tab) {
  const state = clone(current);
  state.tabs[view] = tab;
  state.pages[view] = 1;
  return state;
}

export function selectTwinLayer(current, layer) {
  const state = clone(current);
  state.twinLayer = layer;
  return state;
}

export function visibleTwinParts(ui) {
  return {
    zones: true,
    heat: ui.twinLayer === 'utilization' || ui.twinLayer === 'tasks',
    routes: ui.twinLayer === 'tasks',
    equipment: ui.twinLayer === 'equipment',
    alerts: ui.twinLayer === 'alerts',
  };
}

export function searchWorkspace(documents, query, limit = 8) {
  const keyword = String(query || '').trim().toLocaleLowerCase('zh-CN');
  if (!keyword) return [];
  return documents
    .filter((document) => [document.type, document.id, document.title, document.meta].filter(Boolean).join(' ').toLocaleLowerCase('zh-CN').includes(keyword))
    .slice(0, limit);
}
