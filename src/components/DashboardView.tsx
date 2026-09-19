import React, { useState } from 'react';
import { 
  TaskItem, 
  AISuggestion, 
  KnowledgeItem, 
  MeetingInfo 
} from '../types';
import { 
  Sun, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Video, 
  ExternalLink, 
  Flame, 
  Sparkles, 
  Bot, 
  ChevronRight, 
  Plus, 
  Command, 
  ArrowRight, 
  BookOpen, 
  Compass, 
  Cpu, 
  Calendar,
  Check,
  Radio,
  ListTodo,
  ChevronDown
} from 'lucide-react';

interface DashboardViewProps {
  tasks: TaskItem[];
  suggestions: AISuggestion[];
  knowledge: KnowledgeItem[];
  meeting: MeetingInfo;
  onToggleTask: (taskId: string) => void;
  onAddNewTask: (title: string, priority: 'high' | 'medium' | 'low' | 'normal') => void;
  onExecuteSuggestion: (suggestion: AISuggestion) => void;
  onNavigateToAI: () => void;
  onOpenMeetingModal: () => void;
  onOpenKnowledgeDetail: (item: KnowledgeItem) => void;
  onOpenAllTasksModal?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  tasks,
  suggestions,
  knowledge,
  meeting,
  onToggleTask,
  onAddNewTask,
  onExecuteSuggestion,
  onNavigateToAI,
  onOpenMeetingModal,
  onOpenKnowledgeDetail,
  onOpenAllTasksModal,
}) => {
  const [isAddingInline, setIsAddingInline] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [isCardExpanded, setIsCardExpanded] = useState(false);

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const pendingCount = totalCount - completedCount;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const highPriorityPending = tasks.filter(t => !t.completed && t.priority === 'high').length;
  const normalPriorityPending = tasks.filter(t => !t.completed && (t.priority === 'normal' || t.priority === 'medium' || t.priority === 'low')).length;

  const displayTasks = filterPriority 
    ? tasks.filter(t => t.priority === filterPriority)
    : tasks;

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddNewTask(newTitle.trim(), 'high');
    setNewTitle('');
    setIsAddingInline(false);
  };

  const getPriorityBadge = (priority: TaskItem['priority']) => {
    switch (priority) {
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded-md bg-[#F87171]/15 border border-[#F87171]/25 text-[#F87171] font-mono text-[10px]">
            高优先级
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded-md bg-[#FBBF24]/15 border border-[#FBBF24]/25 text-[#FBBF24] font-mono text-[10px]">
            中优先级
          </span>
        );
      case 'low':
        return (
          <span className="px-2 py-0.5 rounded-md bg-[#7bd0ff]/15 border border-[#7bd0ff]/25 text-[#7bd0ff] font-mono text-[10px]">
            低优先级
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md bg-white/10 border border-white/10 text-[#908fa0] font-mono text-[10px]">
            普通
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-[1360px] w-full mx-auto font-sans">
      {/* Top Greeting Section & Weather Pill (Image 2) */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <span>早上好，张三</span>
            <span className="text-2xl animate-bounce">👋</span>
          </h2>
          <p className="text-xs md:text-sm text-[#908fa0] mt-1 flex items-center gap-2 font-sans">
            <span>今天是 9月6日</span>
            <span className="inline-block w-1 h-1 rounded-full bg-[#908fa0]"></span>
            <span>让我们一起高效工作，今日有 {highPriorityPending} 项重点任务待推进</span>
          </p>
        </div>

        {/* Weather and Location Glass Capsule */}
        <div className="flex items-center gap-3 self-start md:self-auto px-4 py-2 rounded-2xl bg-[#202634]/50 border border-white/[0.08] backdrop-blur-xl specular-card">
          <div className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-[#FBBF24] fill-[#FBBF24]" />
            <span className="font-mono text-[15px] font-semibold text-white">22℃</span>
          </div>
          <span className="text-white/20">|</span>
          <div className="flex items-center gap-2 text-[#c7c4d7] text-xs font-sans">
            <span>晴朗 · 深圳南山</span>
            <span className="px-1.5 py-0.5 rounded bg-[#34D399]/15 text-[#34D399] text-[10px] font-mono border border-[#34D399]/25">
              空气优
            </span>
          </div>
        </div>
      </section>

      {/* Row 1: Three High-Density Metric & Timeline Cards (Image 2 Frosted Acrylic) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 relative z-10">
        {/* Metric Card 1: 今日任务 (Overview Progress) */}
        <div 
          onClick={() => onOpenAllTasksModal?.()}
          className="acrylic-card rounded-2xl p-5 flex flex-col justify-between h-40 group cursor-pointer hover:border-white/[0.22] hover:bg-white/[0.08] transition-all specular-chamfer"
          title="点击查看全部任务详情"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#c7c9dc] tracking-wide group-hover:text-white transition-colors">今日任务</span>
            <div className="w-7 h-7 rounded-lg bg-[#c0c1ff]/15 border border-[#c0c1ff]/30 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-4 h-4 text-[#c0c1ff]" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="font-mono text-3xl font-bold text-white tracking-tight drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)]">
                {completedCount}
              </span>
              <span className="font-mono text-sm text-[#8c8ea3]">/ {totalCount}</span>
            </div>

            {/* Glowing progress bar */}
            <div className="w-full h-2 rounded-full bg-black/40 border border-white/10 overflow-hidden relative mb-2 p-[1px]">
              <div 
                className="h-full rounded-full glow-progress transition-all duration-500" 
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#8c8ea3] font-mono">
            <span>完成度 {completionPercentage}%</span>
            <span className="text-[#c0c1ff] font-semibold group-hover:underline">查看全部 {totalCount} 项 →</span>
          </div>
        </div>

        {/* Metric Card 2: 待办任务 (Pending Breakdown) */}
        <div className="acrylic-card rounded-2xl p-5 flex flex-col justify-between h-40 group cursor-default specular-chamfer">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#c7c9dc] tracking-wide">待办任务</span>
            <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center">
              <Clock className="w-4 h-4 text-[#c7c9dc]" />
            </div>
          </div>

          <div className="my-auto">
            <div className="flex items-baseline gap-2 mb-3">
              <span className="font-mono text-3xl font-bold text-white tracking-tight drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)]">
                {pendingCount}
              </span>
              <span className="text-xs text-[#8c8ea3]">待处理事项</span>
            </div>

            {/* Status tags with quick filter trigger */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterPriority(filterPriority === 'high' ? null : 'high')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-all ${
                  filterPriority === 'high'
                    ? 'bg-[#F87171]/30 border-[#F87171] text-[#F87171] shadow-[0_0_12px_rgba(248,113,113,0.3)]'
                    : 'bg-[#F87171]/15 border-[#F87171]/25 text-[#F87171] hover:bg-[#F87171]/25'
                }`}
                title="点击过滤高优先级"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#F87171] animate-pulse"></span>
                <span>{highPriorityPending} 高优先级</span>
              </button>

              <button
                onClick={() => setFilterPriority(null)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-all ${
                  filterPriority === null
                    ? 'bg-white/20 border-white/30 text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]'
                    : 'bg-white/5 border-white/10 text-[#c7c9dc] hover:bg-white/10'
                }`}
                title="显示全部"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#8c8ea3]"></span>
                <span>{normalPriorityPending} 普通</span>
              </button>
            </div>
          </div>
        </div>

        {/* Metric Card 3: 今日计划 (Agenda Schedule) */}
        <div className="acrylic-card rounded-2xl p-5 flex flex-col justify-between h-40 group cursor-default specular-chamfer">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#c7c9dc] tracking-wide">今日计划</span>
              <div className="w-7 h-7 rounded-lg bg-[#7bd0ff]/15 border border-[#7bd0ff]/30 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-[#7bd0ff]" />
              </div>
            </div>

            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-[#7bd0ff] font-semibold">{meeting.time}</span>
              <span className="px-1.5 py-0.5 rounded bg-[#7bd0ff]/20 text-[#7bd0ff] text-[10px] font-mono border border-[#7bd0ff]/35">
                {meeting.platform}
              </span>
            </div>

            <h3 className="text-sm md:text-base font-semibold text-white tracking-tight truncate">
              {meeting.title}
            </h3>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/[0.08]">
            <div className="flex -space-x-1.5">
              {meeting.participants.map((p, i) => (
                <div 
                  key={i} 
                  className={`w-6 h-6 rounded-full ${p.avatarBg} border border-white/30 flex items-center justify-center text-[10px] text-white font-medium shadow-sm`}
                  title={p.name}
                >
                  {p.name}
                </div>
              ))}
              <div className="w-6 h-6 rounded-full bg-purple-600/70 border border-white/30 flex items-center justify-center text-[10px] text-white font-mono shadow-sm">
                +4
              </div>
            </div>

            <button
              onClick={onOpenMeetingModal}
              className="acrylic-pill px-3 py-1 rounded-lg text-white text-[11px] font-sans hover:bg-white/20 transition-all flex items-center gap-1 active:scale-95 shadow-sm"
            >
              <span>进入会议</span>
              <ExternalLink className="w-3 h-3 text-[#c7c9dc]" />
            </button>
          </div>
        </div>
      </section>

      {/* Row 2: Three In-Depth Operational Workflows (Image 2 Frosted Acrylic) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 relative z-10">
        {/* Workflow 1: 今日重点任务 (Interactive Checklist) */}
        <div className="acrylic-card rounded-2xl p-5 flex flex-col justify-between specular-chamfer">
          <div>
            <div className="flex items-center justify-between pb-3.5 mb-2 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#F97316] fill-[#F97316]" />
                <h3 className="text-sm font-semibold text-white tracking-wide">今日重点任务</h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-[#c0c1ff]">
                  {completedCount}/{totalCount}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button 
                  type="button"
                  onClick={() => {
                    setFilterPriority(null);
                    onOpenAllTasksModal?.();
                  }}
                  className="text-[11px] font-mono text-[#c0c1ff] hover:text-white transition-colors flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] cursor-pointer"
                  title="打开全部任务管理面板"
                >
                  <span>查看全部 ({totalCount})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsCardExpanded(prev => !prev)}
                  className="text-[11px] font-mono text-[#8c8ea3] hover:text-white transition-colors px-1.5 py-0.5 rounded hover:bg-white/5 cursor-pointer"
                  title={isCardExpanded ? '收起为前4项' : '卡片内展开所有任务'}
                >
                  {isCardExpanded ? '收起' : '展开'}
                </button>
              </div>
            </div>

            {/* Task Items List */}
            <div className={`space-y-2.5 ${isCardExpanded ? 'max-h-72 overflow-y-auto pr-1' : ''}`}>
              {(isCardExpanded ? displayTasks : displayTasks.slice(0, 4)).map((task) => (
                <div
                  key={task.id}
                  onClick={() => onToggleTask(task.id)}
                  className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                    task.completed 
                      ? 'bg-white/[0.02] border-white/[0.04] opacity-55'
                      : 'bg-white/[0.04] border-white/[0.10] hover:border-white/[0.22] hover:bg-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.2)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      aria-label={`标记任务 ${task.title} 为${task.completed ? '未完成' : '已完成'}`}
                      className="shrink-0 transition-transform active:scale-90"
                    >
                      {task.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
                      ) : (
                        <Circle className="w-4 h-4 text-[#8c8ea3] group-hover:text-[#c0c1ff] transition-colors" />
                      )}
                    </button>
                    <span 
                      className={`text-xs md:text-[13px] truncate transition-colors ${
                        task.completed 
                          ? 'line-through text-[#656375]' 
                          : 'text-[#f1f2f8] group-hover:text-white font-normal'
                      }`}
                    >
                      {task.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {getPriorityBadge(task.priority)}
                    <span className="font-mono text-[11px] text-[#8c8ea3]">
                      {task.dueTime}
                    </span>
                  </div>
                </div>
              ))}

              {/* Inline task creator */}
              {isAddingInline && (
                <form onSubmit={handleCreateTask} className="p-2.5 rounded-xl acrylic-input border border-[#8083ff]/40 animate-in fade-in duration-150">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="输入新任务标题，按回车添加..."
                    className="w-full bg-transparent border-none outline-none text-xs text-white placeholder:text-[#8c8ea3] mb-2 font-sans"
                    autoFocus
                  />
                  <div className="flex items-center justify-end gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setIsAddingInline(false)}
                      className="px-2 py-0.5 text-[#8c8ea3] hover:text-white text-[11px]"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white text-[11px] font-semibold shadow-md shadow-[#6366F1]/30"
                    >
                      确定
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Quick Task Input Hint & All Tasks Link */}
          <div className="pt-3 mt-3 border-t border-white/[0.08] flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => onOpenAllTasksModal?.()}
              className="flex items-center gap-1.5 text-[11px] text-[#c0c1ff] hover:text-white transition-colors cursor-pointer font-medium"
              title="打开全部任务中心"
            >
              <ListTodo className="w-3.5 h-3.5" />
              <span>查看全部 {totalCount} 项清单 →</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddingInline(true)}
              className="font-mono text-[#c0c1ff] hover:underline cursor-pointer text-xs flex items-center gap-1 font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>添加新项</span>
            </button>
          </div>
        </div>

        {/* Workflow 2: AI 智能助手建议 (Image 2 Frosted Acrylic) */}
        <div className="acrylic-card rounded-2xl p-5 flex flex-col justify-between overflow-hidden specular-chamfer relative">
          {/* Internal ambient illumination orb inside the acrylic */}
          <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-500/20 blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between pb-3.5 mb-2 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#6366F1] to-[#A855F7] flex items-center justify-center shadow-md shadow-purple-500/30 border border-white/20">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-white tracking-wide">AI 助手建议</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#8B5CF6]/25 border border-[#8B5CF6]/40 text-[#c4abff] text-[10px] font-mono shadow-sm">
                GPT-4o 增强
              </span>
            </div>

            <p className="text-xs text-[#8c8ea3] mb-3.5 font-sans">
              基于你本周的工作内容，已为你自动化准备了 3 条高效建议：
            </p>

            {/* AI Suggestion Action Cards */}
            <div className="space-y-2.5">
              {suggestions.map((sug) => (
                <div
                  key={sug.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.10] hover:border-[#8083ff]/50 hover:bg-white/[0.08] transition-all group shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span className="text-[#c0c1ff] text-[10px]">◇</span>
                    <span className="text-xs md:text-[13px] text-[#f1f2f8] truncate group-hover:text-white font-normal">
                      {sug.title}
                    </span>
                  </div>
                  <button
                    onClick={() => onExecuteSuggestion(sug)}
                    className="px-2.5 py-1 rounded-lg bg-[#c0c1ff]/15 border border-[#c0c1ff]/30 text-[#c0c1ff] text-[11px] font-sans hover:bg-[#c0c1ff] hover:text-[#0b0730] transition-all shrink-0 active:scale-95 shadow-sm font-semibold"
                  >
                    去执行
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Trailing Link */}
          <div className="pt-3 mt-3 border-t border-white/[0.08] flex items-center justify-between">
            <button
              onClick={onNavigateToAI}
              className="text-xs text-[#c0c1ff] hover:text-white transition-colors flex items-center gap-1 font-semibold"
            >
              <span>查看全部建议与上下文流</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <Bot className="w-4 h-4 text-[#8c8ea3]" />
          </div>
        </div>

        {/* Workflow 3: 知识动态 (Image 2 Frosted Acrylic) */}
        <div className="acrylic-card rounded-2xl p-5 flex flex-col justify-between specular-chamfer">
          <div>
            <div className="flex items-center justify-between pb-3.5 mb-2 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#38BDF8]" />
                <h3 className="text-sm font-semibold text-white tracking-wide">知识动态</h3>
              </div>
              <button 
                onClick={onNavigateToAI}
                className="text-[11px] font-mono text-[#8c8ea3] hover:text-[#c0c1ff] transition-colors flex items-center gap-0.5"
              >
                <span>最近更新</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Feed Items */}
            <div className="space-y-3">
              {knowledge.map((item, idx) => {
                const colorConfig = idx === 0 
                  ? 'bg-[#8B5CF6]/15 border-[#8B5CF6]/30 text-[#c4abff]' 
                  : idx === 1 
                  ? 'bg-[#38BDF8]/15 border-[#38BDF8]/30 text-[#7bd0ff]'
                  : 'bg-[#34D399]/15 border-[#34D399]/30 text-[#34D399]';

                return (
                  <div
                    key={item.id}
                    onClick={() => onOpenKnowledgeDetail(item)}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.06] transition-colors cursor-pointer group"
                  >
                    <div className={`w-8 h-8 rounded-xl ${colorConfig} border flex items-center justify-center shrink-0`}>
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-[13px] font-medium text-[#e1e2eb] group-hover:text-[#c0c1ff] transition-colors truncate">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-[#908fa0] flex items-center gap-1.5 mt-0.5 font-mono">
                        <span>{item.timeAgo}</span>
                        <span className="w-1 h-1 rounded-full bg-[#908fa0]"></span>
                        <span>{item.category}</span>
                      </p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-[#908fa0] group-hover:text-white transition-colors shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sync indicator */}
          <div className="pt-3 mt-3 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-[#908fa0] font-mono">
            <span>同步索引：1,248 篇文档</span>
            <span className="text-[#34D399] flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse"></span>
              实时更新中
            </span>
          </div>
        </div>
      </section>

      {/* Quick Bottom Linear Shortcut Dock (Image 2) */}
      <footer className="rounded-2xl bg-white/[0.02] border border-white/[0.08] p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[#908fa0] text-xs">
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <span className="px-2 py-0.5 rounded bg-white/10 text-white font-mono text-[11px]">
            Linear + macOS 交互范式
          </span>
          <span className="hidden sm:inline">支持快捷调出工作流与模型编排：</span>
          <span className="text-[#e1e2eb] font-mono text-[11px] bg-white/5 px-2 py-0.5 rounded border border-white/[0.08]">
            ⌘ + J 对话助理
          </span>
          <span className="hidden md:inline text-[#e1e2eb] font-mono text-[11px] bg-white/5 px-2 py-0.5 rounded border border-white/[0.08]">
            ⌘ + B 隐藏侧栏
          </span>
          <span className="hidden lg:inline text-[#e1e2eb] font-mono text-[11px] bg-white/5 px-2 py-0.5 rounded border border-white/[0.08]">
            ⌘ + K 全局搜索
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse"></span>
          <span className="font-mono text-[11px] text-[#e1e2eb]">模型响应延时: 18ms</span>
        </div>
      </footer>
    </div>
  );
};
