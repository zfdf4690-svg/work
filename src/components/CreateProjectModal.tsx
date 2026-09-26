import React, { useState } from 'react';
import { X, Folder, FolderPlus, Check } from 'lucide-react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (project: { name: string; localPath: string }) => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject,
}) => {
  const [projectName, setProjectName] = useState('');
  const [localPath, setLocalPath] = useState('');
  const [pathSuggested, setPathSuggested] = useState(false);

  if (!isOpen) return null;

  const handleSelectFolder = () => {
    // Fill in a realistic local device workspace path
    const sanitized = projectName.trim() ? projectName.trim().toLowerCase().replace(/\s+/g, '-') : 'new-project';
    setLocalPath(`/Users/developer/Projects/${sanitized}`);
    setPathSuggested(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    onCreateProject({
      name: projectName.trim(),
      localPath: localPath.trim() || `/Users/developer/Projects/${projectName.trim().toLowerCase().replace(/\s+/g, '-')}`,
    });

    setProjectName('');
    setLocalPath('');
    setPathSuggested(false);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 font-sans"
      onClick={onClose}
    >
      {/* Modal Dialog Card matching Image 1 */}
      <div 
        className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 relative border border-gray-100 text-[#1E293B]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#1E293B] tracking-tight">
            创建项目
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#94A3B8] hover:text-[#475569] hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Field 1: 项目名称 */}
          <div className="space-y-1.5">
            <label className="block text-xs font-normal text-[#64748B]">
              项目名称
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-[#94A3B8] flex items-center pointer-events-none">
                <Folder className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="输入项目名称"
                autoFocus
                className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#E2E8F0] focus:border-[#70A5F5] focus:ring-2 focus:ring-[#70A5F5]/20 rounded-xl text-sm text-[#1E293B] placeholder:text-[#94A3B8] outline-none transition-all"
              />
            </div>
          </div>

          {/* Field 2: 当前设备本地工作目录 */}
          <div className="space-y-1.5">
            <label className="block text-xs font-normal text-[#64748B]">
              当前设备本地工作目录
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-[#94A3B8] flex items-center pointer-events-none">
                <FolderPlus className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={localPath}
                onChange={(e) => setLocalPath(e.target.value)}
                placeholder="添加本地文件夹"
                className="w-full pl-10 pr-20 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#70A5F5] focus:bg-white focus:ring-2 focus:ring-[#70A5F5]/20 rounded-xl text-sm text-[#1E293B] placeholder:text-[#94A3B8] outline-none transition-all font-mono text-xs"
              />
              <button
                type="button"
                onClick={handleSelectFolder}
                className="absolute right-2 px-2 py-1 rounded-lg text-xs text-[#64748B] hover:text-[#1E293B] hover:bg-gray-200/60 font-sans transition-colors cursor-pointer border border-[#E2E8F0] bg-white shadow-xs"
              >
                {pathSuggested ? '已设定' : '选择目录'}
              </button>
            </div>
            {localPath && (
              <p className="text-[11px] text-emerald-600 flex items-center gap-1 mt-1 pl-1">
                <Check className="w-3 h-3" />
                <span>已关联本地目录：{localPath}</span>
              </p>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-3 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-sm text-[#475569] font-medium transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!projectName.trim()}
              className="px-5 py-2 rounded-xl bg-[#70A5F5] hover:bg-[#5C93E6] disabled:opacity-50 disabled:cursor-not-allowed text-sm text-white font-medium shadow-sm transition-all cursor-pointer"
            >
              创建项目
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
