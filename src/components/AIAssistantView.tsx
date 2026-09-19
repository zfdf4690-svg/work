import React, { useState } from 'react';
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
  X
} from 'lucide-react';
import { 
  ChatMessage, 
  ContextItem, 
  ToolStep, 
  ActionConfirmData 
} from '../types';

interface AIAssistantViewProps {
  messages: ChatMessage[];
  contexts: ContextItem[];
  onSendMessage: (text: string) => void;
  onConfirmAction: (action: ActionConfirmData) => void;
  onCancelAction: (actionId: string) => void;
  onRemoveContext: (contextId: string) => void;
  onAddContext: (type: ContextItem['type'], name: string) => void;
}

export const AIAssistantView: React.FC<AIAssistantViewProps> = ({
  messages,
  contexts,
  onSendMessage,
  onConfirmAction,
  onCancelAction,
  onRemoveContext,
  onAddContext,
}) => {
  const [inputText, setInputText] = useState('');
  const [activeSession, setActiveSession] = useState('今天 · 产品方案讨论');
  const [newContextName, setNewContextName] = useState('');
  const [showAddContext, setShowAddContext] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleAddContextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContextName.trim()) return;
    onAddContext('file', newContextName.trim());
    setNewContextName('');
    setShowAddContext(false);
  };

  const sessionsToday = ['产品方案讨论', '竞品市场研究', '官网极简规范梳理'];
  const sessionsRecent = ['AI 办公助手原型', '知识库向量检索调优', 'Linear 交互范式复盘'];

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
    <div className="flex-1 flex overflow-hidden h-[calc(100vh-3.5rem-2.25rem)] font-sans">
      {/* 1. Left Conversation Rail */}
      <div className="w-56 border-r border-white/[0.08] bg-[#11151F]/60 backdrop-blur-md p-3 flex flex-col justify-between shrink-0 hidden md:flex">
        <div className="space-y-4">
          <button
            onClick={() => onSendMessage('新建一次关于交互架构的深度分析')}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-white text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新建对话</span>
          </button>

          <div>
            <div className="text-[11px] font-mono text-[#908fa0] uppercase tracking-wider px-2 mb-1.5">
              今天
            </div>
            <div className="space-y-1">
              {sessionsToday.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveSession(`今天 · ${s}`)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs truncate transition-colors ${
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

          <div>
            <div className="text-[11px] font-mono text-[#908fa0] uppercase tracking-wider px-2 mb-1.5">
              最近
            </div>
            <div className="space-y-1">
              {sessionsRecent.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveSession(`最近 · ${s}`)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs truncate transition-colors ${
                    activeSession.includes(s)
                      ? 'bg-[#2a3244]/80 text-[#c0c1ff] border border-[#c0c1ff]/30 font-medium'
                      : 'text-[#908fa0] hover:text-white hover:bg-white/5'
                  }`}
                >
                  {s}
                </button>
              ))}
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
          {messages.map((msg) => (
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
                          onClick={() => onCancelAction(msg.actionConfirmation!.id)}
                          className="px-3 py-1 rounded-lg text-xs text-[#908fa0] hover:text-white hover:bg-white/5"
                        >
                          取消
                        </button>
                        <button
                          onClick={() => onConfirmAction(msg.actionConfirmation!)}
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
          ))}
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
    </div>
  );
};
