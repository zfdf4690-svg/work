import React from 'react';
import { ActionConfirmData } from '../types';
import { ShieldAlert, Check, X, ArrowRight } from 'lucide-react';

interface ActionConfirmModalProps {
  data: ActionConfirmData | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: ActionConfirmData) => void;
}

export const ActionConfirmModal: React.FC<ActionConfirmModalProps> = ({
  data,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 font-sans">
      <div 
        className="w-full max-w-md rounded-2xl bg-[#161B26]/95 border border-amber-500/30 p-6 shadow-2xl specular-card relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <span className="px-2 py-0.2 rounded bg-amber-500/15 border border-amber-500/25 text-amber-300 text-[10px] font-mono">
              Action Confirmation · 意图防误触
            </span>
            <h3 className="text-sm font-semibold text-white mt-1">{data.title}</h3>
            <p className="text-xs text-[#908fa0] mt-0.5">{data.description}</p>
          </div>
        </div>

        {/* Payload details card */}
        <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] space-y-2 mb-5 font-mono text-xs">
          {Object.entries(data.payload).map(([k, v], i) => (
            <div key={i} className="flex items-center justify-between py-1 border-b border-white/[0.04] last:border-none">
              <span className="text-[#908fa0]">{k}</span>
              <span className="text-white font-medium text-right truncate max-w-[200px]">{v}</span>
            </div>
          ))}
        </div>

        <div className="text-[11px] text-[#908fa0] mb-5 leading-relaxed">
          🔒 根据产品设计规划第 11 节，系统不会在后台隐蔽修改用户数据或调用外部系统。您的点击将作为最终授权。
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl border border-white/[0.08] text-xs text-[#c7c4d7] hover:text-white hover:bg-white/5 transition-colors"
          >
            取消操作
          </button>
          <button
            onClick={() => {
              onConfirm(data);
              onClose();
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#c0c1ff] hover:bg-[#c0c1ff]/90 text-[#0B0E14] text-xs font-semibold shadow-md shadow-[#c0c1ff]/20 transition-all active:scale-[0.98]"
          >
            <Check className="w-3.5 h-3.5" />
            <span>确认执行</span>
          </button>
        </div>
      </div>
    </div>
  );
};
