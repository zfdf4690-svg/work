import { TaskItem, AISuggestion, KnowledgeItem, ContextItem, ChatMessage, MeetingInfo } from './types';

export const initialTasks: TaskItem[] = [
  {
    id: 't-1',
    title: '产品方案设计',
    completed: true,
    priority: 'high',
    dueTime: '今天 18:00',
    category: '产品研发',
    isImportant: true,
  },
  {
    id: 't-2',
    title: '客户资料整理',
    completed: false,
    priority: 'medium',
    dueTime: '今天 20:00',
    category: '业务运营',
    isImportant: false,
  },
  {
    id: 't-3',
    title: '竞品分析报告',
    completed: false,
    priority: 'low',
    dueTime: '明天 10:00',
    category: '行业研究',
    isImportant: false,
  },
  {
    id: 't-4',
    title: '团队会议纪要',
    completed: false,
    priority: 'normal',
    dueTime: '明天 15:00',
    category: '团队协作',
    isImportant: false,
  },
  {
    id: 't-5',
    title: '飞书多维表格同步',
    completed: false,
    priority: 'high',
    dueTime: '今天 19:30',
    category: '企业集成',
    isImportant: true,
  },
  {
    id: 't-6',
    title: '前端响应式规范走查',
    completed: false,
    priority: 'medium',
    dueTime: '后天 11:00',
    category: '设计系统',
    isImportant: false,
  },
  {
    id: 't-7',
    title: 'API 权限鉴权对接',
    completed: true,
    priority: 'normal',
    dueTime: '今天 14:00',
    category: '技术架构',
    isImportant: false,
  },
  {
    id: 't-8',
    title: '周报生成与交付',
    completed: true,
    priority: 'normal',
    dueTime: '今天 12:00',
    category: '常规事务',
    isImportant: false,
  },
];

export const initialSuggestions: AISuggestion[] = [
  {
    id: 's-1',
    title: '整理产品方案的参考资料',
    badge: 'GPT-4o 增强',
    targetTool: 'knowledge_synthesizer',
    steps: [
      {
        id: 'st-1-1',
        toolName: 'Read File',
        label: '读取文件：产品设计方案_草稿.pdf',
        status: 'pending',
        detail: '正在提取核心章节与架构图...',
      },
      {
        id: 'st-1-2',
        toolName: 'Search Knowledge',
        label: '检索企业知识库：体验设计规范库',
        status: 'pending',
        detail: '命中 8 篇关联最佳实践',
      },
      {
        id: 'st-1-3',
        toolName: 'Synthesize Document',
        label: '提炼核心参考点并生成结构化参考卡',
        status: 'pending',
        detail: '生成 4 项方案决策依据',
      },
    ],
  },
  {
    id: 's-2',
    title: '分析竞品的市场趋势摘要',
    badge: '实时网络分析',
    targetTool: 'competitive_analyst',
    steps: [
      {
        id: 'st-2-1',
        toolName: 'Query Market Intelligence',
        label: '检索国内外头部 AI 协作应用交互动态',
        status: 'pending',
        detail: '聚焦 Linear、Notion、Raycast 新增特性',
      },
      {
        id: 'st-2-2',
        toolName: 'Feature Extraction',
        label: '提取功能异同点与响应式交互矩阵',
        status: 'pending',
        detail: '比对键盘流优先与上下文保留设计',
      },
      {
        id: 'st-2-3',
        toolName: 'Draft Insights',
        label: '输出竞品定位趋势备忘录',
        status: 'pending',
        detail: '沉淀至当前工作上下文',
      },
    ],
  },
  {
    id: 's-3',
    title: '生成会议纪要标准模板',
    badge: '自动提炼',
    targetTool: 'agenda_generator',
    steps: [
      {
        id: 'st-3-1',
        toolName: 'Read Calendar Event',
        label: '读取日程：下午 2:00 产品方案评审',
        status: 'pending',
        detail: '参会人：李经理、王架构师及核心组 4 人',
      },
      {
        id: 'st-3-2',
        toolName: 'Generate Agenda Outline',
        label: '自动匹配企业标准模板与评审要点',
        status: 'pending',
        detail: '输出背景、议题、结论与待办四要素',
      },
    ],
  },
];

