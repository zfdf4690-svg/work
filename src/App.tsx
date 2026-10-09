/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  TaskItem, 
  AISuggestion, 
  KnowledgeItem, 
  ContextItem, 
  ChatMessage, 
  NavTab, 
  ViewportMode, 
  ActionConfirmData,
  TaskPriority
} from './types';
import { 
  Maximize2, 
  Sparkles, 
  ShieldCheck, 
  ArrowUpRight,
  Bot,
  AlertCircle,
  X
} from 'lucide-react';
import { 
  initialTasks, 
  initialSuggestions, 
  initialKnowledge, 
  initialContexts, 
  initialChatMessages, 
  todayMeeting 
} from './mockData';

import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { DashboardView } from './components/DashboardView';
import { AIAssistantView } from './components/AIAssistantView';
import { OtherTabsView } from './components/OtherTabsView';
import { FloatingBallWidget } from './components/FloatingBallWidget';
import { CommandPaletteModal } from './components/CommandPaletteModal';
import { InteractionSpecModal } from './components/InteractionSpecModal';
import { ToolCallingModal } from './components/ToolCallingModal';
import { ActionConfirmModal } from './components/ActionConfirmModal';
import { MeetingDetailModal } from './components/MeetingDetailModal';
import { KnowledgeDetailModal } from './components/KnowledgeDetailModal';
import { NewTaskModal } from './components/NewTaskModal';
import { AllTasksModal } from './components/AllTasksModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { KnowledgeObsidianView } from './components/KnowledgeObsidianView';
import { ipcClient, domainTaskToUiTask, createTaskInputFromUi } from './api/ipcClient';
import { TaskStatus, EventType } from './domain';

