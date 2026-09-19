import React, { useState } from 'react';
import { X, Plus, Calendar, Flag, Tag } from 'lucide-react';
import { TaskPriority } from '../types';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (title: string, priority: TaskPriority, dueTime: string, category: string) => void;
}

export const NewTaskModal: React.FC<NewTaskModalProps> = ({
  isOpen,
  onClose,
  onAddTask,
}) => {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('high');
  const [dueTime, setDueTime] = useState('今天 18:00');
  const [category, setCategory] = useState('产品研发');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddTask(title.trim(), priority, dueTime, category);
    setTitle('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150 font-sans">
      <div 
        className="w-full max-w-md rounded-2xl bg-[#161B26]/95 border border-white/[0.12] p-6 shadow-2xl specular-card relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-4">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#c0c1ff]" />
            <h3 className="text-sm font-semibold text-white">新建工作任务</h3>
          </div>
          <button 
            aria-label="关闭新建任务"
            onClick={onClose} 
            className="text-[#908fa0] hover:text-white p-1 rounded-lg hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
          <div>
            <label className="block text-[#908fa0] mb-1 font-medium">任务名称</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="如：梳理竞品报告交互架构..."
              className="w-full h-10 px-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white placeholder:text-[#908fa0] outline-none focus:border-[#c0c1ff]/50"
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#908fa0] mb-1 font-medium">优先级</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full h-9 px-3 rounded-xl bg-[#11151F] border border-white/[0.08] text-white outline-none focus:border-[#c0c1ff]/50 font-mono"
              >
                <option value="high">高优先级 (High)</option>
                <option value="medium">中优先级 (Medium)</option>
                <option value="low">低优先级 (Low)</option>
                <option value="normal">普通 (Normal)</option>
              </select>
            </div>

            <div>
              <label className="block text-[#908fa0] mb-1 font-medium">截止时间</label>
              <input
                type="text"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                placeholder="如：今天 20:00"
                className="w-full h-9 px-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white outline-none focus:border-[#c0c1ff]/50 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#908fa0] mb-1 font-medium">所属项目 / 类别</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="如：产品研发 / 运营"
              className="w-full h-9 px-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white outline-none focus:border-[#c0c1ff]/50"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-white/[0.08] text-[#c7c4d7] hover:text-white hover:bg-white/5 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-[#c0c1ff] hover:bg-[#c0c1ff]/90 text-[#0B0E14] font-semibold shadow-md shadow-[#c0c1ff]/20 transition-all active:scale-[0.98]"
            >
              创建并同步
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