export const initialKnowledge: KnowledgeItem[] = [
  {
    id: 'k-1',
    title: 'MCP 架构解析指南',
    category: '企业核心知识库',
    timeAgo: '2 小时前',
    iconType: 'mcp',
    readTime: '6 分钟阅读',
    summary: '详细解析 Model Context Protocol 的资源与工具暴露机制，指导桌面端工作助手与本地/企业服务的互联规范。',
    tags: ['MCP', '架构规范', 'Agent协议'],
  },
  {
    id: 'k-2',
    title: '产品设计方法论 4.0',
    category: '体验设计规范库',
    timeAgo: '4 小时前',
    iconType: 'methodology',
    readTime: '10 分钟阅读',
    summary: '针对 AI 原生工作流的桌面端交互范式，重点阐述键盘导航优先、状态透明性与少打扰原则。',
    tags: ['UX规范', '极简主义', '交互法则'],
  },
  {
    id: 'k-3',
    title: 'AI Agent 实践手册',
    category: '团队共享文库',
    timeAgo: '1 天前',
    iconType: 'agent',
    readTime: '15 分钟阅读',
    summary: '从 Tool Calling 状态转换到 Action Confirmation 风险阻断，构建可信、确定性强的企业级智能体闭环。',
    tags: ['Tool Calling', '安全确认', '闭环设计'],
  },
];

export const initialContexts: ContextItem[] = [
  {
    id: 'ctx-1',
    type: 'task',
    name: '产品方案设计与评审',
    detail: '今天 18:00 · 高优先级',
    active: true,
  },
  {
    id: 'ctx-2',
    type: 'knowledge',
    name: '体验设计规范库 4.0',
    detail: '企业已同步 · 1,248 篇文档',
    active: true,
  },
  {
    id: 'ctx-3',
    type: 'file',
    name: 'AI Work Assistant PRD_v1.0.pdf',
    detail: '已解析 28 章节 · 向量索引就绪',
    active: true,
  },
  {
    id: 'ctx-4',
    type: 'project',
    name: 'AI 办公助手桌面端原型',
    detail: '核心组 · 深圳研发部',
    active: true,
  },
];

export const todayMeeting: MeetingInfo = {
  title: '产品方案评审',
  time: '下午 2:00 - 4:00',
  platform: '腾讯会议',
  participants: [
    { name: '李', avatarBg: 'bg-indigo-600/60' },
    { name: '王', avatarBg: 'bg-sky-600/60' },
    { name: '陈', avatarBg: 'bg-purple-600/60' },
    { name: '张', avatarBg: 'bg-amber-600/60' },
  ],
  link: 'https://meeting.tencent.com/dm/review-v1',
};

export const initialChatMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: '帮我针对下午 2:00 的「产品方案评审」整理准备材料，并规划好后续的待办事项。',
    timestamp: '11:42',
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: '已收到需求。我将结合当前上下文中的「产品方案设计」和「体验设计规范库 4.0」，为你自动化读取参考资料，并提炼会议预读清单。',
    timestamp: '11:43',
    toolSteps: [
      {
        id: 'ts-1',
        toolName: 'Read File',
        label: '已读取：AI Work Assistant PRD_v1.0.pdf',
        status: 'success',
        detail: '提取了第 6 节三栏架构及第 10 节 Tool Calling 规范。',
      },
      {
        id: 'ts-2',
        toolName: 'Search Knowledge',
        label: '检索知识库：体验设计规范库',
        status: 'success',
        detail: '找到 12 条关于毛玻璃视觉与极简交互的准则。',
      },
      {
        id: 'ts-3',
        toolName: 'Synthesize Review Document',
        label: '生成评审重点摘要与讨论提纲',
        status: 'success',
        detail: '完成 3 个关键权衡点总结。',
      },
    ],
    actionConfirmation: {
      id: 'act-1',
      actionType: 'create_task',
      title: '创建新任务确认',
      description: '为确保工作流闭环，我建议在任务系统中新增一条待办事项，并同步到飞书：',
      payload: {
        '任务名称': '完成产品方案评审预读材料同步',
        '截止时间': '今天 13:45',
        '优先级': '高优先级 (High)',
        '同步渠道': '飞书日程 & 企业待办',
      },
      confirmed: false,
    },
  },
];
