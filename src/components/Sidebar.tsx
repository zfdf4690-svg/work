import React from 'react';
import { 
  LayoutDashboard, 
  CheckCircle2, 
  BookOpen, 
  FileText, 
  Settings, 
  Plus, 
  SlidersHorizontal,
  Bot,
  PanelLeftClose,
  PanelLeft,
  BookMarked,
  Layers
} from 'lucide-react';
import { NavTab } from '../types';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  pendingCount: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  feishuSynced: boolean;
  onOpenSpec: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  pendingCount,
  isCollapsed,
  onToggleCollapse,
  feishuSynced,
  onOpenSpec,
}) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: '工作台', icon: LayoutDashboard },
    { id: 'ai-assistant' as NavTab, label: 'AI 助手', icon: Bot, badge: '核心' },
    { id: 'knowledge' as NavTab, label: '知识库', icon: BookOpen },
    { id: 'docs' as NavTab, label: '文稿与文件', icon: FileText },
    { id: 'settings' as NavTab, label: '设置', icon: Settings },
  ];

  const recentProjects = [
    { name: '产品方案设计', color: 'bg-sky-400' },
    { name: '客户资料整理', color: 'bg-amber-400' },
    { name: 'AI 办公助手原型', color: 'bg-indigo-400' },
  ];

  return (
    <aside
      className={`h-full flex flex-col justify-between smoked-acrylic-dock shrink-0 z-30 transition-all duration-300 font-sans ${
        isCollapsed ? 'w-16 p-2.5' : 'w-60 p-3.5'
      }`}
    >
      <div className="space-y-4">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-1 pt-1">
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6366F1] via-[#8B5CF6] to-[#38BDF8] flex items-center justify-center shadow-lg shadow-[#6366F1]/25 border border-white/20 shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col truncate">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold tracking-tight text-white truncate">AI Assistant</span>
                  <span className="px-1.5 py-0.2 rounded bg-[#c0c1ff]/20 border border-[#c0c1ff]/30 text-[#c0c1ff] text-[10px] font-mono">
                    v1.0
                  </span>
                </div>
                <span className="text-[11px] text-[#908fa0] truncate">你的智能工作伙伴</span>
              </div>
            </div>
          )}

          {isCollapsed && (
            <div className="w-8 h-8 mx-auto rounded-xl bg-gradient-to-tr from-[#6366F1] via-[#8B5CF6] to-[#38BDF8] flex items-center justify-center shadow-lg shadow-[#6366F1]/25 border border-white/20">
              <Bot className="w-4 h-4 text-white" />
            </div>
          )}

          <button
            onClick={onToggleCollapse}
            className="text-[#908fa0] hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
            title={isCollapsed ? '展开侧栏 (⌘+B)' : '收起侧栏 (⌘+B)'}
          >
            {isCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Enterprise Sync Badge */}
        {!isCollapsed && (
          <div className="mx-0.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${feishuSynced ? 'bg-[#34D399]' : 'bg-[#908fa0]'} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${feishuSynced ? 'bg-[#34D399]' : 'bg-[#908fa0]'}`}></span>
              </span>
              <span className="text-[11px] text-[#c7c4d7]">飞书 · 企业已同步</span>
            </div>
            <span className="text-[10px] font-mono text-[#908fa0]">已就绪</span>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 transition-colors duration-150 group ${
                  isActive
                    ? 'bg-[#2a3244]/70 text-white font-medium border-l-2 border-[#c0c1ff] specular-border shadow-sm'
                    : 'text-[#c7c4d7] hover:text-white hover:bg-white/5'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <div className={`flex items-center gap-3 ${isCollapsed ? 'mx-auto' : ''}`}>
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#c0c1ff]' : 'text-[#908fa0] group-hover:text-white'}`} />
                  {!isCollapsed && <span className="text-[13px]">{item.label}</span>}
                </div>

                {!isCollapsed && (
                  <div className="flex items-center gap-1.5">
                    {item.id === 'dashboard' && isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#c0c1ff] shadow-sm shadow-[#c0c1ff]"></span>
                    )}
                    {item.badge && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#c0c1ff]/20 text-[#c0c1ff] border border-[#c0c1ff]/30">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Interactive Spec Document Callout */}
        <div className="pt-1">
          <button
            onClick={onOpenSpec}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-sky-500/10 border border-indigo-400/25 hover:border-indigo-400/50 text-[#c0c1ff] transition-all ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title="查看交互逻辑详细说明与响应式布局适配方案"
          >
            <Layers className="w-4 h-4 text-[#c0c1ff] shrink-0" />
            {!isCollapsed && (
              <div className="text-left flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-white truncate">交互与响应式方案</div>
                <div className="text-[10px] text-[#c0c1ff]/80 truncate">详细设计说明文档</div>
              </div>
            )}
          </button>
        </div>

        {/* Recent Projects Section */}
        {!isCollapsed && (
          <div className="pt-2 px-1">
            <div className="flex items-center justify-between text-[#908fa0] text-[11px] font-mono uppercase tracking-wider px-1.5 mb-1.5">
              <span>最近项目</span>
              <button 
                aria-label="新建项目" 
                className="hover:text-white transition-colors"
                title="新建项目"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-0.5">
              {recentProjects.map((p, i) => (
                <button
                  key={i}
                  className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[12px] text-[#c7c4d7] hover:text-white hover:bg-white/5 transition-colors group text-left"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${p.color} shrink-0`}></span>
                  <span className="truncate">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* User Profile Footer Card */}
      <div className="pt-3 border-t border-white/[0.08] mt-auto">
        <div className={`flex items-center justify-between p-2 rounded-xl bg-[#191c22]/80 border border-white/[0.08] hover:border-white/[0.14] transition-colors ${
          isCollapsed ? 'justify-center p-1.5' : ''
        }`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAGWqkXEaIZQk6Cdk3x31Kgsszmanl1PnzoxxIVfLGBmrcYH59vxL260pPUVihif-xAlm5eGVz9vap7PvuRP_x3Y4a5-heRm3yG1N_yGXhFxDF4I7Y3_bMc0wZ9WTyX9_C6X7A-MCDs1VrCNrRkxs6dO4R2ydPR3e1ouTA1Gs7AKuTDOkFoSKXE0iY1pRfhz9TVtd9r5BUZPXu7Z_TCEPBfiI_sNM5fpobJ0FAcw9idkQPdrFpD1J2IQJCaBWOHC2rSpBM"
                alt="张三"
                className="w-8 h-8 rounded-full object-cover ring-1 ring-white/20"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#34D399] ring-2 ring-[#11151F]"></span>
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <p className="text-[13px] font-semibold text-white truncate leading-snug">张三</p>
                <p className="text-[11px] text-[#908fa0] truncate leading-snug">产品总监 · 核心组</p>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button 
              aria-label="偏好设置" 
              className="text-[#908fa0] hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
              title="偏好调整"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
