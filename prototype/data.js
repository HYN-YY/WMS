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
