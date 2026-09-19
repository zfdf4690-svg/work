import React from 'react';
import { Cloud, Minus, Square, X, Laptop, Tablet, Smartphone, Maximize2 } from 'lucide-react';
import { ViewportMode } from '../types';

interface MacWindowHeaderProps {
  viewportMode: ViewportMode;
  onViewportChange: (mode: ViewportMode) => void;
  feishuSynced: boolean;
  onToggleFeishu: () => void;
  latencyMs?: number;
  onMinimize?: () => void;
  onClose?: () => void;
  onMaximize?: () => void;
  isMinimized?: boolean;
}

export const MacWindowHeader: React.FC<MacWindowHeaderProps> = ({
  viewportMode,
  onViewportChange,
  feishuSynced,
  onToggleFeishu,
  latencyMs = 18,
  onMinimize,
  onClose,
  onMaximize,
  isMinimized = false,
}) => {
  return (
    <header className="h-9 w-full flex items-center justify-between px-3 md:px-4 z-50 bg-[#11151F]/90 backdrop-blur-xl border-b border-white/[0.08] shrink-0 select-none font-sans">
      {/* Left traffic lights and client title */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5 mr-1">
          <button 
            onClick={onClose}
            aria-label="关闭窗口至后台守护"
            className="w-3 h-3 rounded-full bg-[#ff5f57] border border-[#e0443e] hover:opacity-80 transition-opacity cursor-pointer group relative" 
            title="关闭窗口 (转入后台运行，保留桌面边缘悬浮球)"
          />
          <button 
            onClick={onMinimize}
            aria-label="最小化窗口至后台"
            className="w-3 h-3 rounded-full bg-[#febc2e] border border-[#d89e24] hover:opacity-80 transition-opacity cursor-pointer group relative" 
            title="最小化窗口 (转入后台运行，桌面边缘悬浮球持续吸附)"
          />
          <button 
            onClick={onMaximize || (() => onViewportChange(viewportMode === 'responsive' ? 'desktop' : 'responsive'))}
            aria-label="最大化/自适应切换"
            className="w-3 h-3 rounded-full bg-[#28c840] border border-[#1aab29] hover:opacity-80 transition-opacity cursor-pointer group relative" 
            title="切换窗口最大化 / 宽屏"
          />
        </div>

        <div className="flex items-center gap-2 pl-2 border-l border-white/[0.08]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34D399] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34D399]"></span>
          </span>
          <span className="text-[11px] font-medium text-[#c7c4d7] tracking-wide hidden sm:inline">
            AI Work Assistant Client · 生产力就绪 (常驻守护进程在线)
          </span>
        </div>
      </div>

      {/* Center: Interactive Responsive Viewport Switcher Simulator */}
      <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.08] px-1.5 py-0.5 rounded-lg">
        <span className="text-[10px] text-[#908fa0] mr-1 hidden lg:inline font-mono">响应式模拟:</span>
        <button
          onClick={() => onViewportChange('responsive')}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors ${
            viewportMode === 'responsive' 
              ? 'bg-[#c0c1ff]/20 text-[#c0c1ff] border border-[#c0c1ff]/40 font-medium' 
              : 'text-[#908fa0] hover:text-[#e1e2eb]'
          }`}
          title="自适应全宽流式"
        >
          <Maximize2 className="w-3 h-3" />
          <span className="hidden sm:inline">流式</span>
        </button>
        <button
          onClick={() => onViewportChange('desktop')}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors ${
            viewportMode === 'desktop' 
              ? 'bg-[#c0c1ff]/20 text-[#c0c1ff] border border-[#c0c1ff]/40 font-medium' 
              : 'text-[#908fa0] hover:text-[#e1e2eb]'
          }`}
          title="桌面宽屏 (≥1280px)"
        >
          <Laptop className="w-3 h-3" />
          <span className="hidden sm:inline">宽屏</span>
        </button>
        <button
          onClick={() => onViewportChange('tablet')}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors ${
            viewportMode === 'tablet' 
              ? 'bg-[#c0c1ff]/20 text-[#c0c1ff] border border-[#c0c1ff]/40 font-medium' 
              : 'text-[#908fa0] hover:text-[#e1e2eb]'
          }`}
          title="平板模式 (820px)"
        >
          <Tablet className="w-3 h-3" />
          <span className="hidden sm:inline">平板</span>
        </button>
        <button
          onClick={() => onViewportChange('mobile')}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors ${
            viewportMode === 'mobile' 
              ? 'bg-[#c0c1ff]/20 text-[#c0c1ff] border border-[#c0c1ff]/40 font-medium' 
              : 'text-[#908fa0] hover:text-[#e1e2eb]'
          }`}
          title="移动端 (390px)"
        >
          <Smartphone className="w-3 h-3" />
          <span className="hidden sm:inline">手机</span>
        </button>
      </div>

      {/* Right: Feishu sync and OS controls */}
      <div className="flex items-center gap-3">
        <button 
          onClick={onToggleFeishu}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[#c7c4d7] text-[11px] transition-colors"
          title="点击切换同步状态"
        >
          <Cloud className={`w-3 h-3 ${feishuSynced ? 'text-[#c0c1ff]' : 'text-[#908fa0]'}`} />
          <span className="hidden md:inline">
            {feishuSynced ? '企业知识库实时连通' : '企业连接已断开'}
          </span>
        </button>

        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-[#908fa0] font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]"></span>
          <span>{latencyMs}ms</span>
        </div>

        <div className="flex items-center text-[#908fa0] gap-2 text-[12px] pl-2 border-l border-white/[0.08]">
          <button 
            onClick={onMinimize} 
            title="最小化至后台守护 (桌面悬浮球保持常驻)"
            className="p-1 hover:text-white transition-colors cursor-pointer rounded"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={onMaximize || (() => onViewportChange(viewportMode === 'responsive' ? 'desktop' : 'responsive'))} 
            title="最大化 / 视口缩放"
            className="p-1 hover:text-white transition-colors cursor-pointer rounded"
          >
            <Square className="w-3 h-3" />
          </button>
          <button 
            onClick={onClose} 
            title="关闭窗口至后台 (保留桌面悬浮球)"
            className="p-1 hover:text-[#ff5f57] transition-colors cursor-pointer rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
