import React, { useState, useMemo } from 'react';
import { 
  X, 
  CheckCircle2, 
  Circle, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Trash2, 
  Flame, 
  CheckCheck,
  ArrowUpDown,
  Tag
} from 'lucide-react';
import { TaskItem, TaskPriority } from '../types';

interface AllTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskItem[];
  onToggleTask: (taskId: string) => void;
  onAddNewTask: (title: string, priority: TaskPriority, dueTime?: string, category?: string) => void;
  onDeleteTask?: (taskId: string) => void;
}

export const AllTasksModal: React.FC<AllTasksModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onToggleTask,
  onAddNewTask,
  onDeleteTask,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('high');
  const [newCategory, setNewCategory] = useState('产品研发');

  const categories = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach(t => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set);
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Status filter
      if (statusFilter === 'pending' && task.completed) return false;
      if (statusFilter === 'completed' && !task.completed) return false;
      // Priority filter
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesCategory = task.category?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesCategory) return false;
      }
      return true;
    });
  }, [tasks, statusFilter, priorityFilter, searchQuery]);

  const completedCount = tasks.filter(t => t.completed).length;
  const pendingCount = tasks.length - completedCount;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  if (!isOpen) return null;

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddNewTask(newTitle.trim(), newPriority, '今天 18:00', newCategory);
    setNewTitle('');
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
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200 font-sans"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-[#0F141F]/95 border border-white/[0.14] shadow-[0_25px_60px_rgba(0,0,0,0.85)] specular-chamfer overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.08] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6366F1] to-[#8B5CF6] flex items-center justify-center shadow-lg shadow-[#6366F1]/30">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">全部工作任务</h3>
                <span className="px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.10] text-[#c0c1ff] font-mono text-xs">
                  共 {tasks.length} 项
                </span>
              </div>
              <p className="text-xs text-[#908fa0] mt-0.5">
                已完成 {completedCount} 项 · 待推进 {pendingCount} 项 · 完成度 {progressPercent}%
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#908fa0] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="关闭 (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-white/[0.04] h-1.5 shrink-0">
          <div 
            className="h-full bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#34D399] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Filters & Search Control Bar */}
        <div className="p-4 border-b border-white/[0.08] bg-white/[0.02] flex flex-col sm:flex-row gap-3 shrink-0">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#908fa0]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索任务名称或分类项目..."
              className="w-full h-8.5 pl-8.5 pr-3 rounded-xl bg-white/[0.05] border border-white/[0.10] text-xs text-white placeholder:text-[#908fa0] outline-none focus:border-[#8083ff]/60"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#908fa0] hover:text-white text-xs"
              >
                ×
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-white/[0.05] border border-white/[0.08] shrink-0 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg transition-all ${
                statusFilter === 'all' 
                  ? 'bg-[#c0c1ff] text-[#0B0E14] font-semibold shadow' 
                  : 'text-[#908fa0] hover:text-white'
              }`}
            >
              全部 ({tasks.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1 rounded-lg transition-all ${
                statusFilter === 'pending' 
                  ? 'bg-[#c0c1ff] text-[#0B0E14] font-semibold shadow' 
                  : 'text-[#908fa0] hover:text-white'
              }`}
            >
              待处理 ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1 rounded-lg transition-all ${
                statusFilter === 'completed' 
                  ? 'bg-[#c0c1ff] text-[#0B0E14] font-semibold shadow' 
                  : 'text-[#908fa0] hover:text-white'
              }`}
            >
              已完成 ({completedCount})
            </button>
          </div>

          {/* Priority Select */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-8.5 px-2.5 rounded-xl bg-[#141926] border border-white/[0.10] text-xs text-[#c7c4d7] outline-none focus:border-[#8083ff]/60 font-mono"
          >
            <option value="all">所有优先级</option>
            <option value="high">高优先级</option>
            <option value="medium">中优先级</option>
            <option value="low">低优先级</option>
            <option value="normal">普通</option>
          </select>
        </div>

        {/* Task Items Scrollable List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[220px]">
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onToggleTask(task.id)}
                className={`group flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                  task.completed
                    ? 'bg-white/[0.02] border-white/[0.04] opacity-60'
                    : 'bg-white/[0.04] border-white/[0.09] hover:border-white/[0.20] hover:bg-white/[0.07] shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleTask(task.id);
                    }}
                    className="shrink-0 transition-transform active:scale-90 cursor-pointer"
                  >
                    {task.completed ? (
                      <CheckCircle2 className="w-4.5 h-4.5 text-[#34D399]" />
                    ) : (
                      <Circle className="w-4.5 h-4.5 text-[#8c8ea3] group-hover:text-[#c0c1ff] transition-colors" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <span
                      className={`text-xs md:text-sm font-normal block truncate ${
                        task.completed
                          ? 'line-through text-[#656375]'
                          : 'text-[#f1f2f8] group-hover:text-white'
                      }`}
                    >
                      {task.title}
                    </span>
                    {task.category && (
                      <span className="text-[11px] text-[#8c8ea3] flex items-center gap-1 mt-0.5 font-mono">
                        <Tag className="w-2.5 h-2.5" />
                        <span>{task.category}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 ml-3">
                  {getPriorityBadge(task.priority)}
                  <span className="font-mono text-[11px] text-[#8c8ea3]">
                    {task.dueTime}
                  </span>
                  {onDeleteTask && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTask(task.id);
                      }}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:text-[#F87171] text-[#8c8ea3] transition-opacity"
                      title="删除任务"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-[#908fa0]">
              <CheckCheck className="w-10 h-10 text-[#908fa0]/40 mb-2" />
              <p className="text-xs">暂无符合筛选条件的任务</p>
              {(searchQuery || statusFilter !== 'all' || priorityFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setPriorityFilter('all');
                  }}
                  className="mt-2 text-xs text-[#c0c1ff] hover:underline"
                >
                  清除所有筛选条件
                </button>
              )}
            </div>
          )}
        </div>

        {/* Quick Add Task Footer Form */}
        <form onSubmit={handleQuickAdd} className="p-4 border-t border-white/[0.08] bg-white/[0.02] flex items-center gap-2 shrink-0">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="输入新任务标题，按回车立即添加..."
            className="flex-1 h-9 px-3 rounded-xl bg-white/[0.05] border border-white/[0.10] text-xs text-white placeholder:text-[#908fa0] outline-none focus:border-[#8083ff]/60"
          />
          <select
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
            className="h-9 px-2 rounded-xl bg-[#141926] border border-white/[0.10] text-xs text-[#c7c4d7] outline-none font-mono"
          >
            <option value="high">高优先级</option>
            <option value="medium">中优先级</option>
            <option value="low">低优先级</option>
            <option value="normal">普通</option>
          </select>
          <button
            type="submit"
            className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:brightness-110 text-white font-semibold text-xs transition-all shadow-md active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>添加</span>
          </button>
        </form>
      </div>
    </div>
  );
};