export default function App() {
  // Global domain state
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    // Electron 环境不再使用 initialTasks；Web 预览（MockIpcClient）可保留示例数据
    return isElectron ? [] : initialTasks;
  });
  const [taskError, setTaskError] = useState<string | null>(null);
  const [deletingTask, setDeletingTask] = useState<TaskItem | null>(null);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>(initialSuggestions);
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>(initialKnowledge);
  const [contexts, setContexts] = useState<ContextItem[]>(initialContexts);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialChatMessages);

  // 统一从后端拉取任务列表
  const loadTasks = async () => {
    try {
      const res = await ipcClient.task.list();
      if (res.success) {
        setTasks(res.data.map(domainTaskToUiTask));
        setTaskError(null);
      } else {
        // Electron 环境下 task.list() 失败时必须显示错误提示，不得静默显示空列表，也不得回退显示 initialTasks
        const msg = res.error?.message || '未知错误';
        setTaskError(`加载任务列表失败: ${msg}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTaskError(`加载任务出现异常: ${msg}`);
    }
  };

  // 挂载时拉取任务并订阅领域事件广播
  useEffect(() => {
    loadTasks();

    const eventTypes: EventType[] = [
      'task:created',
      'task:updated',
      'task:completed',
      'task:deleted',
    ];

    const unsubs: Array<() => void> = [];
    eventTypes.forEach(evt => {
      try {
        const unsub = ipcClient.events.on(evt, () => {
          loadTasks();
        });
        if (unsub) unsubs.push(unsub);
      } catch (e) {
        console.warn(`[App] 监听事件 ${evt} 失败`, e);
      }
    });

    return () => {
      unsubs.forEach(fn => fn());
    };
  }, []);
  
  // UI & Viewport state
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [viewportMode, setViewportMode] = useState<ViewportMode>('responsive');
  const [feishuSynced, setFeishuSynced] = useState(true);

  // Modals state
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSpecModalOpen, setIsSpecModalOpen] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [activeToolSuggestion, setActiveToolSuggestion] = useState<AISuggestion | null>(null);
  const [activeConfirmData, setActiveConfirmData] = useState<ActionConfirmData | null>(null);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [activeKnowledgeDetail, setActiveKnowledgeDetail] = useState<KnowledgeItem | null>(null);
  const [isWindowMinimized, setIsWindowMinimized] = useState(false);
  const [isAllTasksModalOpen, setIsAllTasksModalOpen] = useState(false);

  // Keyboard shortcut listener (Linear + macOS velocity)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setSidebarCollapsed(prev => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsWindowMinimized(false);
        setActiveTab('ai-assistant');
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setIsWindowMinimized(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handlers
  const handleToggleTask = async (taskId: string) => {
    const currentTask = tasks.find(t => t.id === taskId);
    if (!currentTask) return;

    try {
      let res;
      if (!currentTask.completed) {
        // 未完成 -> task.complete(id)
        res = await ipcClient.task.complete(taskId);
      } else {
        // 取消完成 -> task.update({ id, status: 'IN_PROGRESS' })
        // 后端状态机规定 COMPLETED 只能流转回 IN_PROGRESS
        res = await ipcClient.task.update({ id: taskId, status: TaskStatus.IN_PROGRESS });
      }

      if (res.success) {
        const updated = domainTaskToUiTask(res.data);
        setTasks(prev => prev.map(t => (t.id === taskId ? updated : t)));
        setTaskError(null);
      } else {
        setTaskError(`更新任务状态失败: ${res.error?.message || '状态流转不合法'}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTaskError(`操作出现异常: ${msg}`);
    }
  };

  const handleAddNewTask = async (
    title: string, 
    priority: TaskPriority = 'high', 
    dueTime: string = '今天 18:00', 
    category: string = '产品研发'
  ): Promise<boolean> => {
    try {
      const input = createTaskInputFromUi({ title, priority, dueTime, category });
      const res = await ipcClient.task.create(input);
      if (res.success) {
        const newTask = domainTaskToUiTask(res.data);
        // 使用后端返回的 Task 更新界面，不自行生成 id
        setTasks(prev => {
          const exists = prev.some(t => t.id === newTask.id);
          return exists ? prev : [newTask, ...prev];
        });
        setTaskError(null);
        return true;
      } else {
        setTaskError(`创建任务失败: ${res.error?.message || '参数校验未通过'}`);
        return false;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTaskError(`创建任务出现异常: ${msg}`);
      return false;
    }
  };

  const handleRequestDeleteTask = (taskId: string) => {
    const target = tasks.find(t => t.id === taskId);
    if (target) {
      setDeletingTask(target);
    }
  };

  const handleExecuteDeleteTask = async () => {
    if (!deletingTask) return;
    const targetId = deletingTask.id;
    try {
      // 确认后才调用 task.delete(id, true)；取消时绝不调用
      const res = await ipcClient.task.delete(targetId, true);
      if (res.success) {
        setTasks(prev => prev.filter(t => t.id !== targetId));
        setDeletingTask(null);
        setTaskError(null);
      } else {
        setTaskError(`删除任务失败: ${res.error?.message || '确认未通过或任务不存在'}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTaskError(`删除出现异常: ${msg}`);
    }
  };

  const handleExecuteSuggestion = (suggestion: AISuggestion) => {
    setActiveToolSuggestion(suggestion);
  };

  const handleConfirmAction = async (data: ActionConfirmData) => {
    if (data.actionType === 'create_task') {
      const taskName = data.payload['任务名称'] || data.title;
      const ok = await handleAddNewTask(taskName, 'high', '今天 13:45', '日程待办');
      if (!ok) return; // 失败：不标记已确认，错误提示已经显示
    }
    // Mark in messages
    setChatMessages(prev => 
      prev.map(msg => {
        if (msg.actionConfirmation && msg.actionConfirmation.id === data.id) {
          return {
            ...msg,
            actionConfirmation: {
              ...msg.actionConfirmation,
              confirmed: true,
            },
          };
        }
        return msg;
      })
    );
  };

  const handleCancelAction = (actionId: string) => {
    setChatMessages(prev => 
      prev.map(msg => {
        if (msg.actionConfirmation && msg.actionConfirmation.id === actionId) {
          return {
            ...msg,
            actionConfirmation: {
              ...msg.actionConfirmation,
              cancelled: true,
            },
          };
        }
        return msg;
      })
    );
  };

  const handleSendMessage = (text: string) => {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Simulated contextual AI assistant response
    const aiMsg: ChatMessage = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: `已根据你的指令「${text}」并结合当前上下文进行规划分析。以下是自主执行的步骤清单：`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      toolSteps: [
        {
          id: `step-${Date.now()}-1`,
          toolName: 'Query Knowledge',
          label: '检索企业知识库并提取相关方法论',
          status: 'success',
          detail: '成功定位 4 篇相关规范',
        },
        {
          id: `step-${Date.now()}-2`,
          toolName: 'Context Reasoning',
          label: '对齐当前待办与会议目标',
          status: 'success',
          detail: '生成结构化分析提纲',
        },
      ],
      actionConfirmation: text.includes('任务') || text.includes('待办') ? {
        id: `act-${Date.now()}`,
        actionType: 'create_task',
        title: '创建关联任务授权确认',
        description: '系统检测到可沉淀的工作流，建议写入今日重点任务看板：',
        payload: {
          '任务事项': text,
          '截止时间': '今天 19:00',
          '授权原则': '人工确认防误触 (Section XI)',
        },
        confirmed: false,
      } : undefined,
    };

    setChatMessages(prev => [...prev, userMsg, aiMsg]);
  };

  const handleRemoveContext = (contextId: string) => {
    setContexts(prev => prev.filter(c => c.id !== contextId));
  };

  const handleAddContext = (type: ContextItem['type'], name: string) => {
    const newCtx: ContextItem = {
      id: `ctx-${Date.now()}`,
      type,
      name,
      detail: '手动注入会话 · 已向量化',
      active: true,
    };
    setContexts(prev => [...prev, newCtx]);
  };

  const handleReferenceKnowledgeInAI = (item: KnowledgeItem) => {
    handleAddContext('knowledge', item.title);
    setActiveTab('ai-assistant');
    handleSendMessage(`参考知识库文档《${item.title}》，请为我梳理其落地规范。`);
  };

  const pendingCount = tasks.filter(t => !t.completed).length;

  const tabTitleMap: Record<NavTab, string> = {
    'dashboard': '工作台',
    'ai-assistant': 'AI 助手',
    'knowledge': '知识库',
    'docs': '文稿与文件',
    'skills': '工具 / Skills',
    'settings': '设置',
  };

  // Viewport mode classes
  const getViewportContainerClasses = () => {
    switch (viewportMode) {
      case 'desktop':
        return 'max-w-[1440px] h-[96vh] my-auto mx-auto border border-white/15 rounded-3xl shadow-2xl overflow-hidden';
      case 'tablet':
        return 'max-w-[820px] h-[96vh] my-auto mx-auto border border-white/15 rounded-3xl shadow-2xl overflow-hidden';
      case 'mobile':
        return 'max-w-[390px] h-[96vh] my-auto mx-auto border border-white/15 rounded-[44px] shadow-2xl overflow-hidden';
      default:
        return 'w-screen h-screen';
    }
  };

  return (
    <div className="relative w-screen h-screen flex flex-col items-center justify-center bg-[#0B0E14] text-[#e1e2eb] overflow-hidden select-none font-sans">
      {/* Atmospheric Ambient Background Glow Layers (Lighting Engineering Aurora Field) */}
      <div className="ambient-lighting-engine">
        <div className="ambient-light-orb-1" />
        <div className="ambient-light-orb-2" />
        <div className="ambient-light-orb-3" />
      </div>

      {/* Micro-sandblasted noise texture across canvas */}
      <div className="absolute inset-0 frosted-sandblast-noise pointer-events-none z-[1] opacity-60" />

      {/* Main Window Frame Container (Smoked Acrylic Outer Shell) */}
      <div className={`relative flex flex-col bg-[#07090E]/65 backdrop-blur-3xl border border-white/[0.14] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.85)] overflow-hidden transition-all duration-500 ease-out z-10 ${
        isWindowMinimized 
          ? 'opacity-0 scale-90 translate-y-16 pointer-events-none' 
          : 'opacity-100 scale-100 translate-y-0'
      } ${getViewportContainerClasses()}`}>
        {/* Main Workspace: Left Sidebar + Main Canvas */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Internal Ambient Light Cones for Canvas Acrylic Panels */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            <div className="absolute top-[10%] left-[25%] w-[450px] height-[450px] bg-indigo-500/20 rounded-full blur-[90px] animate-pulse duration-1000" />
            <div className="absolute top-[50%] right-[10%] w-[400px] height-[400px] bg-sky-500/18 rounded-full blur-[100px]" />
            <div className="absolute bottom-[5%] left-[40%] w-[500px] height-[500px] bg-purple-500/16 rounded-full blur-[110px]" />
          </div>

          {/* Left Persistent Navigation Rail (Smoked Acrylic Dock) */}
          {viewportMode !== 'mobile' && (
            <Sidebar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              pendingCount={pendingCount}
              isCollapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
              feishuSynced={feishuSynced}
              onOpenSpec={() => setIsSpecModalOpen(true)}
            />
          )}

          {/* Main Stage */}
          <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden relative z-10">
            {/* Top Toolbar Header (仅在工作台展示) */}
            {activeTab === 'dashboard' && (
              <TopHeader
                currentTabName={tabTitleMap[activeTab]}
                onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
                onOpenNewTaskModal={() => setIsNewTaskModalOpen(true)}
                onOpenSpecModal={() => setIsSpecModalOpen(true)}
              />
            )}

            {/* Dynamic View Content Switcher */}
            <div className="flex-1 min-h-0 flex flex-col">
              {activeTab === 'dashboard' && (
                <DashboardView
                  tasks={tasks}
                  suggestions={suggestions}
                  knowledge={knowledge}
                  meeting={todayMeeting}
                  onToggleTask={handleToggleTask}
                  onAddNewTask={handleAddNewTask}
                  onExecuteSuggestion={handleExecuteSuggestion}
                  onNavigateToAI={() => setActiveTab('ai-assistant')}
                  onOpenMeetingModal={() => setIsMeetingModalOpen(true)}
                  onOpenKnowledgeDetail={(item) => setActiveKnowledgeDetail(item)}
                  onOpenAllTasksModal={() => setIsAllTasksModalOpen(true)}
                />
              )}

              {activeTab === 'ai-assistant' && (
                <AIAssistantView
                  messages={chatMessages}
                  contexts={contexts}
                  onSendMessage={handleSendMessage}
                  onConfirmAction={handleConfirmAction}
                  onCancelAction={handleCancelAction}
                  onRemoveContext={handleRemoveContext}
                  onAddContext={handleAddContext}
                  onNavigateToSkills={() => setActiveTab('skills')}
                />
              )}

              {activeTab === 'knowledge' && (
                <KnowledgeObsidianView
                  onOpenSpec={() => setIsSpecModalOpen(true)}
                  feishuSynced={feishuSynced}
                />
              )}

              {(activeTab === 'docs' || activeTab === 'skills' || activeTab === 'settings') && (
                <OtherTabsView
                  activeTab={activeTab}
                  knowledge={knowledge}
                  onOpenKnowledgeDetail={(item) => setActiveKnowledgeDetail(item)}
                  onOpenSpec={() => setIsSpecModalOpen(true)}
                  feishuSynced={feishuSynced}
                  onToggleFeishu={() => setFeishuSynced(!feishuSynced)}
                />
              )}
            </div>

            {/* Simulated Mobile Bottom Navigation Bar (Shown on Mobile view) */}
            {viewportMode === 'mobile' && (
              <nav className="h-14 bg-[#11151F]/90 backdrop-blur-xl border-t border-white/10 flex items-center justify-around px-2 shrink-0 z-30">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex flex-col items-center gap-1 text-[10px] ${
                    activeTab === 'dashboard' ? 'text-indigo-400 font-semibold' : 'text-slate-400'
                  }`}
                >
                  <span className="text-xs">🏠</span>
                  <span>工作台</span>
                </button>
                <button
                  onClick={() => setActiveTab('ai-assistant')}
                  className={`flex flex-col items-center gap-1 text-[10px] ${
                    activeTab === 'ai-assistant' ? 'text-indigo-400 font-semibold' : 'text-slate-400'
                  }`}
                >
                  <span className="text-xs">🤖</span>
                  <span>AI 助手</span>
                </button>
                <button
                  onClick={() => setActiveTab('knowledge')}
                  className={`flex flex-col items-center gap-1 text-[10px] ${
                    activeTab === 'knowledge' ? 'text-indigo-400 font-semibold' : 'text-slate-400'
                  }`}
                >
                  <span className="text-xs">📚</span>
                  <span>知识库</span>
                </button>
                <button
                  onClick={() => setIsSpecModalOpen(true)}
                  className="flex flex-col items-center gap-1 text-[10px] text-slate-400"
                >
                  <span className="text-xs">📐</span>
                  <span>规范说明</span>
                </button>
              </nav>
            )}
          </main>
        </div>
      </div>

      {/* Desktop Background Running Daemon State (When Main App is Minimized) */}
      {isWindowMinimized && (
        <div className="absolute z-20 flex flex-col items-center justify-center max-w-lg px-7 py-6 rounded-3xl frosted-acrylic-panel border border-white/[0.16] shadow-[0_24px_50px_rgba(0,0,0,0.8)] text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-mono mb-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            <span>后台守护进程在线 · 内存占用极低</span>
          </div>
          <h2 className="text-base md:text-lg font-bold text-white tracking-tight mb-1.5 flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#c0c1ff]" />
            <span>AI 助手已转入系统后台驻留</span>
          </h2>
          <p className="text-xs text-[#908fa0] leading-relaxed max-w-sm mb-5">
            主程序窗口已收起至后台，系统悬浮球已磁吸常驻在桌面边缘。您可以随时点击屏幕边缘的悬浮球勾选待办、下达快捷指令，或一键恢复完整工作台。
          </p>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsWindowMinimized(false)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#c0c1ff] hover:bg-white text-[#0B0E14] font-semibold text-xs transition-all shadow-lg active:scale-95 cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>恢复主工作台窗口 (Cmd+M)</span>
            </button>
            <button
              onClick={() => {
                setIsWindowMinimized(false);
                setActiveTab('ai-assistant');
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.10] text-[#c7c4d7] text-xs transition-colors cursor-pointer"
            >
              <span>进入全功能会话</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Desktop Persistent Edge-Docked Floating Ball Widget (Always Mounted at Desktop Level) */}
      <FloatingBallWidget
        tasks={tasks}
        onToggleTask={handleToggleTask}
        onQuickCreateTask={(title) => handleAddNewTask(title, 'high')}
        onOpenFullAI={() => {
          setIsWindowMinimized(false);
          setActiveTab('ai-assistant');
        }}
        isWindowMinimized={isWindowMinimized}
        onRestoreWindow={() => setIsWindowMinimized(false)}
        onMinimizeWindow={() => setIsWindowMinimized(true)}
        onOpenAllTasksModal={() => setIsAllTasksModalOpen(true)}
      />

      {/* Global Interactive Modals */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        tasks={tasks}
        knowledge={knowledge}
        onSelectTask={(task) => {
          handleToggleTask(task.id);
          setActiveTab('dashboard');
        }}
        onExecutePrompt={(prompt) => {
          setActiveTab('ai-assistant');
          handleSendMessage(prompt);
        }}
        onOpenSpec={() => {
          setIsCommandPaletteOpen(false);
          setIsSpecModalOpen(true);
        }}
      />

      <InteractionSpecModal
        isOpen={isSpecModalOpen}
        onClose={() => setIsSpecModalOpen(false)}
      />

      <ToolCallingModal
        suggestion={activeToolSuggestion}
        isOpen={!!activeToolSuggestion}
        onClose={() => setActiveToolSuggestion(null)}
        onConfirmTaskCreation={(title) => {
          handleAddNewTask(title, 'high');
          setActiveToolSuggestion(null);
        }}
      />

      <ActionConfirmModal
        data={activeConfirmData}
        isOpen={!!activeConfirmData}
        onClose={() => setActiveConfirmData(null)}
        onConfirm={handleConfirmAction}
      />

      <MeetingDetailModal
        meeting={todayMeeting}
        isOpen={isMeetingModalOpen}
        onClose={() => setIsMeetingModalOpen(false)}
        onGenerateBrief={() => {
          setActiveTab('ai-assistant');
          handleSendMessage('帮我提炼下午 2:00 产品方案评审的 3 分钟会前预读速览。');
        }}
      />

      <KnowledgeDetailModal
        item={activeKnowledgeDetail}
        isOpen={!!activeKnowledgeDetail}
        onClose={() => setActiveKnowledgeDetail(null)}
        onReferenceInAI={handleReferenceKnowledgeInAI}
      />

      <NewTaskModal
        isOpen={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
        onAddTask={handleAddNewTask}
      />

      <AllTasksModal
        isOpen={isAllTasksModalOpen}
        onClose={() => setIsAllTasksModalOpen(false)}
        tasks={tasks}
        onToggleTask={handleToggleTask}
        onAddNewTask={handleAddNewTask}
        onDeleteTask={handleRequestDeleteTask}
      />

      {/* Task Physical Delete Confirmation Modal */}
      {deletingTask && (
        <DeleteConfirmModal
          isOpen={!!deletingTask}
          title="删除任务确认"
          itemName={deletingTask.title}
          warningText="此操作将从数据库中物理永久删除该任务，不可撤销。"
          onClose={() => setDeletingTask(null)}
          onConfirm={handleExecuteDeleteTask}
        />
      )}

      {/* Top Error Notification Toast Banner */}
      {taskError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-lg w-[90%] bg-[#2a1215] border border-[#f87171]/40 text-[#fca5a5] px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5 text-xs md:text-sm font-medium">
            <AlertCircle className="w-4 h-4 text-[#f87171] shrink-0" />
            <span>{taskError}</span>
          </div>
          <button
            type="button"
            onClick={() => setTaskError(null)}
            className="p-1 rounded hover:bg-white/10 text-[#fca5a5] hover:text-white transition-colors cursor-pointer"
            title="关闭提示"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
