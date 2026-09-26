import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Paperclip, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Loader2, 
  Check, 
  Sparkles, 
  FileText, 
  BookOpen, 
  FolderKanban, 
  ListTodo, 
  ShieldAlert, 
  ArrowUp,
  X,
  Wrench,
  Zap,
  ExternalLink,
  Folder,
  Pin,
  Archive,
  Edit3
} from 'lucide-react';
import { 
  ChatMessage, 
  ContextItem, 
  ToolStep, 
  ActionConfirmData 
} from '../types';
import { CreateProjectModal } from './CreateProjectModal';
import { SessionManagerModal } from './SessionManagerModal';

interface AIAssistantViewProps {
  messages: ChatMessage[];
  contexts: ContextItem[];
  onSendMessage: (text: string) => void;
  onConfirmAction: (action: ActionConfirmData) => void;
  onCancelAction: (actionId: string) => void;
  onRemoveContext: (contextId: string) => void;
  onAddContext: (type: ContextItem['type'], name: string) => void;
  onNavigateToSkills?: () => void;
}

export const AIAssistantView: React.FC<AIAssistantViewProps> = ({
  messages,
  contexts,
  onSendMessage,
  onConfirmAction,
  onCancelAction,
  onRemoveContext,
  onAddContext,
  onNavigateToSkills,
}) => {
  const [inputText, setInputText] = useState('');
  const [activeSession, setActiveSession] = useState('置顶 · 产品方案讨论');
  const [newContextName, setNewContextName] = useState('');
  const [showAddContext, setShowAddContext] = useState(false);
  const [showSkillsModal, setShowSkillsModal] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [sessionModalMode, setSessionModalMode] = useState<'archive' | 'manage' | null>(null);

  const [pinnedSessions, setPinnedSessions] = useState<string[]>([
    '产品方案讨论',
    '官网极简规范梳理',
  ]);

  const [projects, setProjects] = useState<Array<{ id: string; name: string; localPath: string }>>([
    { id: 'proj-1', name: '产品方案设计', localPath: '/Users/developer/Projects/product-design' },
    { id: 'proj-2', name: 'AI 办公助手原型', localPath: '/Users/developer/Projects/ai-assistant' },
  ]);

  const [taskSessions, setTaskSessions] = useState<string[]>([
    '竞品市场研究',
    '知识库向量检索调优',
    'Linear 交互范式复盘',
  ]);

  const [archivedSessions, setArchivedSessions] = useState<string[]>([
    '2024Q3 季度复盘会话',
    '飞书对接方案讨论旧版',
  ]);

  const [newSessionCounter, setNewSessionCounter] = useState(1);
  const [sessionMessages, setSessionMessages] = useState<Record<string, ChatMessage[]>>({
    '置顶 · 产品方案讨论': messages,
    '任务 · 竞品市场研究': [
      {
        id: 'jp-1',
        role: 'user',
        content: '请梳理当前市面上 3 家头部 AI 办公助手的核心优势与交互异同。',
        timestamp: '09:30',
      },
      {
        id: 'jp-2',
        role: 'assistant',
        content: '已对竞品 A、B、C 的上下文管理、工具调度透明度以及键盘交互进行了深度对比走查。核心差异在于是「侵入式对话」还是「工作台协同流」。',
        timestamp: '09:31',
      },
    ],
    '任务 · 知识库向量检索调优': [
      {
        id: 'kb-1',
        role: 'user',
        content: '如何优化知识库切片的分块策略以提高 Agent 问答准确率？',
        timestamp: '昨天 15:20',
      },
      {
        id: 'kb-2',
        role: 'assistant',
        content: '建议采用层次化分块（Hierarchical Chunking）结合元数据过滤，在保留段落上下文完整性的同时，将检索粒度精细化至 300-500 Tokens。',
        timestamp: '昨天 15:21',
      },
    ],
  });

  useEffect(() => {
    if (activeSession === '置顶 · 产品方案讨论' && messages.length > 0) {
      setSessionMessages(prev => ({
        ...prev,
        ['置顶 · 产品方案讨论']: messages,
      }));
    }
  }, [messages, activeSession]);

  const [openMenuSession, setOpenMenuSession] = useState<string | null>(null);
  const [renamingSession, setRenamingSession] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleCreateNewSession = () => {
    const sessionTitle = `新会话 ${newSessionCounter}`;
    setNewSessionCounter(prev => prev + 1);
    setTaskSessions(prev => [sessionTitle, ...prev]);
    const fullSessionName = `任务 · ${sessionTitle}`;
    setActiveSession(fullSessionName);
    setSessionMessages(prev => ({
      ...prev,
      [fullSessionName]: [],
    }));
    showToast(`已创建新会话窗口「${sessionTitle}」`);
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuSession(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleCreateProject = (newProj: { name: string; localPath: string }) => {
    const p = { id: `proj-${Date.now()}`, ...newProj };
    setProjects(prev => [p, ...prev]);
    setActiveSession(`项目 · ${p.name}`);
    showToast(`已创建项目「${p.name}」`);
  };

  const handlePinSession = (session: string) => {
    setTaskSessions(prev => prev.filter(s => s !== session));
    if (!pinnedSessions.includes(session)) {
      setPinnedSessions(prev => [session, ...prev]);
    }
    showToast(`已将「${session}」加入置顶`);
  };

  const handleSaveRename = (oldName: string) => {
    if (!renameInput.trim() || renameInput.trim() === oldName) {
      setRenamingSession(null);
      return;
    }
    const newName = renameInput.trim();
    setTaskSessions(prev => prev.map(s => s === oldName ? newName : s));
    setPinnedSessions(prev => prev.map(s => s === oldName ? newName : s));
    
    // Migrate messages to new session key
    setSessionMessages(prev => {
      const updated = { ...prev };
      const matchingKey = Object.keys(updated).find(k => k.includes(oldName));
      if (matchingKey) {
        const newKey = matchingKey.replace(oldName, newName);
        updated[newKey] = updated[matchingKey];
        delete updated[matchingKey];
      }
      return updated;
    });

    if (activeSession.includes(oldName)) {
      setActiveSession(prev => prev.replace(oldName, newName));
    }
    setRenamingSession(null);
    showToast(`会话已更名为「${newName}」`);
  };

  const handleArchiveSession = (session: string) => {
    setTaskSessions(prev => prev.filter(s => s !== session));
    setPinnedSessions(prev => prev.filter(s => s !== session));
    setArchivedSessions(prev => [session, ...prev]);
    showToast(`已归档「${session}」会话`);
  };

  const handleRestoreSession = (session: string) => {
    setArchivedSessions(prev => prev.filter(s => s !== session));
    setTaskSessions(prev => [session, ...prev]);
    showToast(`已恢复「${session}」至任务列表`);
  };

  const handleDeleteSession = (session: string) => {
    setTaskSessions(prev => prev.filter(s => s !== session));
    setPinnedSessions(prev => prev.filter(s => s !== session));
    setArchivedSessions(prev => prev.filter(s => s !== session));
    if (activeSession.includes(session)) {
      setActiveSession('置顶 · 产品方案讨论');
    }
    showToast(`已删除「${session}」会话`);
  };

  const availableSkills = [
    {
      id: 'knowledge-synth',
      name: 'Knowledge Synthesizer',
      desc: '读取参考知识库索引并结构化提炼核心要点',
      badge: '知识增强',
      color: 'text-sky-400 bg-sky-500/15 border-sky-500/30',
      prompt: '调用 Knowledge Synthesizer 工具：请读取当前知识库索引，帮我提炼产品核心架构规范与要点。',
    },
    {
      id: 'comp-analyst',
      name: 'Competitive Analyst',
      desc: '分析头部竞品市场趋势并提取差异化矩阵',
      badge: '市场洞察',
      color: 'text-purple-400 bg-purple-500/15 border-purple-500/30',
      prompt: '调用 Competitive Analyst 工具：针对当前产品方案，梳理 3 家头部竞品的功能差异化矩阵。',
    },
    {
      id: 'agenda-memo',
      name: 'Agenda & Memo Generator',
      desc: '对齐企业日程并自动填充标准会议四要素',
      badge: '协同办公',
      color: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
      prompt: '调用 Agenda & Memo Generator 工具：基于今日待办与日程，自动生成今天下午评审会的会议四要素提纲。',
    },
    {
      id: 'feishu-sync',
      name: 'Feishu Task Synchronizer',
      desc: '经用户二次确认后向飞书多维表格与日程写入待办',
      badge: '企业就绪',
      color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
      prompt: '调用 Feishu Task Synchronizer 工具：将当前讨论出的关键行动项同步至飞书多维表格中。',
    },
  ];

  const handleQuickPrompt = (promptText: string) => {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const aiMsg: ChatMessage = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: `已针对「${activeSession.replace(/^(置顶|任务|项目) · /, '')}」启动分析。当前已关联上下文，正在为您组织结构化执行方案。`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      toolSteps: [
        {
          id: `ts-${Date.now()}`,
          toolName: 'Synthesize Context',
          label: `读取知识库与依赖：${promptText.slice(0, 20)}...`,
          status: 'success',
          detail: '完成关键信息提取与结构化汇总',
        },
      ],
    };

    setSessionMessages(prev => ({
      ...prev,
      [activeSession]: [...(prev[activeSession] || []), userMsg, aiMsg],
    }));
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const aiMsg: ChatMessage = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: `已收到针对「${text}」的指令。根据当前加载的上下文，我已完成意图解析与工具链调度规划。`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      toolSteps: [
        {
          id: `ts-${Date.now()}`,
          toolName: 'Workspace Reasoning',
          label: `分析针对「${activeSession.replace(/^(置顶|任务|项目) · /, '')}」的意图`,
          status: 'success',
          detail: '调度相关上下文与工具规范',
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

    setSessionMessages(prev => ({
      ...prev,
      [activeSession]: [...(prev[activeSession] || []), userMsg, aiMsg],
    }));

    if (activeSession === '置顶 · 产品方案讨论') {
      onSendMessage(text);
    }
  };

  const handleLocalConfirmAction = (action: ActionConfirmData) => {
    setSessionMessages(prev => {
      const msgs = prev[activeSession] || [];
      return {
        ...prev,
        [activeSession]: msgs.map(m => {
          if (m.actionConfirmation && m.actionConfirmation.id === action.id) {
            return {
              ...m,
              actionConfirmation: {
                ...m.actionConfirmation,
                confirmed: true,
              },
            };
          }
          return m;
        }),
      };
    });
    onConfirmAction(action);
  };

  const handleLocalCancelAction = (actionId: string) => {
    setSessionMessages(prev => {
      const msgs = prev[activeSession] || [];
      return {
        ...prev,
        [activeSession]: msgs.map(m => {
          if (m.actionConfirmation && m.actionConfirmation.id === actionId) {
            return {
              ...m,
              actionConfirmation: undefined,
            };
          }
          return m;
        }),
      };
    });
    onCancelAction(actionId);
  };

  const handleAddContextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContextName.trim()) return;
    onAddContext('file', newContextName.trim());
    setNewContextName('');
    setShowAddContext(false);
  };

  const handleInvokeSkill = (prompt: string) => {
    onSendMessage(prompt);
    setShowSkillsModal(false);
  };

  const getContextIcon = (type: ContextItem['type']) => {
    switch (type) {
      case 'task':
        return <ListTodo className="w-3.5 h-3.5 text-rose-400" />;
      case 'knowledge':
        return <BookOpen className="w-3.5 h-3.5 text-sky-400" />;
      case 'file':
        return <FileText className="w-3.5 h-3.5 text-amber-400" />;
      case 'project':
        return <FolderKanban className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden h-full min-h-0 font-sans relative">
      {/* 1. Left Conversation Rail */}
      <div className="w-56 border-r border-white/[0.08] bg-[#11151F]/60 backdrop-blur-md p-3 flex flex-col justify-between shrink-0 hidden md:flex">
        <div className="space-y-2.5">
          {/* Top action 1: 新建对话 Button */}
          <button
            type="button"
            onClick={handleCreateNewSession}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-white text-xs font-semibold transition-colors cursor-pointer"
            title="新建会话窗口"
            aria-label="新建对话"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新建对话</span>
          </button>

          {/* Top action 2: 工具 / Skill Button placed directly below 新建对话 */}
          <button
            type="button"
            onClick={() => setShowSkillsModal(true)}
            className="w-full flex items-center justify-between py-2 px-2.5 rounded-xl bg-gradient-to-r from-[#8083ff]/15 via-[#8B5CF6]/15 to-[#38BDF8]/10 hover:from-[#8083ff]/25 hover:via-[#8B5CF6]/25 hover:to-[#38BDF8]/20 border border-[#8083ff]/35 hover:border-[#8083ff]/60 text-white text-xs font-semibold transition-all group shadow-sm shadow-[#8083ff]/10 cursor-pointer"
            title="选择并调用工具 / Agent Skill"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 rounded-lg bg-[#8083ff]/25 border border-[#8083ff]/40 flex items-center justify-center text-[#c0c1ff] group-hover:rotate-12 transition-transform shrink-0">
                <Wrench className="w-3 h-3 text-[#c0c1ff]" />
              </div>
              <span className="text-[#e2e4ed] group-hover:text-white font-medium truncate">工具 / Skills</span>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-[#8083ff]/25 border border-[#8083ff]/35 text-[#c0c1ff] text-[10px] font-mono shrink-0">
              4个可用
            </span>
          </button>

          <div className="space-y-3 pt-1 max-h-[calc(100vh-14rem)] overflow-y-auto custom-scrollbar pr-0.5">
            {/* 1. 置顶 (Pinned) */}
            <div>
              <div className="text-[11px] font-mono text-[#908fa0] uppercase tracking-wider px-2 mb-1.5 flex items-center justify-between">
                <span>置顶</span>
                <Pin className="w-3 h-3 text-[#908fa0]" />
              </div>
              <div className="space-y-1">
                {pinnedSessions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveSession(`置顶 · ${s}`)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs truncate transition-colors cursor-pointer ${
                      activeSession.includes(s)
                        ? 'bg-[#2a3244]/80 text-[#c0c1ff] border border-[#c0c1ff]/30 font-medium'
                        : 'text-[#c7c4d7] hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. 项目 (Projects - with + button to create project) */}
            <div>
              <div className="text-[11px] font-mono text-[#908fa0] uppercase tracking-wider px-2 mb-1.5 flex items-center justify-between">
                <span>项目</span>
                <button
                  type="button"
                  onClick={() => setShowCreateProjectModal(true)}
                  className="p-1 rounded text-[#908fa0] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="创建项目"
                  aria-label="创建项目"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-1">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActiveSession(`项目 · ${p.name}`)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs truncate transition-colors flex items-center gap-2 cursor-pointer ${
                      activeSession.includes(p.name)
                        ? 'bg-[#2a3244]/80 text-[#c0c1ff] border border-[#c0c1ff]/30 font-medium'
                        : 'text-[#c7c4d7] hover:bg-white/5 hover:text-white'
                    }`}
                    title={`路径: ${p.localPath}`}
                  >
                    <Folder className="w-3.5 h-3.5 text-[#8083ff] shrink-0" />
                    <span className="truncate">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. 任务 (Tasks - with + button to create new conversation session) */}
            <div>
              <div className="text-[11px] font-mono text-[#908fa0] uppercase tracking-wider px-2 mb-1.5 flex items-center justify-between">
                <span>任务</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-[#908fa0]">{taskSessions.length}</span>
                  <button
                    type="button"
                    onClick={handleCreateNewSession}
                    className="p-1 rounded text-[#908fa0] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="新建对话"
                    aria-label="新建对话"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                {taskSessions.map((s, idx) => (
                  <div
                    key={idx}
                    className={`relative w-full group rounded-lg transition-colors flex items-center justify-between px-2.5 py-1.5 ${
                      activeSession.includes(s)
                        ? 'bg-[#2a3244]/80 text-[#c0c1ff] border border-[#c0c1ff]/30 font-medium'
                        : 'text-[#c7c4d7] hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {renamingSession === s ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSaveRename(s);
                        }}
                        className="flex-1 mr-1 min-w-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={renameInput}
                          onChange={(e) => setRenameInput(e.target.value)}
                          onBlur={() => handleSaveRename(s)}
                          autoFocus
                          className="w-full px-1.5 py-0.5 bg-black/40 border border-[#8083ff]/50 rounded text-xs text-white outline-none"
                        />
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveSession(`任务 · ${s}`)}
                        className="flex-1 text-left text-xs truncate cursor-pointer mr-1 min-w-0"
                        title={s}
                      >
                        {s}
                      </button>
                    )}

                    {/* Action buttons on the right of EACH task session (invisible by default, visible on hover or when menu is open) */}
                    <div className={`flex items-center gap-0.5 shrink-0 transition-opacity duration-150 ${
                      openMenuSession === s ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}>
                      {/* 1. 归档 button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchiveSession(s);
                        }}
                        className="p-1 rounded text-[#908fa0] hover:text-[#c0c1ff] hover:bg-white/10 transition-colors cursor-pointer"
                        title="归档此会话"
                        aria-label="归档"
                      >
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">
                          <path d="M768 64A32 32 0 0 0 768 0H256a32 32 0 0 0 0 64h512z m192 832a64 64 0 0 1-64 64h-768a64 64 0 0 1-64-64v-512a64 64 0 0 1 64-64h768a64 64 0 0 1 64 64v512zM96 256C43.008 256 0 299.008 0 352v576C0 980.992 43.008 1024 96 1024h832c52.992 0 96-43.008 96-96v-576C1024 299.008 980.992 256 928 256h-832z m768-64a32 32 0 0 0 0-64h-704a32 32 0 0 0 0 64h704z" />
                        </svg>
                      </button>

                      {/* 2. 会话管理 button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuSession(openMenuSession === s ? null : s);
                        }}
                        className="p-1 rounded text-[#908fa0] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        title="会话管理"
                        aria-label="会话管理"
                      >
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">
                          <path d="M192 601.6a96 96 0 1 0 0-192 96 96 0 0 0 0 192z m319.232 0a96 96 0 1 0 0-192 96 96 0 0 0 0 192zM832 601.6a96 96 0 1 0 0-192 96 96 0 0 0 0 192z" />
                        </svg>
                      </button>
                    </div>

                    {/* Popover Menu for this session */}
                    {openMenuSession === s && (
                      <div 
                        className="absolute right-1 top-8 z-40 w-36 py-1 rounded-xl bg-[#181d2a] border border-white/15 shadow-2xl backdrop-blur-xl text-xs space-y-0.5 animate-in fade-in zoom-in-95 duration-150"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            handlePinSession(s);
                            setOpenMenuSession(null);
                          }}
                          className="w-full px-2.5 py-1.5 text-left text-[#c7c4d7] hover:text-white hover:bg-white/10 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Pin className="w-3.5 h-3.5 text-[#8083ff]" />
                          <span>置顶会话</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingSession(s);
                            setRenameInput(s);
                            setOpenMenuSession(null);
                          }}
                          className="w-full px-2.5 py-1.5 text-left text-[#c7c4d7] hover:text-white hover:bg-white/10 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#38BDF8]" />
                          <span>重命名</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleArchiveSession(s);
                            setOpenMenuSession(null);
                          }}
                          className="w-full px-2.5 py-1.5 text-left text-[#c7c4d7] hover:text-white hover:bg-white/10 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Archive className="w-3.5 h-3.5 text-amber-400" />
                          <span>归档会话</span>
                        </button>
                        <div className="border-t border-white/[0.08] my-1" />
                        <button
                          type="button"
                          onClick={() => {
                            handleDeleteSession(s);
                            setOpenMenuSession(null);
                          }}
                          className="w-full px-2.5 py-1.5 text-left text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          <span>删除会话</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[11px] text-[#908fa0] font-mono">
          <span>模式：</span>
          <span className="text-[#34D399]">被动等待指令</span>
        </div>
      </div>

      {/* 2. Center AI Workspace */}
      <div className="flex-1 flex flex-col bg-[#0B0E14]/70 overflow-hidden relative">
        {/* Active conversation header */}
        <div className="h-10 px-4 border-b border-white/[0.08] flex items-center justify-between text-xs text-[#c7c4d7] bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-[#c0c1ff]" />
            <span className="font-semibold text-white">{activeSession}</span>
            <span className="px-1.5 py-0.2 rounded bg-[#c0c1ff]/20 text-[#c0c1ff] text-[10px] font-mono border border-[#c0c1ff]/30">
              Agent Runtime 就绪
            </span>
          </div>
          <div className="text-[11px] text-[#908fa0] font-mono hidden sm:block">
            遵循「执行透明、重要操作确认」原则
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
          {(!sessionMessages[activeSession] || sessionMessages[activeSession].length === 0) ? (
            <div className="h-full min-h-[360px] flex flex-col items-center justify-center text-center p-6 max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#6366F1]/20 to-[#8B5CF6]/30 border border-[#8083ff]/30 flex items-center justify-center text-[#c0c1ff] mb-4 shadow-lg shadow-[#6366F1]/10">
                <Bot className="w-6 h-6 text-[#c0c1ff]" />
              </div>
              <h3 className="text-base font-semibold text-white mb-1.5">
                新会话窗口已就绪
              </h3>
              <p className="text-xs text-[#908fa0] mb-6 leading-relaxed">
                当前会话：「{activeSession}」<br />
                在下方输入框中输入需求，或选择以下常用工作流快速启动本次协作：
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
                <button
                  type="button"
                  onClick={() => handleQuickPrompt('帮我梳理今日待办事项的执行优先级与时间表')}
                  className="p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-[#8083ff]/40 text-xs text-[#c7c4d7] hover:text-white transition-all cursor-pointer group"
                >
                  <div className="font-medium text-white mb-0.5 group-hover:text-[#c0c1ff] transition-colors">
                    📋 规划今日任务优先级
                  </div>
                  <div className="text-[11px] text-[#908fa0]">智能排列轻重缓急与执行时序</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickPrompt('基于知识库规范，梳理当前产品的交互设计要点')}
                  className="p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-[#8083ff]/40 text-xs text-[#c7c4d7] hover:text-white transition-all cursor-pointer group"
                >
                  <div className="font-medium text-white mb-0.5 group-hover:text-[#c0c1ff] transition-colors">
                    📚 检索知识库设计规范
                  </div>
                  <div className="text-[11px] text-[#908fa0]">提炼极简交互与透明执行原则</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickPrompt('针对当前方案，对比分析 3 家头部竞品的功能差异')}
                  className="p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-[#8083ff]/40 text-xs text-[#c7c4d7] hover:text-white transition-all cursor-pointer group"
                >
                  <div className="font-medium text-white mb-0.5 group-hover:text-[#c0c1ff] transition-colors">
                    🔍 生成竞品功能差异矩阵
                  </div>
                  <div className="text-[11px] text-[#908fa0]">提取差异化优势与体验分析</div>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSkillsModal(true)}
                  className="p-3 rounded-xl bg-gradient-to-r from-[#8083ff]/10 to-[#8B5CF6]/10 hover:from-[#8083ff]/20 hover:to-[#8B5CF6]/20 border border-[#8083ff]/30 text-xs text-[#c7c4d7] hover:text-white transition-all cursor-pointer group"
                >
                  <div className="font-medium text-white mb-0.5 group-hover:text-[#c0c1ff] transition-colors">
                    ⚡ 调度 Agent 专有技能
                  </div>
                  <div className="text-[11px] text-[#908fa0]">打开 Tools & Skills 工具箱</div>
                </button>
              </div>
            </div>
          ) : (
            (sessionMessages[activeSession] || []).map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${
                  msg.role === 'user' ? 'ml-auto justify-end' : 'mr-auto justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white shrink-0 shadow-md shadow-[#6366F1]/30">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`rounded-2xl p-4 space-y-3 text-xs md:text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#2a3244] text-white border border-[#c0c1ff]/30 shadow-md'
                      : 'bg-[#161B26]/80 border border-white/[0.08] text-[#c7c4d7] specular-card'
                  }`}
                >
                  <p className="text-[#e1e2eb]">{msg.content}</p>

                  {/* Transparent Tool Execution Card */}
                  {msg.toolSteps && msg.toolSteps.length > 0 && (
                    <div className="rounded-xl bg-black/40 border border-white/[0.08] p-3.5 space-y-2.5 font-sans">
                      <div className="flex items-center justify-between text-[11px] font-mono text-[#908fa0] border-b border-white/[0.08] pb-2">
                        <span className="flex items-center gap-1.5 text-[#c0c1ff]">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>正在处理 (Tool Calling Transparent View)</span>
                        </span>
                        <span>已完成 {msg.toolSteps.length} 个步骤</span>
                      </div>

                      <div className="space-y-2">
                        {msg.toolSteps.map((step) => (
                          <div
                            key={step.id}
                            className="flex items-start justify-between gap-3 text-xs p-2 rounded-lg bg-white/[0.03] border border-white/5"
                          >
                            <div className="flex items-start gap-2">
                              <Check className="w-4 h-4 text-[#34D399] shrink-0 mt-0.5" />
                              <div>
                                <div className="font-mono text-[#c0c1ff] font-medium">{step.label}</div>
                                {step.detail && (
                                  <div className="text-[11px] text-[#908fa0] font-mono mt-0.5">
                                    ↳ {step.detail}
                                  </div>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] font-mono text-[#34D399] bg-[#34D399]/15 px-1.5 py-0.5 rounded uppercase">
                              Success
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Confirmation Block */}
                  {msg.actionConfirmation && (
                    <div className="rounded-xl bg-[#FBBF24]/10 border border-[#FBBF24]/30 p-3.5 space-y-2.5">
                      <div className="flex items-center gap-2 text-[#FBBF24] text-xs font-semibold">
                        <ShieldAlert className="w-4 h-4" />
                        <span>{msg.actionConfirmation.title}</span>
                      </div>
                      <p className="text-xs text-[#c7c4d7]">
                        {msg.actionConfirmation.description}
                      </p>

                      <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.08] font-mono text-xs space-y-1">
                        {Object.entries(msg.actionConfirmation.payload).map(([k, v], i) => (
                          <div key={i} className="flex items-center justify-between text-[11px]">
                            <span className="text-[#908fa0]">{k}：</span>
                            <span className="text-white font-medium">{v}</span>
                          </div>
                        ))}
                      </div>

                      {!msg.actionConfirmation.confirmed ? (
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            onClick={() => handleLocalCancelAction(msg.actionConfirmation!.id)}
                            className="px-3 py-1 rounded-lg text-xs text-[#908fa0] hover:text-white hover:bg-white/5"
                          >
                            取消
                          </button>
                          <button
                            onClick={() => handleLocalConfirmAction(msg.actionConfirmation!)}
                            className="px-3 py-1 rounded-lg bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:opacity-95 text-white text-xs font-semibold shadow"
                          >
                            确认创建
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-[#34D399] font-mono">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>已授权执行并同步至任务看板与企业日历</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="text-[10px] text-[#908fa0] font-mono text-right">
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom Input Field */}
        <div className="p-4 border-t border-white/[0.08] bg-[#11151F]/80 backdrop-blur-xl">
          <form onSubmit={handleSend} className="relative flex items-center">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="输入你的工作需求，如「帮我梳理竞品分析框架并同步到待办」..."
              className="w-full h-11 pl-4 pr-24 rounded-2xl bg-white/[0.05] border border-white/[0.08] focus:border-[#8083ff]/60 focus:ring-1 focus:ring-[#8083ff]/40 text-xs md:text-sm text-white placeholder:text-[#908fa0] outline-none transition-all shadow-inner font-sans"
            />
            <div className="absolute right-2 flex items-center gap-1.5">
              <button
                type="button"
                className="p-1.5 text-[#908fa0] hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                title="附加上下文文件"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                type="submit"
                className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6366F1] to-[#8B5CF6] text-white flex items-center justify-center hover:opacity-95 shadow-md shadow-[#6366F1]/30 active:scale-95 transition-all"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          </form>
          <div className="flex items-center justify-between text-[11px] text-[#908fa0] font-mono mt-2 px-1">
            <span>支持 Markdown 与代码高亮</span>
            <span>回车发送 · ⌘+Enter 换行</span>
          </div>
        </div>
      </div>

      {/* 3. Right Context Panel */}
      <div className="w-72 border-l border-white/[0.08] bg-[#11151F]/70 backdrop-blur-md p-4 flex flex-col justify-between shrink-0 hidden lg:flex">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
            <span className="text-xs font-semibold text-white">当前活动上下文 (Context)</span>
            <button
              onClick={() => setShowAddContext(!showAddContext)}
              className="text-[11px] font-mono text-[#c0c1ff] hover:underline flex items-center gap-0.5"
            >
              <Plus className="w-3 h-3" />
              <span>添加</span>
            </button>
          </div>

          <p className="text-[11px] text-[#908fa0] leading-relaxed font-sans">
            AI 仅针对以下明确绑定的上下文要素进行推理与工具调用，避免幻觉与过度扩散。
          </p>

          {/* Add context inline form */}
          {showAddContext && (
            <form onSubmit={handleAddContextSubmit} className="p-2.5 rounded-xl bg-white/[0.05] border border-[#8083ff]/40 space-y-2">
              <input
                type="text"
                value={newContextName}
                onChange={(e) => setNewContextName(e.target.value)}
                placeholder="上下文名称 / 知识条目..."
                className="w-full bg-transparent border-none outline-none text-xs text-white placeholder:text-[#908fa0] font-sans"
                autoFocus
              />
              <div className="flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowAddContext(false)}
                  className="px-2 py-0.5 text-[#908fa0] hover:text-white text-[11px]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-2 py-0.5 rounded bg-[#6366F1] text-white text-[11px]"
                >
                  添加
                </button>
              </div>
            </form>
          )}

          {/* Context List */}
          <div className="space-y-2">
            {contexts.map((ctx) => (
              <div
                key={ctx.id}
                className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.15] transition-all flex items-start justify-between gap-2 group"
              >
                <div className="flex items-start gap-2 min-w-0">
                  <div className="mt-0.5">{getContextIcon(ctx.type)}</div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white truncate">{ctx.name}</p>
                    {ctx.detail && (
                      <p className="text-[10px] text-[#908fa0] font-mono mt-0.5 truncate">
                        {ctx.detail}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onRemoveContext(ctx.id)}
                  className="text-[#908fa0] hover:text-[#F87171] p-1 transition-colors shrink-0"
                  title="移除此上下文"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.08] text-[11px] text-[#908fa0] font-mono">
          <div>上下文窗口 Token: 14,290</div>
          <div className="text-[#34D399] mt-0.5">命中率: 98.4%</div>
        </div>
      </div>

      {/* Agent Skills Quick Drawer / Modal */}
      {showSkillsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-[#111520] border border-white/15 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#8083ff]/20 border border-[#8083ff]/40 flex items-center justify-center text-[#c0c1ff]">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                    <span>工具 / Agent Skills 调度台</span>
                    <span className="px-1.5 py-0.2 rounded bg-[#8083ff]/20 text-[#c0c1ff] text-[10px] font-mono border border-[#8083ff]/30">
                      4个就绪
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#908fa0] mt-0.5">选择技能可一键发送并触发 AI 执行专属任务流</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSkillsModal(false)}
                className="p-1.5 rounded-lg text-[#908fa0] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
              {availableSkills.map((skill) => (
                <div
                  key={skill.id}
                  className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-[#8083ff]/40 transition-all flex items-start justify-between gap-3 group"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white group-hover:text-[#c0c1ff] transition-colors">
                        {skill.name}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono border ${skill.color}`}>
                        {skill.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#908fa0] leading-relaxed">
                      {skill.desc}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleInvokeSkill(skill.prompt)}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-[#8083ff]/20 hover:bg-[#8083ff]/35 border border-[#8083ff]/40 text-[#c0c1ff] hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-[#8083ff]/10"
                  >
                    <Zap className="w-3 h-3 text-[#c0c1ff]" />
                    <span>立即调用</span>
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between">
              <span className="text-[11px] text-[#908fa0] font-mono">
                调用遵循「执行透明、重要操作确认」原则
              </span>
              {onNavigateToSkills && (
                <button
                  type="button"
                  onClick={() => {
                    setShowSkillsModal(false);
                    onNavigateToSkills();
                  }}
                  className="text-xs text-[#c0c1ff] hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>查看完整注册表</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Project Modal (reference Image 1) */}
      <CreateProjectModal
        isOpen={showCreateProjectModal}
        onClose={() => setShowCreateProjectModal(false)}
        onCreateProject={handleCreateProject}
      />

      {/* Archive / Session Manager Modal */}
      <SessionManagerModal
        isOpen={sessionModalMode !== null}
        onClose={() => setSessionModalMode(null)}
        mode={sessionModalMode || 'manage'}
        activeSessions={[...pinnedSessions, ...taskSessions]}
        archivedSessions={archivedSessions}
        onArchiveSession={handleArchiveSession}
        onRestoreSession={handleRestoreSession}
        onDeleteSession={handleDeleteSession}
        onSelectSession={(s) => setActiveSession(s)}
      />

      {/* Floating Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-[#1e2333]/95 border border-white/20 text-white text-xs shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 pointer-events-none">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
