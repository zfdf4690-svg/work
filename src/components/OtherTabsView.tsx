import React from 'react';
import { NavTab, KnowledgeItem } from '../types';
import { BookOpen, FileText, Wrench, Settings, Cloud, Search, ArrowRight, ShieldCheck, Cpu } from 'lucide-react';

interface OtherTabsViewProps {
  activeTab: NavTab;
  knowledge: KnowledgeItem[];
  onOpenKnowledgeDetail: (item: KnowledgeItem) => void;
  onOpenSpec: () => void;
  feishuSynced: boolean;
  onToggleFeishu: () => void;
}

export const OtherTabsView: React.FC<OtherTabsViewProps> = ({
  activeTab,
  knowledge,
  onOpenKnowledgeDetail,
  onOpenSpec,
  feishuSynced,
  onToggleFeishu,
}) => {
  if (activeTab === 'knowledge') {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6 font-sans">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-[#7bd0ff]" />
              <span>企业与个人知识库 (Knowledge Base)</span>
            </h2>
            <p className="text-xs text-[#908fa0] mt-1">
              类似 Obsidian + AI Workspace，支持向量索引、关联图谱与会话动态注入
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#908fa0] font-mono">已索引 1,248 篇</span>
            <button
              onClick={onOpenSpec}
              className="px-3 py-1 rounded-xl bg-white/5 border border-white/[0.08] text-xs text-[#c0c1ff] hover:text-white"
            >
              查看架构方案
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {knowledge.map((item) => (
            <div
              key={item.id}
              onClick={() => onOpenKnowledgeDetail(item)}
              className="specular-card rounded-2xl p-5 cursor-pointer space-y-3 flex flex-col justify-between hover:border-white/[0.18] transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[#c0c1ff] px-2 py-0.5 rounded bg-[#c0c1ff]/15 border border-[#c0c1ff]/25">
                    {item.category}
                  </span>
                  <span className="text-[11px] font-mono text-[#908fa0]">{item.timeAgo}</span>
                </div>
                <h3 className="text-sm font-semibold text-white group-hover:text-[#c0c1ff] transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-[#908fa0] line-clamp-3 leading-relaxed">
                  {item.summary}
                </p>
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs text-[#c0c1ff]">
                <span>{item.readTime}</span>
                <span className="flex items-center gap-1">
                  <span>查看详情</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === 'docs') {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6 font-sans">
        <div className="pb-4 border-b border-white/[0.08]">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#FBBF24]" />
            <span>文稿与文件中心 (Documents & Files)</span>
          </h2>
          <p className="text-xs text-[#908fa0] mt-1">
            管理当前工作关联的 PRD 文档、设计规范图谱及会议纪要草稿
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { name: 'AI Work Assistant PRD_v1.0.pdf', size: '2.4 MB', time: '10 分钟前', ext: 'PDF' },
            { name: '产品架构与交互逻辑说明.docx', size: '840 KB', time: '1 小时前', ext: 'DOCX' },
            { name: '桌面端毛玻璃视觉规范_Image2.html', size: '1.2 MB', time: '刚才', ext: 'HTML' },
            { name: '腾讯会议方案评审议题.md', size: '18 KB', time: '今天上午', ext: 'MD' },
          ].map((file, idx) => (
            <div key={idx} className="specular-card rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-[#FBBF24]/20 text-[#FBBF24] font-mono text-[10px]">
                  {file.ext}
                </span>
                <span className="text-[11px] font-mono text-[#908fa0]">{file.size}</span>
              </div>
              <div className="text-xs font-semibold text-white truncate">{file.name}</div>
              <div className="text-[11px] text-[#908fa0] font-mono">更新于 {file.time}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === 'skills') {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6 font-sans">
        <div className="pb-4 border-b border-white/[0.08]">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wrench className="w-6 h-6 text-[#c0c1ff]" />
            <span>工具 / Agent Skills 注册表</span>
          </h2>
          <p className="text-xs text-[#908fa0] mt-1">
            作为复杂任务执行能力，AI 根据用户需求自主决定调用工具或 Agent 能力
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { name: 'Knowledge Synthesizer', desc: '读取参考文件并结构化提炼核心要点', badge: '活跃', calls: '142次' },
            { name: 'Competitive Analyst', desc: '分析头部竞品市场趋势并提取差异化矩阵', badge: '活跃', calls: '89次' },
            { name: 'Agenda & Memo Generator', desc: '对齐企业日程并自动填充标准会议四要素', badge: '活跃', calls: '312次' },
            { name: 'Feishu Task Synchronizer', desc: '经用户二次确认后向飞书多维表格与日程写入待办', badge: '企业就绪', calls: '520次' },
          ].map((s, idx) => (
            <div key={idx} className="specular-card rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <Cpu className="w-4 h-4 text-[#c0c1ff]" />
                  <span>{s.name}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-[#c0c1ff]/20 text-[#c0c1ff] font-mono text-[10px]">
                  {s.badge}
                </span>
              </div>
              <p className="text-xs text-[#c7c4d7] leading-relaxed">{s.desc}</p>
              <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-[#908fa0]">
                <span>累计调用：{s.calls}</span>
                <span className="text-[#34D399]">状态：已连通本地 Runtime</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Settings tab
  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6 font-sans">
      <div className="pb-4 border-b border-white/[0.08]">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-[#c7c4d7]" />
          <span>系统偏好与企业连接 (Settings)</span>
        </h2>
        <p className="text-xs text-[#908fa0] mt-1">
          管理飞书、企业微信同步配置以及 AI 交互行为策略
        </p>
      </div>

      <div className="space-y-4 text-xs">
        <div className="specular-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-white flex items-center gap-2">
                <Cloud className="w-4 h-4 text-[#7bd0ff]" />
                <span>飞书企业连接 (Feishu Enterprise Connect)</span>
              </div>
              <p className="text-[#908fa0]">
                同步多维表格、日历日程以及知识库文档索引
              </p>
            </div>
            <button
              onClick={onToggleFeishu}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                feishuSynced
                  ? 'bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30'
                  : 'bg-white/10 text-[#908fa0] border border-white/10'
              }`}
            >
              {feishuSynced ? '已连通 (点击断开)' : '已离线 (点击连接)'}
            </button>
          </div>
        </div>

        <div className="specular-card rounded-2xl p-5 space-y-3">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-white">AI 交互安全与隐私策略</div>
            <p className="text-[#908fa0]">
              严格遵循「AI 不主动打扰，重要操作需二次确认」规划准则
            </p>
          </div>
          <div className="space-y-2 pt-2 border-t border-white/[0.08] font-mono text-[#c7c4d7]">
            <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03]">
              <span>主动监听与侵入式气泡</span>
              <span className="text-[#F87171]">已禁用 (Disabled)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03]">
              <span>任务写入强制确认 (Action Confirmation)</span>
              <span className="text-[#34D399]">强制开启 (Strict)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03]">
              <span>视觉风格</span>
              <span className="text-[#c0c1ff]">高阶暗色玻璃拟态 (Image 2)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
