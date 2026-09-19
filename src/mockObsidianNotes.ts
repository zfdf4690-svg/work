export interface NoteProperty {
  id: string;
  key: string;
  type: 'date' | 'tags' | 'link' | 'text';
  value: string | string[];
}

export interface ObsidianNote {
  id: string;
  title: string;
  folderPath: string; // e.g. "日记" or "Lark/思维导图"
  updatedAt: string;
  properties: NoteProperty[];
  content: string;
}

export interface FolderNode {
  id: string;
  name: string;
  path: string;
  isOpen?: boolean;
  children?: FolderNode[];
  notes?: string[]; // note IDs
}

export const defaultNotes: Record<string, ObsidianNote> = {
  'note-2026-08-12': {
    id: 'note-2026-08-12',
    title: '2026-08-12',
    folderPath: '日记',
    updatedAt: '2026-08-12 18:40',
    properties: [
      { id: 'p-1', key: 'date', type: 'date', value: '2026/08/12' },
      { id: 'p-2', key: 'tags', type: 'tags', value: ['日记', '学习', '多维表格', '智能体', 'CSM'] },
      { id: 'p-3', key: 'lark doc url', type: 'link', value: 'https://xinqiaodigital.feishu.cn/docx/BTdudLWkEoMWzwxCkPvcQ7BJnPf' },
    ],
    content: `## 📅 2026年8月12日 星期三

## 📋 今日主要工作

| 序号 | 内容 |
| :--- | :--- |
| 1 | 搭建多维表格 CSM 数据表 |
| 2 | 创建多维表格智能体 |
| 3 | 配置定时任务：群聊自动发送周检任务 |
| 4 | 明确多维表格智能体的核心概念与应用价值 |

---

## 💡 今日认知升级

### 多维表格智能体：核心概念

1. **结构化数据驱动决策**：多维表格不仅是轻量级数据库，更是 Agentic 业务工作流的中心节点。通过自动化工作流与群聊机器人联动，大幅降低跨系统同步开销。
2. **自动化定时任务执行**：
   - 每周一 09:30 自动拉取待检企业列表；
   - 触发智能体生成自检清单与预警风险度指标；
   - 自动在飞书项目群中 @负责人 派发跟踪卡片。
3. **知识图谱沉淀**：
   - 客户维度的沟通记录通过自然语言提取，沉淀至企业知识库中。
   - 形成「业务录入 → 自动化提炼 → 智能体建议 → 人工确认」的闭环架构。

---

> [!tip] 随堂心得
> 工具的价值不在于其功能多繁复，而在于与日常工作场景的结合密度。将日常巡检固化为智能体流程，可将日常沟通成本降低 45% 以上。
`,
  },
  'note-2026-08-11': {
    id: 'note-2026-08-11',
    title: '2026-08-11',
    folderPath: '日记',
    updatedAt: '2026-08-11 19:15',
    properties: [
      { id: 'p-1', key: 'date', type: 'date', value: '2026/08/11' },
      { id: 'p-2', key: 'tags', type: 'tags', value: ['日记', '飞书妙搭', 'PRD'] },
    ],
    content: `## 📅 2026年8月11日 星期二

## 📋 今日主要工作

| 序号 | 内容 |
| :--- | :--- |
| 1 | 飞书妙搭低代码审批表单原型设计 |
| 2 | 对齐硬件产品与嵌入式驱动协议 |
| 3 | 梳理硬件产品经理指导手册框架 |

---

## 💡 沉淀要点
- 完成了妙搭前端与 RESTful API 的打通配置，支持动态表单校验。
- 讨论并确认了 I2C EEPROM 在设备开机阶段的引导序列。
`,
  },
  'note-lark-csm': {
    id: 'note-lark-csm',
    title: '多维表格知识梳理',
    folderPath: 'Lark/思维导图',
    updatedAt: '2026-08-10 14:20',
    properties: [
      { id: 'p-1', key: 'category', type: 'text', value: '企业系统' },
      { id: 'p-2', key: 'tags', type: 'tags', value: ['飞书', '多维表格', '知识库'] },
    ],
    content: `## 📊 多维表格核心架构梳理

### 一、字段与视图设计
- **核心字段类型**：单行文本、单选标签、进度条、双向关联引用、自动化函数公式。
- **视图策略**：看板视图（Kanban）、甘特图（Gantt）、画册视图（Gallery）、表单收集视图。

### 二、开放平台与 Webhook 自动化
- 支持通过 Open API 写入数据与更新单元格。
- 支持与桌面悬浮球应用完成双向状态同步。
`,
  },
  'note-pm-spec': {
    id: 'note-pm-spec',
    title: '产品经理知识体系',
    folderPath: '产品经理知识体系',
    updatedAt: '2026-08-08 11:00',
    properties: [
      { id: 'p-1', key: 'tags', type: 'tags', value: ['方法论', '产品架构', 'Obsidian'] },
    ],
    content: `## 🧭 产品经理核心知识框架

1. **需求洞察与机会评估**
   - 商业价值 vs 技术可行性矩阵；
   - 用户旅程图与关键摩擦点提炼。
2. **交互规范与工匠标准**
   - Materiality & Lighting 磨砂亚克力视觉工程；
   - 状态闭环（加载、为空、骨架屏、异常恢复）。
`,
  },
  'note-eeprom': {
    id: 'note-eeprom',
    title: 'AT24C02-I2C-EEPROM驱动开发',
    folderPath: '日记',
    updatedAt: '2026-08-05 16:30',
    properties: [
      { id: 'p-1', key: 'tags', type: 'tags', value: ['硬件', '嵌入式', 'I2C'] },
    ],
    content: `## 🔌 AT24C02 I2C 存储芯片通讯要点

- **从机地址**：\`0xA0\`（写操作）与 \`0xA1\`（读操作）。
- **页写限制**：AT24C02 每页 8 字节，跨页写时需要分段发送并等待 5ms 内部写周期。
- **时序验证**：SCL 保持高电平期间，SDA 的由高到低跳变代表 START 信号。
`,
  },
  'note-2026-05-31': {
    id: 'note-2026-05-31',
    title: '2026-05-31',
    folderPath: '日记',
    updatedAt: '2026-05-31 20:10',
    properties: [
      { id: 'p-1', key: 'date', type: 'date', value: '2026/05/31' },
      { id: 'p-2', key: 'tags', type: 'tags', value: ['日记', '规划'] },
    ],
    content: `## 📅 2026年5月31日

## 📋 今日总结
- 制定 6 月产品开发与知识库沉淀计划。
- 完成多维表格与协同自动化脚本初版测试。
`,
  },
  'note-2026-06-01': {
    id: 'note-2026-06-01',
    title: '2026-06-01',
    folderPath: '日记',
    updatedAt: '2026-06-01 18:00',
    properties: [
      { id: 'p-1', key: 'date', type: 'date', value: '2026/06/01' },
      { id: 'p-2', key: 'tags', type: 'tags', value: ['日记', '多维表格'] },
    ],
    content: `## 📅 2026年6月1日

## 📋 今日主要工作
1. 梳理业务线需求与多维表格字段映射。
2. 联调飞书 Open API 数据推送机制。
`,
  },
  'note-2026-06-02': {
    id: 'note-2026-06-02',
    title: '2026-06-02',
    folderPath: '日记',
    updatedAt: '2026-06-02 19:30',
    properties: [
      { id: 'p-1', key: 'date', type: 'date', value: '2026/06/02' },
      { id: 'p-2', key: 'tags', type: 'tags', value: ['日记', '妙搭'] },
    ],
    content: `## 📅 2026年6月2日

## 📋 妙搭表单设计
- 优化数据校验规则与多级联动下拉菜单。
`,
  },
  'note-2026-06-03': {
    id: 'note-2026-06-03',
    title: '2026-06-03',
    folderPath: '日记',
    updatedAt: '2026-06-03 17:45',
    properties: [
      { id: 'p-1', key: 'date', type: 'date', value: '2026/06/03' },
      { id: 'p-2', key: 'tags', type: 'tags', value: ['日记', '架构'] },
    ],
    content: `## 📅 2026年6月3日

## 📋 架构对齐
- 针对低代码前端与服务端鉴权机制进行安全审计。
`,
  },
  'note-2026-06-04': {
    id: 'note-2026-06-04',
    title: '2026-06-04',
    folderPath: '日记',
    updatedAt: '2026-06-04 18:20',
    properties: [
      { id: 'p-1', key: 'date', type: 'date', value: '2026/06/04' },
      { id: 'p-2', key: 'tags', type: 'tags', value: ['日记', '硬件'] },
    ],
    content: `## 📅 2026年6月4日

## 📋 硬件驱动测试
- 针对 I2C 总线抗干扰能力进行波形测试与记录。
`,
  },
  'note-2026-06-16': {
    id: 'note-2026-06-16',
    title: '2026-06-16',
    folderPath: '日记',
    updatedAt: '2026-06-16 21:00',
    properties: [
      { id: 'p-1', key: 'date', type: 'date', value: '2026/06/16' },
      { id: 'p-2', key: 'tags', type: 'tags', value: ['日记', '总结'] },
    ],
    content: `## 📅 2026年6月16日

## 📋 中期复盘
- 知识库与桌面协同智能体流程测试通过。
`,
  },
  'note-lark-miaoda': {
    id: 'note-lark-miaoda',
    title: '飞书妙搭搭建指南',
    folderPath: 'Lark/思维导图',
    updatedAt: '2026-08-09 11:30',
    properties: [
      { id: 'p-1', key: 'tags', type: 'tags', value: ['飞书妙搭', '低代码', '流程设计'] },
    ],
    content: `## 🛠️ 飞书妙搭低代码应用搭建指南

### 核心设计原则
1. **数据模型先行**：清晰定义实体属性与关联字段。
2. **状态流驱动**：可视化审批链与分支条件流转。
3. **沉浸式权限隔离**：角色权限与字段级读写管控。
`,
  },
  'note-lark-aily': {
    id: 'note-lark-aily',
    title: 'Aily 智能体工作流设计',
    folderPath: 'Lark/思维导图',
    updatedAt: '2026-08-07 15:40',
    properties: [
      { id: 'p-1', key: 'tags', type: 'tags', value: ['Aily', '智能体', '工作流'] },
    ],
    content: `## 🤖 Aily 智能体工作流架构

- **意图分发引擎**：多轮对话与槽位填充。
- **工具调用与执行**：与企业 CRM、多维表格与消息通知双向集成。
- **人机协同确认**：高风险变更必须经人工审核审批。
`,
  },
  'note-lark-doubao': {
    id: 'note-lark-doubao',
    title: '豆包大模型在多维表格的应用',
    folderPath: 'Lark/思维导图',
    updatedAt: '2026-08-06 10:15',
    properties: [
      { id: 'p-1', key: 'tags', type: 'tags', value: ['豆包', '大模型', 'Prompt'] },
    ],
    content: `## 🧠 豆包大模型与多维表格集成

- **批量文本分类**：根据工单描述自动匹配业务标签。
- **摘要提炼与生成**：自动汇总周报与会议行动项。
`,
  },
  'note-lark-ai-practice': {
    id: 'note-lark-ai-practice',
    title: 'AI 知识库落地最佳实践',
    folderPath: 'Lark/思维导图',
    updatedAt: '2026-08-04 14:00',
    properties: [
      { id: 'p-1', key: 'tags', type: 'tags', value: ['RAG', '向量检索', '知识库'] },
    ],
    content: `## 📚 企业级 AI 知识库落地实践

1. **切片策略（Chunking）**：按 Markdown 二级标题语义分块。
2. **混合检索**：BM25 关键词匹配 + Dense Vector 语义检索。
3. **重排模型（Reranker）**：过滤不相关内容提升问答精确度。
`,
  },
  'note-lark-mindmap-core': {
    id: 'note-lark-mindmap-core',
    title: '业务思维导图全景架构',
    folderPath: 'Lark/思维导图',
    updatedAt: '2026-08-02 16:20',
    properties: [
      { id: 'p-1', key: 'tags', type: 'tags', value: ['思维导图', '业务全景', '知识体系'] },
    ],
    content: `## 🗺️ 业务全景架构导图

- **业务前台**：桌面悬浮球、快捷指令、即时通知。
- **业务中台**：任务拆解中心、多维表格协同平台、MCP 协议网关。
- **知识后台**：Obsidian 本地双链知识库、企业飞书文档库。
`,
  },
};

