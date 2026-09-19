import React from 'react';
import { KnowledgeItem } from '../types';
import { X, BookOpen, Clock, Tag, ExternalLink, Bookmark } from 'lucide-react';

interface KnowledgeDetailModalProps {
  item: KnowledgeItem | null;
  isOpen: boolean;
  onClose: () => void;
  onReferenceInAI: (item: KnowledgeItem) => void;
}

export const KnowledgeDetailModal: React.FC<KnowledgeDetailModalProps> = ({
  item,
  isOpen,
  onClose,
  onReferenceInAI,
}) => {
  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150 font-sans">
      <div 
        className="w-full max-w-lg rounded-2xl bg-[#161B26]/95 border border-white/[0.12] p-6 shadow-2xl specular-card relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#c0c1ff]" />
            <span className="text-xs font-mono text-[#c0c1ff]">{item.category}</span>
          </div>
          <button 
            aria-label="关闭知识库预览"
            onClick={onClose} 
            className="text-[#908fa0] hover:text-white p-1 rounded-lg hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs font-sans">
          <div>
            <h3 className="text-base font-bold text-white leading-snug">{item.title}</h3>
            <div className="flex items-center gap-3 text-[#908fa0] font-mono text-[11px] mt-1.5">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>更新于 {item.timeAgo}</span>
              </span>
              <span>·</span>
              <span>{item.readTime}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] space-y-2">
            <div className="text-[11px] font-mono text-[#908fa0] uppercase tracking-wider">核心摘要</div>
            <p className="text-[#c7c4d7] leading-relaxed text-xs">
              {item.summary}
            </p>
          </div>

          <div>
            <div className="text-[11px] font-mono text-[#908fa0] mb-2">关联标签 (Tags)</div>
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((tag, i) => (
                <span key={i} className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/[0.08] text-[#c7c4d7] font-mono text-[11px]">
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl border border-white/[0.08] text-[#c7c4d7] hover:text-white hover:bg-white/5 transition-colors"
            >
              关闭
            </button>
            <button
              onClick={() => {
                onReferenceInAI(item);
                onClose();
              }}
              className="px-4 py-1.5 rounded-xl bg-[#c0c1ff] hover:bg-[#c0c1ff]/90 text-[#0B0E14] font-semibold text-xs shadow transition-colors"
            >
              注入 AI 会话上下文
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
