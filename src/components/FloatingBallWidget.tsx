import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Sparkles, 
  X, 
  ArrowUp, 
  Circle, 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Minimize2, 
  Move,
  ShieldCheck,
  CheckCircle2,
  Bot,
  Send,
  ExternalLink,
  ListTodo,
  Check
} from 'lucide-react';
import { TaskItem } from '../types';

interface FloatingBallWidgetProps {
  tasks: TaskItem[];
  onToggleTask: (taskId: string) => void;
  onQuickCreateTask: (title: string) => void;
  onOpenFullAI: () => void;
  isWindowMinimized?: boolean;
  onRestoreWindow?: () => void;
  onMinimizeWindow?: () => void;
  onOpenAllTasksModal?: () => void;
}

interface MiniChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  time: string;
}

export const FloatingBallWidget: React.FC<FloatingBallWidgetProps> = ({
  tasks,
  onToggleTask,
  onQuickCreateTask,
  onOpenFullAI,
  isWindowMinimized = false,
  onRestoreWindow,
  onMinimizeWindow,
  onOpenAllTasksModal,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState('');
  
  // Edge docking state: default right side
  const [side, setSide] = useState<'left' | 'right'>('right');
  const [yPos, setYPos] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return Math.min(Math.max(120, window.innerHeight * 0.6), window.innerHeight - 120);
    }
    return 420;
  });

  // Dragging interaction state
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Assistant Mini Chat History
  const [chatHistory, setChatHistory] = useState<MiniChatMessage[]>([
    {
      id: 'm-1',
      sender: 'ai',
      text: '您好！我是桌面随身助理。已为您监控今日待办与日程，可随时吩咐我创建任务或提炼要事。',
      time: '09:00',
    },
  ]);

  // Keep Y coordinate within window bounds on resize
  useEffect(() => {
    const handleResize = () => {
      setYPos((prev) => Math.min(Math.max(60, prev), window.innerHeight - 80));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const pendingTasks = tasks.filter(t => !t.completed);
  const displayTasks = pendingTasks.slice(0, 3);

  // Robust drag and click gesture handler
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only primary mouse button or touch
    if (e.button !== 0) return;

    const startX = e.clientX;
    const startY = e.clientY;
    let hasMoved = false;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      const distance = Math.hypot(dx, dy);

      if (!hasMoved && distance > 5) {
        hasMoved = true;
        setIsDragging(true);
        setIsOpen(false); // Close panel when dragging starts
      }

      if (hasMoved) {
        setDragPos({
          x: Math.max(30, Math.min(window.innerWidth - 30, moveEvent.clientX)),
          y: Math.max(50, Math.min(window.innerHeight - 50, moveEvent.clientY)),
        });
      }
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      if (hasMoved) {
        // Snapping to nearest edge
        const screenMidX = window.innerWidth / 2;
        const newSide = upEvent.clientX < screenMidX ? 'left' : 'right';
        const newY = Math.max(60, Math.min(window.innerHeight - 80, upEvent.clientY));

        setSide(newSide);
        setYPos(newY);
        setIsDragging(false);
        setDragPos(null);
      } else {
        // Was a simple click: toggle assistant dialog panel!
        setIsDragging(false);
        setDragPos(null);
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  const handleSendPrompt = (promptText: string) => {
    if (!promptText.trim()) return;
    const userMsg: MiniChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: promptText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    let replyText = '';
    if (promptText.includes('创建') || promptText.includes('待办') || promptText.includes('任务')) {
      const cleanTitle = promptText.replace(/帮我创建(一个)?(关于)?|创建(一个)?|添加任务/g, '').trim() || promptText;
      onQuickCreateTask(cleanTitle);
      replyText = `已为您在后台创建新任务「${cleanTitle}」，并同步至全部任务清单中。`;
    } else if (promptText.includes('重点') || promptText.includes('今天') || promptText.includes('待办')) {
      const topTask = tasks.find(t => !t.completed && t.priority === 'high');
      replyText = topTask 
        ? `今日最高优先级待办为「${topTask.title}」（${topTask.dueTime}截止），建议优先处理。`
        : `当前有 ${pendingTasks.length} 项进行中待办，核心事项进展顺利。`;
    } else if (promptText.includes('飞书')) {
      replyText = '飞书多维表格云端连接正常，所有本地变更已处于实时双向同步状态。';
    } else {
      replyText = `已解析指令「${promptText}」，已将上下文同步至全局 AI 决策引擎，可随时展开主窗口查看详情。`;
    }

    const aiMsg: MiniChatMessage = {
      id: `a-${Date.now()}`,
      sender: 'ai',
      text: replyText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatHistory(prev => [...prev, userMsg, aiMsg]);
    setInputVal('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendPrompt(inputVal);
  };

  // Determine current position style
  const getContainerStyle = (): React.CSSProperties => {
    if (isDragging && dragPos) {
      return {
        position: 'fixed',
        left: `${dragPos.x}px`,
        top: `${dragPos.y}px`,
        transform: 'translate(-50%, -50%)',
        zIndex: 99999,
        transition: 'none',
      };
    }

    return {
      position: 'fixed',
      top: `${yPos}px`,
      ...(side === 'left' ? { left: '0px' } : { right: '0px' }),
      zIndex: 9999,
      transition: 'top 0.35s cubic-bezier(0.16, 1, 0.3, 1), left 0.35s cubic-bezier(0.16, 1, 0.3, 1), right 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
    };
  };

  // Dynamic dialog top position clamped within window
  const dialogClampedTop = useMemo(() => {
    const dialogHeight = 460;
    const targetTop = yPos - dialogHeight / 2;
    const clamped = Math.max(16, Math.min(window.innerHeight - dialogHeight - 16, targetTop));
    return clamped - yPos;
  }, [yPos]);

  return (
    <aside
      aria-label="桌面边缘常驻悬浮球"
      style={getContainerStyle()}
      className="select-none font-sans pointer-events-auto"
    >
      {/* Expanded Quick Assistant Dialog Panel (辅助对话窗口) */}
      {isOpen && !isDragging && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ top: `${dialogClampedTop}px` }}
          className={`absolute w-[340px] sm:w-[380px] max-h-[500px] flex flex-col rounded-2xl bg-[#0E121B]/95 backdrop-blur-3xl border border-white/[0.16] shadow-[0_25px_60px_rgba(0,0,0,0.85)] p-4 space-y-3.5 z-50 specular-chamfer animate-in fade-in zoom-in-95 duration-200 ${
            side === 'right' ? 'right-full mr-3.5' : 'left-full ml-3.5'
          }`}
        >
          {/* Header & Background Daemon Indicator */}
          <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08] shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#6366F1] to-[#8B5CF6] flex items-center justify-center shadow-sm">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-white tracking-wide">
                    {isWindowMinimized ? '后台守护随身助理' : 'AI 随身辅助对话'}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/[0.06] text-[#c0c1ff]">
                    吸附{side === 'left' ? '左侧' : '右侧'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSide(side === 'left' ? 'right' : 'left')}
                className="text-[10px] font-mono text-[#908fa0] hover:text-white px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                title="切换磁吸至另一侧边缘"
              >
                吸附{side === 'left' ? '右侧' : '左侧'}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[#908fa0] hover:text-white p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
                title="关闭辅助窗口"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Window State Bridge Controls */}
          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between shrink-0">
            <div className="text-xs text-[#c7c4d7]">
              {isWindowMinimized ? (
                <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>主窗口已最小化驻留</span>
                </div>
              ) : (
                <span className="text-[11px] text-[#908fa0]">主工作台前台就绪</span>
              )}
            </div>

            {isWindowMinimized ? (
              <button
                type="button"
                onClick={() => {
                  onRestoreWindow?.();
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#c0c1ff] hover:bg-white text-[#0E121B] font-semibold text-[11px] transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Maximize2 className="w-3 h-3" />
                <span>恢复主窗口</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onMinimizeWindow?.();
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-[#c7c4d7] text-[11px] transition-colors cursor-pointer"
                title="最小化窗口，悬浮球继续常驻桌面边缘"
              >
                <Minimize2 className="w-3 h-3" />
                <span>收起至后台</span>
              </button>
            )}
          </div>

          {/* Mini Chat Stream / Recent Assistant Insights */}
          <div className="flex-1 overflow-y-auto max-h-[140px] space-y-2 pr-1 text-xs">
            {chatHistory.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`p-2 rounded-xl leading-relaxed max-w-[90%] text-[11px] ${
                    msg.sender === 'user'
                      ? 'bg-[#c0c1ff] text-[#0B0E14] font-medium'
                      : 'bg-white/[0.05] border border-white/[0.08] text-[#c7c4d7]'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[9px] font-mono text-[#908fa0]/60 mt-0.5 px-1">
                  {msg.time}
                </span>
              </div>
            ))}
          </div>

          {/* Quick Prompt Recommendation Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] shrink-0 no-scrollbar">
            <button
              type="button"
              onClick={() => handleSendPrompt('提炼今日重点待办')}
              className="px-2 py-0.5 rounded-full bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.08] text-[#c7c4d7] hover:text-white whitespace-nowrap cursor-pointer transition-colors"
            >
              📅 提炼今日待办
            </button>
            <button
              type="button"
              onClick={() => handleSendPrompt('帮我创建高优先级任务：准备周五复盘PPT')}
              className="px-2 py-0.5 rounded-full bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.08] text-[#c7c4d7] hover:text-white whitespace-nowrap cursor-pointer transition-colors"
            >
              ⚡ 快速建任务
            </button>
            <button
              type="button"
              onClick={() => handleSendPrompt('检查飞书多维表格同步状态')}
              className="px-2 py-0.5 rounded-full bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.08] text-[#c7c4d7] hover:text-white whitespace-nowrap cursor-pointer transition-colors"
            >
              🔄 飞书同步
            </button>
          </div>

          {/* Today's Tasks in Floating Ball with direct "查看全部" Link */}
          <div className="space-y-1.5 pt-1 border-t border-white/[0.06] shrink-0">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#908fa0]">
              <span className="flex items-center gap-1">
                <ListTodo className="w-3 h-3 text-[#c0c1ff]" />
                <span>快捷待办清单</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  onOpenAllTasksModal?.();
                  setIsOpen(false);
                }}
                className="text-[#c0c1ff] hover:underline cursor-pointer flex items-center gap-0.5"
              >
                <span>查看全部 ({tasks.length})</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {displayTasks.length > 0 ? (
                displayTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onToggleTask(t.id)}
                    className="flex items-center justify-between p-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-xs text-[#c7c4d7] hover:text-white transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Circle className="w-3.5 h-3.5 text-[#908fa0] group-hover:text-[#c0c1ff] shrink-0" />
                      <span className="truncate text-[11px]">{t.title}</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#908fa0] shrink-0">{t.dueTime}</span>
                  </div>
                ))
              ) : (
                <div className="text-[11px] text-[#908fa0] text-center py-1.5 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>所有重点待办均已完成</span>
                </div>
              )}
            </div>
          </div>

          {/* Fast AI Instruction Input */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-1 border-t border-white/[0.06] shrink-0">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="吩咐随身助理 (如: 创建任务、总结会议)..."
              className="flex-1 h-8 px-2.5 rounded-xl bg-white/[0.05] text-xs border border-white/[0.12] outline-none text-white placeholder:text-[#908fa0] focus:border-[#8083ff]/60"
            />
            <button 
              type="submit"
              className="w-8 h-8 rounded-xl bg-[#c0c1ff] text-[#1000a9] flex items-center justify-center hover:bg-white transition-colors shrink-0 shadow font-bold active:scale-95 cursor-pointer"
              title="发送指令"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Bottom Dock Navigation & Help Tips */}
          <div className="flex items-center justify-between pt-1 border-t border-white/[0.06] text-[10px] font-mono text-[#908fa0] shrink-0">
            <span className="flex items-center gap-1">
              <Move className="w-2.5 h-2.5" />
              <span>长按悬浮球可拖拽磁吸</span>
            </span>
            <button
              type="button"
              onClick={() => {
                onOpenFullAI();
                setIsOpen(false);
              }}
              className="text-[#c0c1ff] hover:underline cursor-pointer"
            >
              展开完整AI工作台 &rarr;
            </button>
          </div>
        </div>
      )}

      {/* The Magnetic Docked Edge Orb Trigger */}
      <div
        onPointerDown={handlePointerDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`relative flex items-center cursor-grab active:cursor-grabbing group touch-none select-none ${
          side === 'right' ? 'flex-row' : 'flex-row-reverse'
        }`}
        title="AI随身悬浮球 (点击展开辅助对话窗口，长按可拖动吸附至桌面边缘)"
      >
        {/* Edge Indicator / Magnetic Flange */}
        {!isDragging && (
          <div
            className={`w-1.5 h-10 rounded-full transition-all duration-300 ${
              side === 'right' ? 'mr-0.5' : 'ml-0.5'
            } ${
              isHovered 
                ? 'bg-[#c0c1ff] shadow-[0_0_12px_#c0c1ff]' 
                : isWindowMinimized 
                  ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' 
                  : 'bg-white/20'
            }`}
          />
        )}

        {/* The Main Orb Body */}
        <div
          className={`relative flex items-center justify-center transition-all duration-300 ${
            isDragging 
              ? 'w-13 h-13 rounded-full scale-110 shadow-[0_0_35px_rgba(99,102,241,0.85)]' 
              : side === 'right'
                ? `w-12 h-12 rounded-l-2xl rounded-r-sm ${isHovered ? '-translate-x-1.5' : 'translate-x-0'}`
                : `w-12 h-12 rounded-r-2xl rounded-l-sm ${isHovered ? 'translate-x-1.5' : 'translate-x-0'}`
          } bg-gradient-to-tr from-[#6366F1] via-[#8B5CF6] to-[#38BDF8] p-[1.5px] shadow-2xl shadow-[#6366F1]/40`}
        >
          {/* Inner frosted acrylic core */}
          <div className="w-full h-full rounded-[inherit] bg-[#090C13]/85 backdrop-blur-xl flex items-center justify-center group-hover:bg-[#090C13]/50 transition-colors">
            <Sparkles className="w-5 h-5 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
          </div>

          {/* Background Running Daemon Status Pip */}
          <div className="absolute -top-1 -right-1 flex items-center justify-center">
            {isWindowMinimized ? (
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-[#090C13]"></span>
              </span>
            ) : (
              <span className="w-3.5 h-3.5 rounded-full bg-[#818CF8] border-2 border-[#090C13]"></span>
            )}
          </div>

          {/* Edge Direction Notch Icon */}
          <div className={`absolute text-white/50 text-[10px] pointer-events-none ${
            side === 'right' ? 'left-1' : 'right-1'
          }`}>
            {side === 'right' ? (
              <ChevronLeft className="w-2.5 h-2.5" />
            ) : (
              <ChevronRight className="w-2.5 h-2.5" />
            )}
          </div>
        </div>

        {/* Dragging Feedback Badge */}
        {isDragging && (
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-md bg-[#0E121B]/95 border border-white/25 text-[10px] text-[#c0c1ff] font-mono pointer-events-none shadow-xl">
            释放后自动吸附至最近边缘
          </div>
        )}
      </div>
    </aside>
  );
};
