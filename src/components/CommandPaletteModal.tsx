import React, { useState, useEffect } from 'react';
import { Search, CheckCircle2, BookOpen, Bot, Sparkles, X, ArrowRight, CornerDownLeft } from 'lucide-react';
import { TaskItem, KnowledgeItem } from '../types';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskItem[];
  knowledge: KnowledgeItem[];
  onSelectTask: (task: TaskItem) => void;
  onExecutePrompt: (prompt: string) => void;
  onOpenSpec: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  tasks,
  knowledge,
  onSelectTask,
  onExecutePrompt,
  onOpenSpec,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        // Toggle palette
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredTasks = tasks.filter(t => t.title.toLowerCase().includes(query.toLowerCase()));
  const filteredKnowledge = knowledge.filter(k => k.title.toLowerCase().includes(query.toLowerCase()));

  const quickActions = [
    { label: '整理下午会议预读提纲 (AI Agent)', icon: Bot, action: () => onExecutePrompt('整理下午会议预读提纲') },
    { label: '查看交互逻辑详细说明与响应式适配方案', icon: Sparkles, action: onOpenSpec },
    { label: '新建快速工作便签 / 日记', icon: BookOpen, action: () => onExecutePrompt('新建今日工作便签') },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200 font-sans">
      <div 
        className="w-full max-w-xl rounded-2xl bg-[#161B26]/95 border border-white/[0.12] shadow-2xl overflow-hidden specular-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Box */}
        <div className="flex items-center px-4 py-3 border-b border-white/[0.08] gap-3">
          <Search className="w-5 h-5 text-[#c0c1ff] shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="键入关键字搜索任务、知识库、文档或直接向 AI 发出指令..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-[#908fa0] font-sans"
            autoFocus
          />
          <button 
            aria-label="关闭搜索"
            onClick={onClose} 
            className="text-[#908fa0] hover:text-white p-1 rounded-lg hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-3">
          {/* Quick AI actions */}
          <div>
            <div className="text-[11px] font-mono text-[#908fa0] uppercase tracking-wider px-2.5 py-1">
              快捷指令与 AI 动作
            </div>
            <div className="space-y-1">
              {quickActions.map((qa, i) => {
                const Icon = qa.icon;
                return (
                  <button
                    key={i}
                    onClick={() => {
                      qa.action();
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-white/5 text-[#c7c4d7] hover:text-white transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-[#c0c1ff]/15 border border-[#c0c1ff]/30 flex items-center justify-center text-[#c0c1ff]">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs truncate">{qa.label}</span>
                    </div>
                    <CornerDownLeft className="w-3.5 h-3.5 text-[#908fa0] group-hover:text-[#c0c1ff] transition-colors shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Matched Tasks */}
          {filteredTasks.length > 0 && (
            <div>
              <div className="text-[11px] font-mono text-[#908fa0] uppercase tracking-wider px-2.5 py-1">
                待办任务 ({filteredTasks.length})
              </div>
              <div className="space-y-1">
                {filteredTasks.slice(0, 4).map((task) => (
                  <button
                    key={task.id}
                    onClick={() => {
                      onSelectTask(task);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-white/5 text-[#c7c4d7] hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CheckCircle2 className={`w-4 h-4 ${task.completed ? 'text-[#34D399]' : 'text-[#908fa0]'}`} />
                      <span className={`text-xs truncate ${task.completed ? 'line-through text-[#908fa0]' : ''}`}>
                        {task.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#908fa0] font-mono shrink-0">{task.dueTime}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Matched Knowledge */}
          {filteredKnowledge.length > 0 && (
            <div>
              <div className="text-[11px] font-mono text-[#908fa0] uppercase tracking-wider px-2.5 py-1">
                企业知识库 ({filteredKnowledge.length})
              </div>
              <div className="space-y-1">
                {filteredKnowledge.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 text-[#c7c4d7] hover:text-white transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <BookOpen className="w-4 h-4 text-[#7bd0ff]" />
                      <span className="text-xs truncate">{item.title}</span>
                    </div>
                    <span className="text-[10px] text-[#908fa0] font-mono shrink-0">{item.category}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2 border-t border-white/[0.08] bg-white/[0.02] flex items-center justify-between text-[11px] text-[#908fa0] font-mono">
          <span>提示：上下箭头导航，回车确定</span>
          <span className="text-[#c0c1ff]">ESC 退出</span>
        </div>
      </div>
    </div>
  );
};
