import React, { useState, useRef, useEffect } from 'react';
import { 
  TaskItem, 
  AISuggestion, 
  MeetingInfo 
} from '../types';
import { TaskStatus } from '../domain';
import { 
  CloudSun, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Plus, 
  Sparkles, 
  MessageSquare, 
  ArrowRight, 
  ExternalLink,
  ChevronRight,
  Clock,
  Video
} from 'lucide-react';

interface DashboardViewProps {
  tasks: TaskItem[];
  suggestions: AISuggestion[];
  tasksLoaded: boolean;
  meeting: MeetingInfo | null;
  onToggleTask: (taskId: string) => void;
  onAddNewTask: (title: string, priority: 'high' | 'medium' | 'low' | 'normal') => Promise<boolean>;
  onDeleteTask: (taskId: string) => void;
  onExecuteSuggestion: (suggestion: AISuggestion) => void;
  onNavigateToAI: () => void;
  onOpenMeetingModal: () => void;
  onOpenAllTasksModal?: () => void;
}

type FilterTab = 'all' | 'pending' | 'in_progress' | 'completed';

/**
 * 4.1 天气区独立占位胶囊
 * 后续只替换此组件即可接入真实天气，不影响任务区
 */
export const WeatherBadge: React.FC = () => {
  return (
    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full acrylic-pill text-xs text-[#c7c9dc] select-none">
      <CloudSun className="w-4 h-4 text-[#7bd0ff] shrink-0" />
      <span>天气暂未接入</span>
    </div>
  );
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  tasks,
  suggestions,
  tasksLoaded,
  meeting,
  onToggleTask,
  onAddNewTask,
  onDeleteTask,
  onExecuteSuggestion,
  onNavigateToAI,
  onOpenMeetingModal,
  onOpenAllTasksModal,
}) => {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [isAddingInline, setIsAddingInline] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inlineInputRef = useRef<HTMLInputElement>(null);

  // 展开行内表单时自动聚焦
  useEffect(() => {
    if (isAddingInline) {
      inlineInputRef.current?.focus();
    }
  }, [isAddingInline]);

  // 4.1 动态问候语（按本地小时，不显示用户姓名）
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 0 && hour <= 4) return '夜深了，注意休息';
    if (hour >= 5 && hour <= 10) return '早上好，今天也加油！';
    if (hour >= 11 && hour <= 13) return '中午好，记得休息';
    if (hour >= 14 && hour <= 17) return '下午好，继续加油！';
    return '晚上好，辛苦了';
  };

  // 4.1 动态格式化本地日期（不写死）
  const formattedDate = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  // 通用口径状态提取
  const statusOf = (t: TaskItem): TaskStatus => {
    if (t.status) return t.status;
    return t.completed ? TaskStatus.COMPLETED : TaskStatus.PENDING;
  };

  // 可见任务 = 所有 statusOf !== CANCELLED 的任务（已取消不进入方块、列表、总计）
  const visibleTasks = tasks.filter(t => statusOf(t) !== TaskStatus.CANCELLED);

  // 4.2 今日任务概览四个方块统计
  const pendingCount = visibleTasks.filter(t => statusOf(t) === TaskStatus.PENDING).length;
  const inProgressCount = visibleTasks.filter(t => statusOf(t) === TaskStatus.IN_PROGRESS).length;
  const completedCount = visibleTasks.filter(t => statusOf(t) === TaskStatus.COMPLETED).length;
  const totalCount = pendingCount + inProgressCount + completedCount;

  // 4.3 标签页过滤与排序
  const filteredTasks = visibleTasks.filter(t => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return statusOf(t) === TaskStatus.PENDING;
    if (activeTab === 'in_progress') return statusOf(t) === TaskStatus.IN_PROGRESS;
    if (activeTab === 'completed') return statusOf(t) === TaskStatus.COMPLETED;
    return true;
  });

  // 排序：未完成在前、已完成在后；同组内按 dueAt 升序，无 dueAt 的排最后
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const aDone = statusOf(a) === TaskStatus.COMPLETED;
    const bDone = statusOf(b) === TaskStatus.COMPLETED;
    if (aDone !== bDone) {
      return aDone ? 1 : -1;
    }
    if (a.dueAt && b.dueAt) {
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    }
    if (a.dueAt && !b.dueAt) return -1;
    if (!a.dueAt && b.dueAt) return 1;
    return 0;
  });

  const displayedTasks = sortedTasks.slice(0, 8);
  const overflowCount = sortedTasks.length - 8;

  // 4.4 行内表单提交
  const handleInlineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const ok = await onAddNewTask(trimmed, newPriority);
      if (ok) {
        setNewTitle('');
        setNewPriority('medium');
        setIsAddingInline(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4.6 右侧最近动态（仅从 tasks 推导，不虚构）
  const formatRelativeTime = (isoString: string): string => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffSec = Math.max(0, Math.floor(diffMs / 1000));
      if (diffSec < 60) return '刚刚';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin} 分钟前`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour} 小时前`;
      const d = new Date(isoString);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${mm}-${dd}`;
    } catch {
      return '刚刚';
    }
  };

  const activities = visibleTasks
    .filter(t => t.updatedAt || t.completedAt)
    .map(t => {
      const timeIso = t.completedAt ?? t.updatedAt!;
      const isDone = statusOf(t) === TaskStatus.COMPLETED || t.completed;
      let text = `你更新了任务：${t.title}`;
      if (isDone) {
        text = `你完成了任务：${t.title}`;
      } else if (t.createdAt && t.updatedAt && t.createdAt === t.updatedAt) {
        text = `你创建了任务：${t.title}`;
      }
      return {
        id: t.id,
        text,
        timeIso,
      };
    })
    .sort((a, b) => new Date(b.timeIso).getTime() - new Date(a.timeIso).getTime())
    .slice(0, 5);

  const getPriorityBadge = (priority: TaskItem['priority']) => {
    if (priority === 'high') {
      return (
        <span className="px-2 py-0.5 rounded-md bg-[#F87171]/15 border border-[#F87171]/25 text-[#F87171] font-mono text-[11px] shrink-0">
          高
        </span>
      );
    }
    if (priority === 'low') {
      return (
        <span className="px-2 py-0.5 rounded-md bg-[#7bd0ff]/15 border border-[#7bd0ff]/25 text-[#7bd0ff] font-mono text-[11px] shrink-0">
          低
        </span>
      );
    }
    // medium / normal 均显示「中」
    return (
      <span className="px-2 py-0.5 rounded-md bg-[#FBBF24]/15 border border-[#FBBF24]/25 text-[#FBBF24] font-mono text-[11px] shrink-0">
        中
      </span>
    );
  };

  const getStatusBadge = (t: TaskItem) => {
    const s = statusOf(t);
    if (s === TaskStatus.COMPLETED) {
      return (
        <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-[11px] shrink-0">
          已完成
        </span>
      );
    }
    if (s === TaskStatus.IN_PROGRESS) {
      return (
        <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 text-[11px] shrink-0">
          进行中
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md bg-slate-500/15 border border-slate-500/25 text-slate-300 text-[11px] shrink-0">
        待开始
      </span>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 font-sans text-[#e1e2eb]">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 4.1 顶部区域 */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {getGreeting()}
            </h1>
            <p className="text-xs text-[#8c8ea3] mt-1 font-mono">
              {formattedDate}
            </p>
          </div>
          <div className="shrink-0">
            <WeatherBadge />
          </div>
        </header>

        {/* 4.8 两列响应式布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] gap-6 items-start">
          {/* 左列：今日任务概览、任务列表、快捷操作 */}
          <div className="space-y-6 min-w-0">
            {/* 4.2 今日任务概览四个方块 */}
            <section aria-label="今日任务概览">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* 待开始 */}
                <button
                  type="button"
                  onClick={() => setActiveTab('pending')}
                  aria-pressed={activeTab === 'pending'}
                  className={`p-4 rounded-2xl acrylic-card text-left transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    activeTab === 'pending'
                      ? 'border-indigo-400/50 bg-indigo-500/10 shadow-lg'
                      : 'hover:border-white/20'
                  }`}
                >
                  <span className="text-xs text-[#8c8ea3] block">待开始</span>
                  <span className="text-2xl font-semibold text-white font-mono mt-1 block">
                    {pendingCount}
                  </span>
                </button>

                {/* 进行中 */}
                <button
                  type="button"
                  onClick={() => setActiveTab('in_progress')}
                  aria-pressed={activeTab === 'in_progress'}
                  className={`p-4 rounded-2xl acrylic-card text-left transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    activeTab === 'in_progress'
                      ? 'border-indigo-400/50 bg-indigo-500/10 shadow-lg'
                      : 'hover:border-white/20'
                  }`}
                >
                  <span className="text-xs text-[#8c8ea3] block">进行中</span>
                  <span className="text-2xl font-semibold text-indigo-300 font-mono mt-1 block">
                    {inProgressCount}
                  </span>
                </button>

                {/* 已完成 */}
                <button
                  type="button"
                  onClick={() => setActiveTab('completed')}
                  aria-pressed={activeTab === 'completed'}
                  className={`p-4 rounded-2xl acrylic-card text-left transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    activeTab === 'completed'
                      ? 'border-indigo-400/50 bg-indigo-500/10 shadow-lg'
                      : 'hover:border-white/20'
                  }`}
                >
                  <span className="text-xs text-[#8c8ea3] block">已完成</span>
                  <span className="text-2xl font-semibold text-emerald-400 font-mono mt-1 block">
                    {completedCount}
                  </span>
                </button>

                {/* 总计 */}
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  aria-pressed={activeTab === 'all'}
                  className={`p-4 rounded-2xl acrylic-card text-left transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    activeTab === 'all'
                      ? 'border-indigo-400/50 bg-indigo-500/10 shadow-lg'
                      : 'hover:border-white/20'
                  }`}
                >
                  <span className="text-xs text-[#8c8ea3] block">总计</span>
                  <span className="text-2xl font-semibold text-white font-mono mt-1 block">
                    {totalCount}
                  </span>
                </button>
              </div>
            </section>

            {/* 4.3 任务列表卡片 */}
            <section className="rounded-2xl acrylic-card p-5 space-y-4" aria-label="任务列表">
              {/* 标题栏与标签页 */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-white">任务列表</h2>
                  <span className="text-xs text-[#8c8ea3] font-mono">
                    ({sortedTasks.length})
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {/* 状态标签页 */}
                  <div role="tablist" aria-label="任务状态筛选" className="flex items-center p-0.5 rounded-lg bg-black/30 border border-white/10 text-xs">
                    {(['all', 'pending', 'in_progress', 'completed'] as FilterTab[]).map(tabKey => {
                      const labelMap: Record<FilterTab, string> = {
                        all: '全部',
                        pending: '待开始',
                        in_progress: '进行中',
                        completed: '已完成',
                      };
                      const isSelected = activeTab === tabKey;
                      return (
                        <button
                          key={tabKey}
                          type="button"
                          role="tab"
                          aria-selected={isSelected}
                          onClick={() => setActiveTab(tabKey)}
                          className={`px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                            isSelected
                              ? 'bg-indigo-600 text-white font-medium shadow-sm'
                              : 'text-[#8c8ea3] hover:text-white'
                          }`}
                        >
                          {labelMap[tabKey]}
                        </button>
                      );
                    })}
                  </div>

                  {/* 新建任务入口 */}
                  <button
                    type="button"
                    onClick={() => setIsAddingInline(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>新建</span>
                  </button>

                  {/* 查看全部 */}
                  {onOpenAllTasksModal && (
                    <button
                      type="button"
                      onClick={onOpenAllTasksModal}
                      className="text-xs text-[#8c8ea3] hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      查看全部
                    </button>
                  )}
                </div>
              </div>

              {/* 4.4 新建任务行内表单 */}
              {isAddingInline && (
                <form
                  onSubmit={handleInlineSubmit}
                  className="p-3.5 rounded-xl bg-black/40 border border-indigo-500/30 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <input
                      ref={inlineInputRef}
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="输入任务标题..."
                      className="flex-1 bg-white/[0.06] border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#8c8ea3] focus:outline-none focus:border-indigo-400"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 text-xs">
                    {/* 优先级单选 */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#8c8ea3] text-[11px]">优先级：</span>
                      {(['high', 'medium', 'low'] as const).map(p => {
                        const labels = { high: '高', medium: '中', low: '低' };
                        const isSelected = newPriority === p;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setNewPriority(p)}
                            className={`px-2 py-0.5 rounded text-[11px] border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                              isSelected
                                ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300 font-medium'
                                : 'bg-transparent border-white/10 text-[#8c8ea3] hover:text-white'
                            }`}
                          >
                            {labels[p]}
                          </button>
                        );
                      })}
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setNewTitle('');
                          setIsAddingInline(false);
                        }}
                        className="px-2.5 py-1 rounded-lg border border-white/10 text-[#8c8ea3] hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      >
                        取消
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || !newTitle.trim()}
                        className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      >
                        {isSubmitting ? '添加中...' : '添加'}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* 任务项列表 */}
              <div className="space-y-1.5 overflow-x-hidden">
                {!tasksLoaded ? (
                  <div className="py-12 text-center text-xs text-[#8c8ea3]">
                    加载中…
                  </div>
                ) : visibleTasks.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#8c8ea3]">
                    还没有任务，点击「新建任务」开始
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#8c8ea3]">
                    该状态下暂无任务
                  </div>
                ) : (
                  displayedTasks.map(task => {
                    const isDone = statusOf(task) === TaskStatus.COMPLETED || task.completed;
                    return (
                      <div
                        key={task.id}
                        className="group flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all"
                      >
                        {/* 左侧：勾选按钮、优先级、标题 */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {/* 唯一触发 onToggleTask 的元素，整行无点击绑定 */}
                          <button
                            type="button"
                            aria-label={`标记「${task.title}」为${isDone ? '未完成' : '已完成'}`}
                            onClick={() => onToggleTask(task.id)}
                            className="p-1 rounded text-[#8c8ea3] hover:text-white transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
                            ) : (
                              <Circle className="w-4 h-4" />
                            )}
                          </button>

                          {getPriorityBadge(task.priority)}

                          <span
                            className={`text-xs truncate min-w-0 ${
                              isDone ? 'line-through text-[#656375]' : 'text-[#f1f2f8]'
                            }`}
                          >
                            {task.title}
                          </span>
                        </div>

                        {/* 右侧：状态徽标、截止时间、删除按钮 */}
                        <div className="flex items-center gap-3 shrink-0">
                          {getStatusBadge(task)}

                          {/* 所有任务使用同一种文字样式，不因日期已过而变色或加前缀 */}
                          <span className="font-mono text-xs text-[#8c8ea3] shrink-0">
                            {task.dueTime}
                          </span>

                          {/* 删除按钮 */}
                          <button
                            type="button"
                            aria-label={`删除任务「${task.title}」`}
                            onClick={() => onDeleteTask(task.id)}
                            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-1 rounded text-[#8c8ea3] hover:text-[#F87171] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* 底部还有 N 项展开入口 */}
              {overflowCount > 0 && onOpenAllTasksModal && (
                <div className="pt-2 text-center border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={onOpenAllTasksModal}
                    className="text-xs text-[#8c8ea3] hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    还有 {overflowCount} 项，查看全部 →
                  </button>
                </div>
              )}
            </section>

            {/* 4.7 快捷操作（仅两项：新建任务、开始对话） */}
            <section className="rounded-2xl acrylic-card p-5 space-y-3" aria-label="快捷操作">
              <h2 className="text-sm font-semibold text-white">快捷操作</h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddingInline(true)}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 text-xs text-white transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <Plus className="w-4 h-4 text-indigo-400" />
                  <span>新建任务</span>
                </button>
                <button
                  type="button"
                  onClick={onNavigateToAI}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 text-xs text-white transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <MessageSquare className="w-4 h-4 text-sky-400" />
                  <span>开始对话</span>
                </button>
              </div>
            </section>
          </div>

          {/* 右列：AI 助手、今日日程、最近动态 */}
          <div className="space-y-6 min-w-0">
            {/* 4.5 AI 助手卡片 */}
            <section className="rounded-2xl acrylic-card p-5 space-y-4" aria-label="AI 助手">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <h2 className="text-sm font-semibold text-white">AI 助手</h2>
                </div>
              </div>
              <p className="text-xs text-[#8c8ea3] leading-relaxed">
                基于你的任务和上下文，提供智能建议与帮助。
              </p>

              {/* 按钮样式的跳转入口，非输入框 */}
              <button
                type="button"
                onClick={onNavigateToAI}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-indigo-400/30 text-xs text-[#8c8ea3] hover:text-white transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <span>有什么可以帮你？</span>
                <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
              </button>

              {/* 最多展示 2 条建议 */}
              {suggestions.slice(0, 2).length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                  {suggestions.slice(0, 2).map(s => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-black/20 border border-white/[0.04] text-xs"
                    >
                      <span className="truncate text-[#c7c9dc] flex-1">
                        {s.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => onExecuteSuggestion(s)}
                        className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      >
                        <span>去执行</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 4.11 今日日程卡片（meeting 为 null 时不渲染） */}
            {meeting && (
              <section className="rounded-2xl acrylic-card p-5 space-y-4" aria-label="今日日程">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-sky-400" />
                    <h2 className="text-sm font-semibold text-white">今日日程</h2>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-white/90 font-medium">
                      {meeting.time}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white/10 text-[11px] text-[#c7c9dc]">
                      {meeting.platform}
                    </span>
                  </div>
                  <p className="text-xs text-white font-medium truncate">
                    {meeting.title}
                  </p>
                </div>

                {/* 参会头像：最多前 4 个，不写死 +4 */}
                {meeting.participants && meeting.participants.length > 0 && (
                  <div className="flex items-center gap-1.5 pt-1">
                    {meeting.participants.slice(0, 4).map((p, idx) => (
                      <div
                        key={idx}
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-medium ${p.avatarBg}`}
                        title={p.name}
                      >
                        {p.name.charAt(0)}
                      </div>
                    ))}
                  </div>
                )}

                {/* 底部按钮 */}
                <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                  {/^https?:\/\//i.test(meeting.link) ? (
                    <a
                      href={meeting.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                    >
                      <span>立即入会</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      className="flex-1 py-2 px-3 rounded-xl bg-white/10 text-white/40 text-xs font-medium cursor-not-allowed"
                    >
                      暂无会议链接
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onOpenMeetingModal}
                    className="py-2 px-3.5 rounded-xl border border-white/15 hover:border-white/30 text-xs text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    详情
                  </button>
                </div>
              </section>
            )}

            {/* 4.6 最近动态卡片（仅从 tasks 推导，不虚构） */}
            <section className="rounded-2xl acrylic-card p-5 space-y-3" aria-label="最近动态">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-semibold text-white">最近动态</h2>
                </div>
              </div>

              {activities.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#8c8ea3]">
                  暂无动态
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.map(act => (
                    <div key={act.id} className="flex items-start justify-between gap-3 text-xs">
                      <span className="text-[#c7c9dc] truncate min-w-0 flex-1">
                        {act.text}
                      </span>
                      <span className="text-[#8c8ea3] text-[11px] font-mono shrink-0">
                        {formatRelativeTime(act.timeIso)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
