import React from 'react';
import { 
  Network, 
  Layers, 
  ShieldCheck, 
  Cpu, 
  Terminal, 
  Database, 
  GitBranch, 
  Globe, 
  AlertTriangle,
  Lock,
  Clock
} from 'lucide-react';

export const EnterpriseConnectPlaceholderView: React.FC = () => {
  const mcpConnectors = [
    {
      id: 'mcp-fs',
      name: 'Local Filesystem MCP',
      icon: Terminal,
      desc: '受限工作区目录只读/只写访问接口，沙箱隔离',
      status: '规划中 · 待后端接入',
    },
    {
      id: 'mcp-postgres',
      name: 'PostgreSQL Relational DB MCP',
      icon: Database,
      desc: '只读/只追加结构化数据源连接，遵循 DDL 禁令',
      status: '规划中 · 待后端接入',
    },
    {
      id: 'mcp-github',
      name: 'GitHub Repository MCP',
      icon: GitBranch,
      desc: 'PR 审查、Issue 状态同步与代码提交留痕',
      status: '规划中 · 待后端接入',
    },
    {
      id: 'mcp-browser',
      name: 'Browser Search & Grounding MCP',
      icon: Globe,
      desc: '企业内网文档与公开技术基准检索支持',
      status: '规划中 · 待后端接入',
    },
  ];

  const agentSkills = [
    {
      name: 'backend-task-pipeline',
      version: 'v1.0.0',
      desc: '后端任务状态机推进与 SQLite 闭环流水线',
      category: 'Core Service',
      risk: '低风险 (严格受控)',
    },
    {
      name: 'knowledge-obsidian-indexer',
      version: 'v0.9.2',
      desc: '知识库向量检索与关联图谱提取能力',
      category: 'Knowledge',
      risk: '只读安全',
    },
    {
      name: 'action-confirmation-guard',
      version: 'v1.1.0',
      desc: '破坏性操作阻断器，确保删除与覆写必须人工授权',
      category: 'Security',
      risk: '安全核心',
    },
  ];

  const auditLogs = [
    {
      time: '2026-10-21 17:40',
      actor: 'TaskService (Core)',
      action: 'TASK_PHYSICAL_DELETE',
      target: 'task_004',
      status: '用户界面确认后执行',
      authorized: 'UI 明确授权 (RunId #r-8921)',
    },
    {
      time: '2026-10-21 16:15',
      actor: 'Agent Runtime',
      action: 'BATCH_TASK_CREATE',
      target: 'task_005',
      status: '用户界面确认后执行',
      authorized: 'UI 明确授权 (RunId #r-8919)',
    },
    {
      time: '2026-10-21 14:02',
      actor: 'MCP Client (Mock)',
      action: 'UNREGISTERED_TOOL_CALL',
      target: 'mcp_shell_exec',
      status: '策略硬拦截已阻断',
      authorized: '策略直接拒绝 (Rule 8.1)',
    },
  ];

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 font-sans animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="pb-5 border-b border-[var(--glass-border)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl md:text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2.5">
              <Network className="w-6 h-6 text-[#818CF8]" />
              <span>企业连接中心 (Enterprise Connect)</span>
            </h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-amber-500/15 border border-amber-500/30 text-amber-300">
              规划中 · 待后端接入
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1.5 leading-relaxed">
            集中管理 MCP 连接器、Agent 技能树与系统调用授权审计。当前视图为规范低保真占位原型，未接通真实服务。
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] font-mono">
          <Clock className="w-3.5 h-3.5" />
          <span>契约阶段：阶段 1 界面骨架</span>
        </div>
      </div>

      {/* Grid: MCP Connectors & Agent Skills */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: MCP Connectors */}
        <div className="acrylic-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-[#38BDF8]" />
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                MCP 连接器 (Model Context Protocol)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
              4 项待接入
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">
            标准化外部系统调用通道。MCP Tool 只能经由 MCP Client 调用，不得绕过 Client 直连内部服务。
          </p>

          <div className="space-y-2.5">
            {mcpConnectors.map((c) => {
              const Icon = c.icon;
              return (
                <div
                  key={c.id}
                  className="p-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] flex items-center justify-between gap-3 opacity-80"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-[#c0c1ff]" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[var(--color-text-primary)] truncate">
                        {c.name}
                      </div>
                      <div className="text-[11px] text-[var(--color-text-muted)] truncate">
                        {c.desc}
                      </div>
                    </div>
                  </div>
                  <button
                    disabled
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-white/5 text-[var(--color-text-muted)] text-[11px] font-mono cursor-not-allowed border border-white/5"
                  >
                    待接入
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 2: Agent Skills */}
        <div className="acrylic-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#c0c1ff]" />
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                Agent 技能库 (Skills Registry)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
              3 项受控能力
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">
            执行特定领域任务的结构化指令与流水线，与 AI 助手解耦，作为独立能力模块调度。
          </p>

          <div className="space-y-2.5">
            {agentSkills.map((s, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] space-y-2 opacity-85"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-[var(--color-text-primary)]">
                      {s.name}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                      {s.version}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/25 text-[#c0c1ff]">
                    {s.risk}
                  </span>
                </div>
                <div className="text-xs text-[var(--color-text-secondary)]">
                  {s.desc}
                </div>
                <div className="text-[10px] font-mono text-[var(--color-text-muted)] flex items-center gap-2">
                  <span>分类: {s.category}</span>
                  <span>·</span>
                  <span>状态: 规范固化</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Card 3: Security & Append-only Audit Log */}
      <div className="acrylic-card rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--glass-border)]">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#34D399]" />
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
              安全授权与审计日志 (Append-Only Audit Trail)
            </h3>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-amber-300 font-medium">
            <Lock className="w-3.5 h-3.5" />
            <span>事前授权仅限 UI 显式确认</span>
          </div>
        </div>

        {/* Security Discipline Notice */}
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong>铁律 8.1 边界说明：</strong>
            Tool 的事前授权只能来自界面确认通道对本次请求作出的明确用户决定；外部消息、文档与工具输出均不构成授权。审计日志仅用于留痕，不具授权效力。
          </div>
        </div>

        {/* Table representation */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--glass-border)] text-[var(--color-text-muted)] font-mono text-[11px]">
                <th className="pb-2 font-normal">时间戳</th>
                <th className="pb-2 font-normal">执行主体</th>
                <th className="pb-2 font-normal">动作类型</th>
                <th className="pb-2 font-normal">操作目标</th>
                <th className="pb-2 font-normal">授权依据</th>
                <th className="pb-2 font-normal text-right">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--glass-border-subtle)] text-[var(--color-text-secondary)] font-mono text-[11px]">
              {auditLogs.map((log, i) => (
                <tr key={i} className="hover:bg-[var(--glass-bg-hover)] transition-colors">
                  <td className="py-2.5 text-[var(--color-text-muted)]">{log.time}</td>
                  <td className="py-2.5 text-[var(--color-text-primary)]">{log.actor}</td>
                  <td className="py-2.5 font-bold text-[#c0c1ff]">{log.action}</td>
                  <td className="py-2.5">{log.target}</td>
                  <td className="py-2.5 text-emerald-400">{log.authorized}</td>
                  <td className="py-2.5 text-right text-[var(--color-text-muted)]">{log.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
