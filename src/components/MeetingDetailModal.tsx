import React from 'react';
import { MeetingInfo } from '../types';
import { X, Video, Users, ExternalLink, Calendar, Copy, Check, Sparkles } from 'lucide-react';

interface MeetingDetailModalProps {
  meeting: MeetingInfo;
  isOpen: boolean;
  onClose: () => void;
  onGenerateBrief: () => void;
}

export const MeetingDetailModal: React.FC<MeetingDetailModalProps> = ({
  meeting,
  isOpen,
  onClose,
  onGenerateBrief,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const copyLink = () => {
    navigator.clipboard?.writeText(meeting.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150 font-sans">
      <div 
        className="w-full max-w-md rounded-2xl bg-[#161B26]/95 border border-white/[0.12] p-6 shadow-2xl specular-card relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-4">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-[#7bd0ff]" />
            <h3 className="text-sm font-semibold text-white">日程详情 · {meeting.platform}</h3>
          </div>
          <button 
            aria-label="关闭会议详情"
            onClick={onClose} 
            className="text-[#908fa0] hover:text-white p-1 rounded-lg hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs font-sans">
          <div>
            <h4 className="text-base font-bold text-white">{meeting.title}</h4>
            <div className="flex items-center gap-2 text-[#7bd0ff] font-mono text-xs mt-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{meeting.time}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] space-y-2">
            <div className="text-[11px] font-mono text-[#908fa0]">参会成员</div>
            <div className="flex items-center gap-2">
              {meeting.participants.map((p, idx) => (
                <div key={idx} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/[0.08]">
                  <span className={`w-4 h-4 rounded-full ${p.avatarBg} text-[9px] flex items-center justify-center text-white font-medium`}>
                    {p.name}
                  </span>
                  <span className="text-[#c7c4d7] text-[11px]">{p.name}</span>
                </div>
              ))}
              <span className="text-[#908fa0] text-[11px]">+4 位企业核心组成员</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#c0c1ff]/10 border border-[#c0c1ff]/20 space-y-2">
            <div className="flex items-center gap-1.5 text-[#c0c1ff] font-medium">
              <Sparkles className="w-4 h-4 text-[#c0c1ff]" />
              <span>AI 会前智能准备</span>
            </div>
            <p className="text-[#c7c4d7] leading-relaxed text-[11px]">
              AI 助手已自动索引「产品设计方法论 4.0」与上一期会议备忘录，可立即生成 3 分钟会前预读速览。
            </p>
            <button
              onClick={() => {
                onGenerateBrief();
                onClose();
              }}
              className="w-full py-1.5 rounded-lg bg-[#c0c1ff] hover:bg-[#c0c1ff]/90 text-[#0B0E14] font-semibold text-xs transition-colors shadow"
            >
              在 AI 工作台中生成预读提纲
            </button>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] text-[#c7c4d7] hover:text-white hover:bg-white/5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#34D399]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已复制会议链接' : '复制腾讯会议号'}</span>
            </button>

            <a
              href={meeting.link}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#7bd0ff]/20 text-[#7bd0ff] border border-[#7bd0ff]/30 hover:bg-[#7bd0ff]/30 font-semibold transition-colors"
            >
              <span>立即入会</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
