import React, { useEffect } from 'react';
import { X } from 'lucide-react';

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
  title = '删除文件',
  itemName,
  itemType = 'file',
  warningText = '删除的文档将进入回收站，30天后自动彻底删除。',
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 font-sans select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[#131620] border border-white/10 p-6 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header: Label at top-left, Close button at top-right */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <span className="text-sm font-semibold text-white tracking-wide">
            {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#8c8ea3] hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body content */}
        <div className="py-4 space-y-2">
          <div className="text-sm text-white/90 leading-relaxed">
            你确定要删除: “{itemName}”
          </div>
          <div className="text-xs text-[#8c8ea3] leading-relaxed">
            {warningText}
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-white/[0.08] text-xs text-[#c7c4d7] hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-[#de211d] hover:bg-[#de211d]/90 active:scale-[0.98] text-white text-xs font-medium transition-all cursor-pointer shadow-sm"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  );
};
