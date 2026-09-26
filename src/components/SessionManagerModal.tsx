import React, { useState } from 'react';
import { X, Archive, Check, Pin, Trash2, Download, Search, RotateCcw } from 'lucide-react';

interface SessionManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'archive' | 'manage';
  activeSessions: string[];
  archivedSessions: string[];
  onArchiveSession: (session: string) => void;
  onRestoreSession: (session: string) => void;
  onDeleteSession: (session: string) => void;
  onSelectSession: (session: string) => void;
}

export const SessionManagerModal: React.FC<SessionManagerModalProps> = ({
  isOpen,
  onClose,
  mode,
  activeSessions,
  archivedSessions,
  onArchiveSession,
  onRestoreSession,
  onDeleteSession,
  onSelectSession,
}) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const isArchiveMode = mode === 'archive';
  const list = isArchiveMode ? archivedSessions : activeSessions;
  const filteredList = list.filter(s => s.toLowerCase().includes(search.toLowerCase()));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 font-sans"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-[#111520] border border-white/15 p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-[#E2E4ED]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#8083ff]/20 border border-[#8083ff]/35 flex items-center justify-center text-[#c0c1ff]">
              {isArchiveMode ? <Archive className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                {isArchiveMode ? '归档会话箱' : '会话任务管理'}
              </h3>
              <p className="text-[11px] text-[#908fa0] mt-0.5">
                {isArchiveMode
                  ? `共归档 ${archivedSessions.length} 个历史任务会话，可随时恢复`
                  : `共 ${activeSessions.length} 个进行中会话，支持归档、置顶与导出`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#908fa0] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#908fa0]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isArchiveMode ? '搜索归档会话...' : '搜索会话或任务名称...'}
            className="w-full pl-9 pr-3 py-2 bg-white/[0.04] border border-white/[0.08] focus:border-[#8083ff]/50 rounded-xl text-xs text-white placeholder:text-[#908fa0] outline-none"
          />
        </div>

        {/* List */}
        <div className="space-y-1.5 max-h-[48vh] overflow-y-auto pr-1 custom-scrollbar">
          {filteredList.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#908fa0]">
              {isArchiveMode ? '暂无归档的会话记录' : '未找到匹配的会话任务'}
            </div>
          ) : (
            filteredList.map((session, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] transition-colors group"
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelectSession(session);
                    onClose();
                  }}
                  className="text-xs text-[#c7c9dc] group-hover:text-white truncate flex-1 text-left cursor-pointer mr-2"
                >
                  {session}
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  {isArchiveMode ? (
                    <button
                      type="button"
                      onClick={() => onRestoreSession(session)}
                      className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                      title="恢复到活动会话"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>恢复</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onArchiveSession(session)}
                      className="p-1.5 rounded-lg text-[#908fa0] hover:text-[#c0c1ff] hover:bg-white/10 transition-colors cursor-pointer"
                      title="归档此会话"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onDeleteSession(session)}
                    className="p-1.5 rounded-lg text-[#908fa0] hover:text-red-400 hover:bg-red-500/15 transition-colors cursor-pointer"
                    title="永久删除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-[#908fa0]">
          <span>点击会话名称可直接切换查看对话</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors cursor-pointer"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
