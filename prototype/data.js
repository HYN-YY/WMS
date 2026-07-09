const coreOrders = [
  { id: 'SO20260703001', channel: '天猫旗舰店', priority: '加急', consignee: '张**', city: '上海', lines: 5, pieces: 18, cutoff: '10:30', status: '待分配', risk: '即将超时' },
  { id: 'SO20260703002', channel: '京东自营', priority: '普通', consignee: '李**', city: '苏州', lines: 3, pieces: 12, cutoff: '11:00', status: '待分配', risk: '正常' },
  { id: 'SO20260703003', channel: '经销商 B2B', priority: '整箱', consignee: '华东商贸', city: '杭州', lines: 8, pieces: 96, cutoff: '14:00', status: '已分配', risk: '补货等待' },
  { id: 'SO20260703004', channel: '抖音商城', priority: '加急', consignee: '王**', city: '无锡', lines: 2, pieces: 4, cutoff: '10:10', status: '异常', risk: '地址待核' },
  { id: 'SO20260703005', channel: '直营网店', priority: '普通', consignee: '赵**', city: '南京', lines: 4, pieces: 9, cutoff: '12:30', status: '待分配', risk: '正常' },
];

const channels = ['天猫旗舰店','京东自营','抖音商城','直营网店','经销商 B2B'];
const cities = ['上海','苏州','杭州','无锡','南京','宁波'];
export const demoOrders = [
  ...coreOrders,
  ...Array.from({length:18},(_,index)=>({
    id:`SO20260703${String(index+6).padStart(3,'0')}`,
    channel:channels[index%channels.length], priority:index%7===0?'加急':'普通', consignee:`客户${String(index+6).padStart(2,'0')}**`, city:cities[index%cities.length],
    lines:2+(index%7), pieces:6+(index*7)%48, cutoff:`${10+Math.floor(index/4)}:${String((index%4)*15).padStart(2,'0')}`,
    status:index%6===0?'已分配':'待分配', risk:index%8===0?'即将超时':'正常',
  })),
];

export const baseTasks = [
  { id: 'PK260703-1187', zone: '拣选区 A', assignee: '周宇', progress: 72, status: '执行中', pieces: 28 },
  { id: 'PK260703-1188', zone: '拣选区 B', assignee: '陈晨', progress: 45, status: '执行中', pieces: 36 },
  ...Array.from({length:8},(_,index)=>({id:`PK260703-${1189+index}`,zone:index%2?'拣选区 B':'拣选区 A',assignee:index%3?'待领取':['赵凯','王敏','李青'][index%3],progress:index%3?0:30+index*5,status:index%3?'待执行':'执行中',pieces:12+index*4})),
];

export const zones = [
  { id: 'receive', name: '收货暂存区', x: 4, y: 7, w: 18, h: 30, utilization: 58, tasks: 12, tone: 'normal' },
  { id: 'storage-a', name: '存储区 A', x: 26, y: 7, w: 30, h: 30, utilization: 86, tasks: 26, tone: 'warning' },
  { id: 'storage-b', name: '存储区 B', x: 60, y: 7, w: 36, h: 30, utilization: 71, tasks: 18, tone: 'normal' },
  { id: 'picking', name: '拣选区', x: 4, y: 45, w: 52, h: 28, utilization: 78, tasks: 31, tone: 'danger' },
  { id: 'packing', name: '复核包装区', x: 60, y: 45, w: 20, h: 28, utilization: 64, tasks: 14, tone: 'normal' },
  { id: 'dock', name: '发运月台', x: 84, y: 45, w: 12, h: 44, utilization: 47, tasks: 8, tone: 'normal' },
];

export const kpis = [
  { label: '今日出库单', value: '8,642', delta: '+12.4%', helper: '较昨日同期', tone: 'primary' },
  { label: '按时出库率', value: '98.7%', delta: '+0.6%', helper: '目标 ≥ 98.5%', tone: 'success' },
  { label: '待拣任务', value: '326', delta: '42 超时', helper: '未来 2 小时', tone: 'warning' },
  { label: '阻断异常', value: '17', delta: '3 高风险', helper: '需立即处理', tone: 'danger' },
];