export const initialFolderTree: FolderNode[] = [
  {
    id: 'f-pycache',
    name: '__pycache__',
    path: '__pycache__',
    isOpen: false,
    notes: [],
  },
  {
    id: 'f-pm',
    name: '产品经理知识体系',
    path: '产品经理知识体系',
    isOpen: false,
    notes: ['note-pm-spec'],
  },
  {
    id: 'f-personal',
    name: '个人知识库',
    path: '个人知识库',
    isOpen: false,
    notes: [],
  },
  {
    id: 'f-diary',
    name: '日记',
    path: '日记',
    isOpen: true, // Expanded by default matching screenshot
    notes: [
      'note-2026-05-31',
      'note-2026-06-01',
      'note-2026-06-02',
      'note-2026-06-03',
      'note-2026-06-04',
      'note-2026-06-16',
      'note-2026-08-11',
      'note-2026-08-12',
      'note-eeprom',
    ],
  },
  {
    id: 'f-hardware',
    name: '硬件产品经理指导手册',
    path: '硬件产品经理指导手册',
    isOpen: false,
    notes: [],
  },
  {
    id: 'f-kb-root',
    name: 'knowledge base',
    path: 'knowledge base',
    isOpen: false,
    notes: [],
  },
  {
    id: 'f-lark',
    name: 'Lark',
    path: 'Lark',
    isOpen: true, // Expanded by default matching screenshot
    children: [
      {
        id: 'f-lark-mindmap',
        name: '思维导图',
        path: 'Lark/思维导图',
        isOpen: true,
        notes: [
          'note-lark-csm',
          'note-lark-miaoda',
          'note-lark-aily',
          'note-lark-doubao',
          'note-lark-ai-practice',
          'note-lark-mindmap-core',
        ],
      },
    ],
  },
  {
    id: 'f-attachments',
    name: 'attachments',
    path: 'attachments',
    isOpen: false,
    notes: [],
  },
  {
    id: 'f-knowledge-collect',
    name: '个人知识搜集',
    path: '个人知识搜集',
    isOpen: false,
    notes: [],
  },
];
