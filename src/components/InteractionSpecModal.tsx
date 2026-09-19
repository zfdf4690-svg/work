import React, { useState } from 'react';
import { 
  X, 
  Layers, 
  Cpu, 
  Laptop, 
  Tablet, 
  Smartphone, 
  ShieldAlert, 
  CheckCircle2, 
  Workflow, 
  Sparkles, 
  Maximize2, 
  MousePointer, 
  Eye, 
  Palette,
  Terminal,
  ArrowRight,
  Database
} from 'lucide-react';

interface InteractionSpecModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InteractionSpecModal: React.FC<InteractionSpecModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'interaction' | 'responsive' | 'design-system'>('interaction');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div 
        className="w-full max-w-5xl max-h-[90vh] rounded-3xl bg-[#11151F] border border-white/[0.12] shadow-2xl flex flex-col overflow-hidden specular-card font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="h-16 px-6 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#6366F1] to-[#a855f7] flex items-center justify-center text-white shadow-md shadow-[#6366F1]/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
                <span>AI Work Assistant 设计规范与交互逻辑说明书</span>
                <span className="px-2 py-0.5 rounded-full bg-[#c0c1ff]/20 border border-[#c0c1ff]/30 text-[#c0c1ff] font-mono text-[10px]">
                  V2.0 Image 2 体系
                </span>
              </h2>
              <p className="text-[11px] text-[#908fa0]">
                融合架构设计图 (Image 1) 与深邃磨砂高光玻璃拟态 (Image 2) 的产品交互与响应式落地规范
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tabs switcher */}
            <div className="flex items-center bg-white/5 border border-white/[0.08] p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('interaction')}
                className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                  activeTab === 'interaction' 
                    ? 'bg-[#c0c1ff] text-[#0B0E14] font-semibold shadow' 
                    : 'text-[#908fa0] hover:text-white'
                }`}
              >
                1. 详细交互逻辑说明
              </button>
              <button
                onClick={() => setActiveTab('responsive')}
                className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                  activeTab === 'responsive' 
                    ? 'bg-[#c0c1ff] text-[#0B0E14] font-semibold shadow' 
                    : 'text-[#908fa0] hover:text-white'
                }`}
              >
                2. 响应式布局适配方案
              </button>
              <button
                onClick={() => setActiveTab('design-system')}
                className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                  activeTab === 'design-system' 
                    ? 'bg-[#c0c1ff] text-[#0B0E14] font-semibold shadow' 
                    : 'text-[#908fa0] hover:text-white'
                }`}
              >
                3. 高阶玻璃视觉规范
              </button>
            </div>

            <button 
              aria-label="关闭规范说明书"
              onClick={onClose} 
              className="p-1.5 rounded-xl text-[#908fa0] hover:text-white hover:bg-white/10 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 font-sans text-[#c7c4d7] text-xs md:text-sm leading-relaxed">
          
          {/* TAB 1: 交互逻辑详细说明 */}
          {activeTab === 'interaction' && (
            <div className="space-y-6">
              {/* Section 1: 核心链路闭环 */}
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                <div className="flex items-center gap-2 text-[#c0c1ff] font-semibold text-sm">
                  <Workflow className="w-4 h-4" />
                  <span>一、核心链路设计：「Conversation → Context → Agent → Tool → Result」</span>
                </div>
                <p className="text-[#c7c4d7]">
                  传统 AI 工具属于「一问一答」纯文本交互，而 AI Work Assistant 核心在于<strong>将 AI 深度融入真实的个人工作流程</strong>。
                </p>
                <div className="p-3 rounded-xl bg-black/40 border border-white/[0.08] font-mono text-xs text-[#c7c4d7] space-y-1">
                  <div className="text-[#c0c1ff] font-bold">// 工作闭环推进逻辑</div>
                  <div>1. 用户发起指令（工作台、快捷键 ⌘+J 或悬浮球）</div>
                  <div>2. 上下文绑定（自动匹配或手动指定：当前任务、关联知识库、参考文档）</div>
                  <div>3. 智能判断与决策（简单回答直接生成，复杂目标分流给相应 Skill/Agent）</div>
                  <div>4. 透明工具调用（Tool Calling 逐步展示，无技术黑盒噪点）</div>
                  <div>5. 关键操作授权（涉及写入任务、发消息、外部变更强制阻断确认）</div>
                  <div>6. 成果持久沉淀（写入 Task DB、回填至 Dashboard、同步企业端飞书）</div>
                </div>
              </div>

              {/* Section 2: AI 不主动打扰原则 */}
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                <div className="flex items-center gap-2 text-[#c0c1ff] font-semibold text-sm">
                  <ShieldAlert className="w-4 h-4" />
                  <span>二、「AI 不主动打扰」交互准则与状态设计</span>
                </div>
                <p className="text-[#c7c4d7]">
                  明确否定<strong>过度主动、持续后台监听屏幕并频繁弹窗打断用户思路</strong>的侵入式设计。
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-1.5">
                    <div className="font-semibold text-rose-300 flex items-center gap-1.5">
                      <span>✕ 严禁的交互模式（Banned Pattern）</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-[#c7c4d7] text-xs">
                      <li>用户打字或浏览时突然弹出气泡打断思考</li>
                      <li>未经授权在后台自动修改任务看板数据</li>
                      <li>在用户未主动提问时进行侵入式悬浮提示</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
                    <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
                      <span>✓ 规范的交互模式（Standard Pattern）</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-[#c7c4d7] text-xs">
                      <li>AI 常态保持「静默就绪 (Idle)」状态</li>
                      <li>建议以低对比度「卡片列表」静态安放在工作台次级区域</li>
                      <li>必须在用户主动点击「去执行」或输入指令后方可运转</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Section 3: Tool Calling 4态透明机制 */}
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                <div className="flex items-center gap-2 text-[#c0c1ff] font-semibold text-sm">
                  <Cpu className="w-4 h-4" />
                  <span>三、Tool Calling 4 态透明化与用户认知映射</span>
                </div>
                <p className="text-[#c7c4d7]">
                  Tool Calling 绝不向普通用户展示复杂的 JSON 报文或晦涩的技术参数，而必须翻译为<strong>明确的业务认知语义</strong>：
                </p>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs border border-white/[0.08] rounded-xl overflow-hidden">
                    <thead className="bg-white/5 text-[#908fa0]">
                      <tr>
                        <th className="p-2.5 border-b border-white/[0.08]">状态标识</th>
                        <th className="p-2.5 border-b border-white/[0.08]">UI 表现形态</th>
                        <th className="p-2.5 border-b border-white/[0.08]">用户业务认知</th>
                        <th className="p-2.5 border-b border-white/[0.08]">系统交互动作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <tr>
                        <td className="p-2.5 text-[#908fa0]">○ Pending</td>
                        <td className="p-2.5 text-[#908fa0]">灰色圆环，静态排队</td>
                        <td className="p-2.5">等待执行（前序任务未完成）</td>
                        <td className="p-2.5 text-[#908fa0]">阻塞或准备工具参数</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-[#c0c1ff]">◉ Running</td>
                        <td className="p-2.5 text-[#c0c1ff] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#c0c1ff] animate-ping"></span>
                          <span>紫色发光 Spinner</span>
                        </td>
                        <td className="p-2.5">正在读取/正在检索/分析中</td>
                        <td className="p-2.5 text-[#908fa0]">实时输出步骤细节日志</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-[#34D399]">✓ Success</td>
                        <td className="p-2.5 text-[#34D399]">翡翠绿勾，柔和渐变底色</td>
                        <td className="p-2.5">执行完成，产出具体依据</td>
                        <td className="p-2.5 text-[#908fa0]">折叠技术日志，展示摘要</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-rose-400">! Failed</td>
                        <td className="p-2.5 text-rose-400">玫瑰红警告，重试按钮</td>
                        <td className="p-2.5">执行异常（网络或鉴权失败）</td>
                        <td className="p-2.5 text-[#908fa0]">提供一键重新执行选项</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 4: Action Confirmation 机制 */}
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                <div className="flex items-center gap-2 text-[#c0c1ff] font-semibold text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>四、Action Confirmation（高危/写入操作用户确认）交互闭环</span>
                </div>
                <p className="text-[#c7c4d7]">
                  为彻底杜绝大模型在任务执行中的「幻觉性破坏」，确立强监管护栏规则：
                </p>
                <div className="p-3 rounded-xl bg-black/40 border border-white/[0.08] space-y-2 text-xs font-mono">
                  <div className="text-[#FBBF24] font-bold">强制阻断与二次确认触发矩阵：</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[#c7c4d7]">
                    <div>• 往 Task DB 创建、修改或删除任务</div>
                    <div>• 往飞书/企业微信发送外部工作沟通消息</div>
                    <div>• 覆盖或写入本地文档资料</div>
                    <div>• 变更企业级日程排期</div>
                  </div>
                  <div className="text-[#908fa0] border-t border-white/[0.08] pt-2 text-[11px]">
                    交互形式采用「内联结构化授权卡片」或「安全模态对话框」，以键值对（Key-Value）明确列示影响范围，提供「[取消] [确认创建]」双键闭环。
                  </div>
                </div>
              </div>

              {/* Section 5: Task 全局状态机与悬浮球桌面常驻边缘吸附 */}
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                <div className="flex items-center gap-2 text-[#c0c1ff] font-semibold text-sm">
                  <Database className="w-4 h-4" />
                  <span>五、Task 全局基础对象与 桌面边缘磁吸常驻 Floating Ball 架构</span>
                </div>
                <p className="text-[#c7c4d7]">
                  悬浮球（Floating Ball）独立于主窗口渲染树，作为<strong>系统桌面顶层常驻实体</strong>。当应用最小化或退入后台守护模式时，悬浮球持续常驻在屏幕边缘：
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs space-y-1.5">
                    <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>后台常驻与主窗口解耦 (Daemon Isolation)</span>
                    </div>
                    <p className="text-[#908fa0] text-[11px] leading-relaxed">
                      用户点击窗口最小化（Yellow Traffic Light / Cmd+M）或关闭时，主工作台进入后台轻量化守护，悬浮球保留在屏幕边缘，支持一键呼出快捷面板、勾选待办或恢复主窗口。
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs space-y-1.5">
                    <div className="text-[#c0c1ff] font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>桌面边缘自适应磁吸 (Magnetic Edge Snapping)</span>
                    </div>
                    <p className="text-[#908fa0] text-[11px] leading-relaxed">
                      支持在屏幕可视区域内任意自由拖拽。松手后系统根据视口中线自动磁吸贴靠左侧或右侧屏幕边缘，贴边后呈现半隐藏光学胶囊形态，悬停自然滑出。
                    </p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] font-mono text-xs space-y-2">
                  <div className="text-[#c0c1ff] font-bold">同步链路模型：</div>
                  <div className="flex items-center gap-2 flex-wrap text-[#c7c4d7]">
                    <span className="px-2 py-0.5 rounded bg-[#c0c1ff]/20 text-[#c0c1ff]">用户在边缘悬浮球快速勾选</span>
                    <span>→</span>
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">Task State Manager</span>
                    <span>→</span>
                    <span className="px-2 py-0.5 rounded bg-[#34D399]/20 text-[#34D399]">Dashboard 进度条动态微调</span>
                    <span>→</span>
                    <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">企业端飞书双向持久化</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 响应式布局适配方案 */}
          {activeTab === 'responsive' && (
            <div className="space-y-6">
              {/* Breakpoint matrix */}
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                <div className="flex items-center gap-2 text-[#c0c1ff] font-semibold text-sm">
                  <Maximize2 className="w-4 h-4" />
                  <span>一、四级响应式断点标准设计矩阵 (Responsive Breakpoints Matrix)</span>
                </div>
                <p className="text-[#c7c4d7]">
                  为满足现代办公场景中多显示器、超宽曲面屏、MacBook 笔记本、iPad 平板与紧急手机查询的需求，建立精准的自适应标准：
                </p>

                <div className="overflow-x-auto pt-1">
                  <table className="w-full text-left font-mono text-xs border border-white/[0.08] rounded-xl overflow-hidden">
                    <thead className="bg-white/5 text-[#908fa0]">
                      <tr>
                        <th className="p-2.5 border-b border-white/[0.08]">设备断点</th>
                        <th className="p-2.5 border-b border-white/[0.08]">视口范围</th>
                        <th className="p-2.5 border-b border-white/[0.08]">导航 Rail 形态</th>
                        <th className="p-2.5 border-b border-white/[0.08]">工作台栅格布局</th>
                        <th className="p-2.5 border-b border-white/[0.08]">AI Workspace 布局</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <tr>
                        <td className="p-2.5 text-white font-semibold flex items-center gap-1.5">
                          <Laptop className="w-3.5 h-3.5 text-[#c0c1ff]" />
                          <span>Desktop XL</span>
                        </td>
                        <td className="p-2.5 text-[#c0c1ff]">≥ 1440px</td>
                        <td className="p-2.5">常驻 240px 侧栏</td>
                        <td className="p-2.5 text-[#34D399]">3列标准卡片矩阵</td>
                        <td className="p-2.5">完整三栏（会话+工作区+上下文）</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-white font-semibold flex items-center gap-1.5">
                          <Laptop className="w-3.5 h-3.5 text-[#c0c1ff]" />
                          <span>Laptop LG</span>
                        </td>
                        <td className="p-2.5 text-[#c0c1ff]">1024px ~ 1439px</td>
                        <td className="p-2.5">可切换 64px 紧凑 Rail</td>
                        <td className="p-2.5 text-[#34D399]">3列紧凑或 2+1 自适应</td>
                        <td className="p-2.5">右侧 Context 面板采用可折叠抽屉</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-white font-semibold flex items-center gap-1.5">
                          <Tablet className="w-3.5 h-3.5 text-sky-400" />
                          <span>Tablet MD</span>
                        </td>
                        <td className="p-2.5 text-sky-300">768px ~ 1023px</td>
                        <td className="p-2.5">抽屉式收起 (Off-canvas)</td>
                        <td className="p-2.5 text-[#FBBF24]">2列流式网格，计划卡片跨行</td>
                        <td className="p-2.5">单栏聚焦对话，顶部提供上下文弹出层</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-white font-semibold flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5 text-rose-400" />
                          <span>Mobile SM</span>
                        </td>
                        <td className="p-2.5 text-rose-300">&lt; 768px</td>
                        <td className="p-2.5">底部导航栏 (Bottom Nav)</td>
                        <td className="p-2.5 text-rose-300">1列单行堆叠 (Card Stack)</td>
                        <td className="p-2.5">全屏移动端视图，虚拟键盘适配</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 2: 布局收缩与弹性降级 */}
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                <div className="flex items-center gap-2 text-[#c0c1ff] font-semibold text-sm">
                  <Workflow className="w-4 h-4" />
                  <span>二、关键功能模块的弹性自适应降级方案</span>
                </div>
                
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] space-y-1">
                    <div className="text-white font-semibold">1. 顶部指标卡 (今日任务 / 待办任务 / 今日计划)</div>
                    <p className="text-[#c7c4d7]">
                      • 桌面端：横向 1:1:1 平铺三等分。<br />
                      • 平板端：今日任务与待办任务 1:1 占据第一行，今日计划独占第二行全宽。<br />
                      • 移动端：完全纵向堆叠，高度由 150px 紧凑压缩为 110px，进度条吸顶。
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] space-y-1">
                    <div className="text-white font-semibold">2. 悬浮球 (Floating Ball) 空间规避与折叠</div>
                    <p className="text-[#c7c4d7]">
                      • 桌面端：固定在屏幕右下角 (bottom-6 right-6)，气泡宽度固定为 320px。<br />
                      • 移动端：悬浮球缩小为 40px 直径并置于底部导航栏右侧，展开时变为<strong>底部半屏拉伸抽屉 (Bottom Sheet)</strong>，留出 50% 顶部可视操作区。
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] space-y-1">
                    <div className="text-white font-semibold">3. 触控热区与鼠标微交互分离</div>
                    <p className="text-[#c7c4d7]">
                      • 桌面端保留 hover:border-white/20、cursor-pointer 以及键盘快捷键提示 (⌘K, ⌘J)。<br />
                      • 移动端与平板端所有按钮及勾选框最小热区严格保障 <strong>≥ 44px × 44px (WCAG 2.1 规范)</strong>，避免误触。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 极简视觉语言规范 */}
          {activeTab === 'design-system' && (
            <div className="space-y-6">
              {/* Section 1: 磨砂亚克力 */}
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                <div className="flex items-center gap-2 text-[#c0c1ff] font-semibold text-sm">
                  <Palette className="w-4 h-4" />
                  <span>一、高阶暗色玻璃拟态视觉语言规范（Strictly Aligned with Image 2）</span>
                </div>
                <p className="text-[#c7c4d7]">
                  本方案全面遵循 Image 2 所呈现的<strong>双层高光镜面与微磨砂玻璃质感 (Specular Acrylic Glassmorphism)</strong>，彻底摒弃传统沉重的纯黑或泛滥的高饱和紫蓝渐变，呈现高级、静谧且极具克制感的沉浸式暗色空间：
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-[#0B0E14] border border-white/[0.08] space-y-1">
                    <div className="text-white font-mono text-xs font-semibold">Space Base (底色)</div>
                    <div className="text-[#908fa0] text-[11px] font-mono">#0B0E14 ~ #10131A</div>
                    <p className="text-[#908fa0] text-[11px] mt-1">深邃底色，注入 3% 极冷暗蓝调，降低视疲劳。</p>
                  </div>

                  <div className="p-3.5 rounded-xl specular-card space-y-1">
                    <div className="text-white font-mono text-xs font-semibold">Specular Card (高光卡片)</div>
                    <div className="text-[#908fa0] text-[11px] font-mono">rgba(255,255,255,0.035)</div>
                    <p className="text-[#c7c4d7] text-[11px] mt-1">28px 高斯模糊 + 160% 饱和度，顶端 1px 极细微高光反光边界。</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.05] border border-[#c0c1ff]/40 space-y-1">
                    <div className="text-[#c0c1ff] font-mono text-xs font-semibold">Accent Lavender (品牌紫)</div>
                    <div className="text-[#908fa0] text-[11px] font-mono">#c0c1ff / #34D399 / #7bd0ff</div>
                    <p className="text-[#c7c4d7] text-[11px] mt-1">低饱和微弱辉光，仅在运行和重点高亮处点缀。</p>
                  </div>
                </div>
              </div>

              {/* Section 2: 字体排版系统 */}
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                <div className="flex items-center gap-2 text-[#c0c1ff] font-semibold text-sm">
                  <Terminal className="w-4 h-4" />
                  <span>二、排版系统与数据可读性规范</span>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/[0.08] font-mono text-xs space-y-1.5">
                  <div className="text-[#c0c1ff] font-bold">// 字体搭配规范</div>
                  <div>• 标题与主体界面：<strong>Plus Jakarta Sans</strong>（清晰、几何化、现代企业风范）</div>
                  <div>• 时间、代码、计数器：<strong>Space Grotesk / JetBrains Mono</strong>（等宽字形，强化数据精确感）</div>
                  <div>• 阶梯比率：基准字号 13px (Body)，次级 11px (Label/Meta)，大标题 24~28px (Hero)</div>
                  <div>• 行高：紧凑型 UI 保持在 1.4~1.6，保障高密度看板的数据信息吞吐能力</div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="h-14 px-6 border-t border-white/[0.08] flex items-center justify-between bg-white/[0.02] shrink-0 text-xs text-[#908fa0] font-mono">
          <span>AI Work Assistant Product Engineering Spec</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#c0c1ff] hover:bg-[#c0c1ff]/90 text-[#0B0E14] font-semibold shadow transition-colors"
          >
            返回工作台并体验
          </button>
        </div>
      </div>
    </div>
  );
};