export const liteCatalog = {
  warehouses: [
    { id: '2034811041354936322', code: 'WH-WJ', name: '吴江仓', orderNum: 0, createBy: '18015578617', createTime: '2026-03-20 09:55:31', status: '启用', remark: '真实系统样例仓库' },
    { id: '2034811081263738882', code: 'WH-SY', name: '沭阳仓', orderNum: 1, createBy: '18015578617', createTime: '2026-03-20 09:55:41', status: '启用', remark: '真实系统样例仓库' },
  ],
  items: [
    { id: '2031608917141770242', sku: 'SKU-MOTOR-HUB', name: '轮毂电机', category: '电机', brand: '测试', unit: '台', barcode: '2031608917527646209', attrs: '无批次/无序列号', batch: false, serial: false, validDay: '-', status: '启用' },
    { id: '2031640144200617985', sku: 'SKU-MOTOR-MID', name: '中置电机', category: '电机', brand: 'borui', unit: '台', barcode: '2031640144523579394', attrs: '无批次/无序列号', batch: false, serial: false, validDay: '-', status: '启用' },
  ],
  itemDictionaries: [
    { id: '2031608669367455745', type: '商品分类', code: 'CAT-MOTOR', name: '电机', orderNum: 0, status: '启用' },
    { id: '2031608697314103298', type: '商品分类', code: 'CAT-HUB', name: '轮毂', orderNum: 1, status: '启用' },
    { id: '2033056487030460417', type: '商品品牌', code: 'BR-TEST', name: '测试', orderNum: 6, status: '启用' },
    { id: '2033056448950374401', type: '商品品牌', code: 'BR-BORUI', name: 'borui', orderNum: 7, status: '启用' },
    { id: '178056201030505', type: '计量单位', code: 'UNIT-GE', name: '个', orderNum: 1, status: '启用' },
    { id: '178056201030506', type: '计量单位', code: 'UNIT-JIAN', name: '件', orderNum: 2, status: '启用' },
    { id: '2032274866564038658', type: '商品属性', code: 'ATTR-COLOR', name: '颜色', orderNum: 10, options: '红/黄/蓝', status: '启用' },
    { id: '2031612687695237121', type: '商品属性', code: 'ATTR-MEN-SIZE', name: '男士尺码', orderNum: 11, options: '37/38/39/40/41/42/43/44', status: '启用' },
  ],
  merchants: [
    { id: '2032394108785512450', code: 'hengli', name: '恒立', type: '客户+供应商', contact: '-', settlement: '-', status: '启用' },
    { id: '2032394193359458306', code: 'alibaba', name: 'alibaba', type: '客户+供应商', contact: '-', settlement: '-', status: '启用' },
  ],
  people: [
    { id: '2001917843782656001', account: '18015578617', name: '赵大哥', role: 'tenant_admin', warehouseType: '全部仓库', loginDate: '2026-06-15 18:16:25', status: '启用' },
    { id: '2030811940607000578', account: '16666666666', name: '测试1', role: 'tenant_sub', warehouseType: '全部仓库', loginDate: '2026-03-19 17:10:16', status: '启用' },
    { id: '2034562888525541378', account: 'wms', name: '若依', role: 'tenant_sub', warehouseType: '全部仓库', loginDate: '2026-07-09 13:52:40', status: '启用' },
  ],
  operationTypes: [
    { id: 'OP-001', code: 'receipt', name: '入库', direction: '入库', affects: '增加库存', audit: '入库审核', status: '启用' },
    { id: 'OP-002', code: 'shipment', name: '出库', direction: '出库', affects: '扣减库存', audit: '出库审核', status: '启用' },
    { id: 'OP-003', code: 'movement', name: '移库', direction: '移动', affects: '迁移仓库/库位余额', audit: '移库审核', status: '启用' },
    { id: 'OP-004', code: 'check', name: '盘库', direction: '调整', affects: '生成盘盈盘亏', audit: '盘库审核', status: '启用' },
  ],
  documentTemplates: [
    { id: 'REC-260703-001', name: '采购入库单', type: '入库', counterparty: '星云智能科技', quantity: 48, amount: '¥32,640', status: '待审核' },
    { id: 'SHP-260703-018', name: '销售出库单', type: '出库', counterparty: '华东商贸', quantity: 96, amount: '¥68,800', status: '已审核' },
    { id: 'MOV-260703-006', name: '库内移库单', type: '移库', counterparty: '存储区A → 拣选区B', quantity: 24, amount: '-', status: '暂存' },
    { id: 'CHK-260703-012', name: '盘库单', type: '盘库', counterparty: 'A-01-03-02', quantity: 128, amount: '-', status: '待审核' },
  ],
  inventoryWarnings: [
    { id: '2035716219550162948', object: '轮毂电机', type: 'SKU 预警', threshold: '100.00 - 500.00', current: '128.00', level: '正常' },
    { id: '2035716219550162947', object: '中置电机', type: 'SKU 预警', threshold: '100.00 - 500.00', current: '46.00', level: '预警' },
    { id: '2035716458428358660', object: '吴江仓 / 轮毂电机', type: '仓库预警', threshold: '10.00 - 100.00', current: '8.00', level: '预警' },
  ],
  blockedSystemModules: [
    { module: '系统参数', api: '/system/config/list', result: '403 无访问权限', handling: '页面展示但写入按钮禁用' },
    { module: '系统字典', api: '/system/dict/data/list', result: '403 无访问权限', handling: '仅展示授权说明' },
    { module: 'OSS 文件', api: '/system/oss/list', result: '403 无访问权限', handling: '保留上传入口和权限提示' },
  ],
  salesStats: [
    { channel: '天猫旗舰店', orders: 2860, quantity: 9320, amount: '¥1,286,400', growth: '+12.8%' },
    { channel: '京东自营', orders: 1940, quantity: 6840, amount: '¥946,200', growth: '+8.4%' },
    { channel: '经销商 B2B', orders: 318, quantity: 12480, amount: '¥2,340,800', growth: '+21.6%' },
  ],
};
