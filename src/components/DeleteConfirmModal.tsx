import React, { useEffect } from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  itemName: string;
  itemType?: 'file' | 'folder';
  warningText?: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = '确认删除文件',
  itemName,
  itemType = 'file',
  warningText = '此操作将从知识库目录树与索引中彻底清理该记录，无法撤销。',
}) => {
  // Listen for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 font-sans select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[#121520]/95 border border-red-500/30 p-6 shadow-[0_0_50px_rgba(239,68,68,0.15)] specular-card relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-[#8c8ea3] hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          title="关闭"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning Header */}
        <div className="flex items-start gap-3.5 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0 shadow-[0_0_12px_rgba(239,68,68,0.2)]">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
          <div className="pr-6">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-red-500/15 border border-red-500/25 text-red-400 text-[10px] font-mono font-medium">
                DANGER · 风险操作警示
              </span>
            </div>
            <h3 className="text-base font-semibold text-white mt-1.5">{title}</h3>
            <p className="text-xs text-[#908fa0] mt-1">
              您正在请求永久删除知识库中的{itemType === 'folder' ? '目录及其下所有文件' : '文档'}。
            </p>
          </div>
        </div>

        {/* Target Name Card */}
        <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between mb-4">
          <span className="text-xs text-[#8c8ea3] font-mono">
            {itemType === 'folder' ? '目标文件夹' : '目标文件名'}：
          </span>
          <span className="text-xs font-semibold text-red-300 font-mono bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 truncate max-w-[220px]">
            {itemName}
          </span>
        </div>

        {/* Warning Description */}
        <div className="text-xs text-[#a0a2b8] mb-6 leading-relaxed bg-red-500/[0.04] p-3 rounded-xl border border-red-500/15">
          ⚠️ <strong className="text-red-400">注意：</strong>{warningText}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-white/[0.08] text-xs text-[#c7c4d7] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white text-xs font-semibold shadow-[0_0_16px_rgba(239,68,68,0.4)] flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>确认删除</span>
          </button>
        </div>
      </div>
    </div>
  );
};
