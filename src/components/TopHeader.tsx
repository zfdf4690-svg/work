import React from 'react';
import { Search, Bell, Building2, Plus, Zap, BookOpen } from 'lucide-react';

interface TopHeaderProps {
  currentTabName: string;
  onOpenCommandPalette: () => void;
  onOpenNewTaskModal: () => void;
  onOpenSpecModal: () => void;
  unreadCount?: number;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentTabName,
  onOpenCommandPalette,
  onOpenNewTaskModal,
  onOpenSpecModal,
  unreadCount = 1,
}) => {
  return (
    <header className="sticky top-0 z-40 h-14 w-full flex items-center justify-between px-4 md:px-7 bg-[#0E121B]/60 backdrop-blur-2xl border-b border-white/[0.12] shadow-[0_4px_24px_rgba(0,0,0,0.4)] shrink-0 font-sans">
      {/* Quick Status Breadcrumb */}
      <div className="flex items-center gap-2.5">
        <h1 className="text-base md:text-lg font-bold text-white tracking-tight">
          {currentTabName}
        </h1>
        <span className="text-[#8c8ea3] text-sm">/</span>
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full acrylic-pill text-[#c0c1ff] text-[11px] font-medium">
          <Zap className="w-3 h-3 text-[#c0c1ff]" />
          <span className="hidden sm:inline">今日效率预测</span>
          <span className="font-mono">96%</span>
        </div>
        {/* Materiality Craft Indicator Badge */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.10] text-[#c7c9dc] text-[10px] font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-[#818CF8] animate-pulse"></span>
          <span>磨砂亚克力透光 · 180% 饱和度折射</span>
        </div>
      </div>

      {/* Central Search Bar (Linear / Raycast keyboard trigger) */}
      <div className="flex-1 max-w-md mx-3 md:mx-6">
        <button
          onClick={onOpenCommandPalette}
          className="w-full h-9 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] focus:border-[#8083ff]/50 text-[12px] text-[#908fa0] flex items-center justify-between transition-all duration-150 group"
          title="打开全局命令与搜索 (⌘+K)"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-4 h-4 text-[#908fa0] group-hover:text-white" />
            <span className="truncate">搜索任务、知识、文件、Agent...</span>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 font-mono text-[10px] text-[#c7c4d7]">
              ⌘ K
            </span>
          </div>
        </button>
      </div>

      {/* Trailing Header Actions */}
      <div className="flex items-center gap-2 md:gap-2.5">
        <button
          onClick={onOpenSpecModal}
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/[0.08] text-[#c7c4d7] hover:text-white text-xs font-medium transition-colors"
          title="查看产品交互逻辑与响应式适配方案"
        >
          <BookOpen className="w-3.5 h-3.5 text-[#c0c1ff]" />
          <span>交互规范与响应式说明</span>
        </button>

        <button 
          aria-label="通知中心" 
          className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/[0.08] text-[#c7c4d7] hover:text-white transition-colors"
          title="通知中心"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#F87171] ring-2 ring-[#11151F]"></span>
          )}
        </button>

        <button 
          aria-label="企业组织协同" 
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/[0.08] text-[#c7c4d7] hover:text-white transition-colors hidden sm:inline-flex"
          title="企业组织协同"
        >
          <Building2 className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenNewTaskModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white text-xs font-semibold hover:opacity-95 shadow-md shadow-[#6366F1]/30 transition-all active:scale-[0.98] shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>新建任务</span>
        </button>
      </div>
    </header>
  );
};
