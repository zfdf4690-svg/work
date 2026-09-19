import React, { useState, useEffect } from 'react';
import { AISuggestion, ToolStep } from '../types';
import { Check, Loader2, AlertCircle, Circle, ArrowRight, ShieldAlert, Sparkles, X, CheckCircle2 } from 'lucide-react';

interface ToolCallingModalProps {
  suggestion: AISuggestion | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmTaskCreation: (taskTitle: string) => void;
}

export const ToolCallingModal: React.FC<ToolCallingModalProps> = ({
  suggestion,
  isOpen,
  onClose,
  onConfirmTaskCreation,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [steps, setSteps] = useState<ToolStep[]>([]);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  useEffect(() => {
    if (!suggestion || !isOpen) return;

    // Reset steps to pending
    const initialSteps = suggestion.steps.map((s, idx) => ({
      ...s,
      status: idx === 0 ? ('running' as const) : ('pending' as const),
    }));
    setSteps(initialSteps);
    setCurrentStepIndex(0);
    setIsCompleted(false);

    // Simulate step by step execution
    let currentIdx = 0;
    const interval = setInterval(() => {
      currentIdx++;
      if (currentIdx < initialSteps.length) {
        setSteps(prev => 
          prev.map((step, idx) => {
            if (idx < currentIdx) return { ...step, status: 'success' };
            if (idx === currentIdx) return { ...step, status: 'running' };
            return { ...step, status: 'pending' };
          })
        );
        setCurrentStepIndex(currentIdx);
      } else {
        // Complete all
        setSteps(prev => prev.map(step => ({ ...step, status: 'success' })));
        setIsCompleted(true);
        clearInterval(interval);
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [suggestion, isOpen]);

  if (!isOpen || !suggestion) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 font-sans">
      <div 
        className="w-full max-w-lg rounded-2xl bg-[#161B26]/95 border border-white/[0.12] p-6 shadow-2xl specular-card relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6366F1] to-[#a855f7] flex items-center justify-center shadow-md shadow-[#6366F1]/30">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">AI Agent 工具调用执行</h3>
                <span className="px-2 py-0.2 rounded-full bg-[#c0c1ff]/20 text-[#c0c1ff] text-[10px] font-mono border border-[#c0c1ff]/30">
                  {suggestion.badge || '自主工作流'}
                </span>
              </div>
              <p className="text-xs text-[#908fa0] mt-0.5">{suggestion.title}</p>
            </div>
          </div>
          <button 
            aria-label="关闭工具调用模态框"
            onClick={onClose} 
            className="text-[#908fa0] hover:text-white p-1 rounded-lg hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Transparent Tool Execution Sequence (Section IX & X of PRD) */}
        <div className="space-y-3 mb-5">
          <div className="flex items-center justify-between text-[11px] font-mono text-[#908fa0]">
            <span>执行过程透明化（无技术噪点）</span>
            <span>{isCompleted ? '全部步骤完成' : '执行中...'}</span>
          </div>

          <div className="space-y-2">
            {steps.map((step, idx) => {
              const isRunning = step.status === 'running';
              const isSuccess = step.status === 'success';
              const isPending = step.status === 'pending';

              return (
                <div
                  key={step.id}
                  className={`p-3 rounded-xl border transition-all ${
                    isRunning
                      ? 'bg-[#c0c1ff]/10 border-[#c0c1ff]/40 shadow-sm shadow-[#c0c1ff]/20'
                      : isSuccess
                      ? 'bg-white/[0.04] border-[#34D399]/25'
                      : 'bg-white/[0.02] border-white/5 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      {isRunning && (
                        <Loader2 className="w-4 h-4 text-[#c0c1ff] animate-spin shrink-0" />
                      )}
                      {isSuccess && (
                        <Check className="w-4 h-4 text-[#34D399] shrink-0 stroke-[2.5]" />
                      )}
                      {isPending && (
                        <Circle className="w-4 h-4 text-[#908fa0] shrink-0" />
                      )}

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-[#c0c1ff] font-medium">
                            {step.toolName}
                          </span>
                          <span className="text-[11px] text-[#c7c4d7]">
                            {step.label}
                          </span>
                        </div>
                        {step.detail && (
                          <p className="text-[11px] text-[#908fa0] mt-1 font-mono">
                            ↳ {step.detail}
                          </p>
                        )}
                      </div>
                    </div>

                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase ${
                      isSuccess ? 'bg-[#34D399]/20 text-[#34D399]' :
                      isRunning ? 'bg-[#c0c1ff]/20 text-[#c0c1ff]' : 'bg-white/5 text-[#908fa0]'
                    }`}>
                      {step.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Completion & Action Confirmation proposal */}
        {isCompleted && (
          <div className="p-3.5 rounded-xl bg-[#c0c1ff]/10 border border-[#c0c1ff]/30 space-y-2 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2 text-[#c0c1ff] text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
              <span>智能助手已根据上述结果准备好结构化待办</span>
            </div>
            <p className="text-xs text-[#c7c4d7] leading-relaxed">
              是否将「{suggestion.title}」沉淀为今日重点任务，并在任务看板中持续跟踪进度？
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={onClose}
                className="px-3 py-1 rounded-lg text-xs text-[#908fa0] hover:text-white hover:bg-white/5 transition-colors"
              >
                仅浏览结果
              </button>
              <button
                onClick={() => {
                  onConfirmTaskCreation(suggestion.title);
                  onClose();
                }}
                className="px-3 py-1 rounded-lg bg-[#c0c1ff] hover:bg-[#c0c1ff]/90 text-[#0B0E14] text-xs font-semibold shadow-md transition-colors"
              >
                确认写入今日任务
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-[#908fa0] font-mono border-t border-white/[0.08] pt-3">
          <span>遵循「AI 不主动打扰，用户主动发起」设计哲学</span>
          <button 
            onClick={onClose}
            className="text-[#c7c4d7] hover:text-white underline decoration-[#908fa0]"
          >
            完成并关闭
          </button>
        </div>
      </div>
    </div>
  );
};
