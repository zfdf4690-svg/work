import React, { useState, useMemo, useEffect } from 'react';
import { 
  Folder, 
  FolderOpen, 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  FilePlus, 
  FolderPlus, 
  ArrowUpDown, 
  ChevronsDownUp, 
  Search, 
  ArrowLeft, 
  ArrowRight, 
  BookOpen, 
  Edit3, 
  Columns, 
  MoreVertical, 
  Calendar, 
  Tag, 
  ExternalLink, 
  HelpCircle, 
  Settings, 
  Link2, 
  X, 
  Check, 
  Copy, 
  Sparkles,
  Share2,
  Trash2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { defaultNotes, initialFolderTree, ObsidianNote, FolderNode, NoteProperty } from '../mockObsidianNotes';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface KnowledgeObsidianViewProps {
  onOpenSpec?: () => void;
  feishuSynced?: boolean;
}

export const KnowledgeObsidianView: React.FC<KnowledgeObsidianViewProps> = ({
  onOpenSpec,
  feishuSynced = true,
}) => {
  // Notes state
  const [notes, setNotes] = useState<Record<string, ObsidianNote>>(defaultNotes);
  const [activeNoteId, setActiveNoteId] = useState<string>('note-2026-08-12');
  
  // Folder tree expansion state
  const [folderTree, setFolderTree] = useState<FolderNode[]>(initialFolderTree);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({
    'f-diary': true,
    'f-lark': true,
    'f-lark-mindmap': true,
  });

  // UI Modes: 'reading' (preview) | 'edit' (source editor) | 'split' (side-by-side)
  const [viewMode, setViewMode] = useState<'reading' | 'edit' | 'split'>('reading');

  // Search in left sidebar
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);

  // New tag / property inputs
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingProperty, setIsAddingProperty] = useState(false);
  const [newPropKey, setNewPropKey] = useState('');
  const [newPropVal, setNewPropVal] = useState('');

  // Copy feedback
  const [copied, setCopied] = useState(false);

  // Delete modal state
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    type: 'file' | 'folder';
    id: string;
    name: string;
  }>({
    isOpen: false,
    type: 'file',
    id: '',
    name: '',
  });

  // Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const currentNote: ObsidianNote = useMemo(() => {
    if (activeNoteId && notes[activeNoteId]) {
      return notes[activeNoteId];
    }
    const firstKey = Object.keys(notes)[0];
    if (firstKey && notes[firstKey]) {
      return notes[firstKey];
    }
    return {
      id: 'empty',
      title: '暂无笔记',
      folderPath: '知识库',
      updatedAt: '刚刚',
      properties: [],
      content: '# 知识库为空\n\n所有笔记已清理完毕。您可以点击左侧顶部「+」图标新建笔记。',
    };
  }, [notes, activeNoteId]);

  // Toggle folder open/close
  const toggleFolder = (folderId: string) => {
    setOpenFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  // Collapse or expand all folders
  const handleToggleCollapseAll = () => {
    const hasAnyOpen = Object.values(openFolders).some(v => v);
    if (hasAnyOpen) {
      setOpenFolders({});
    } else {
      const allOpen: Record<string, boolean> = {};
      const collectIds = (nodes: FolderNode[]) => {
        nodes.forEach(n => {
          allOpen[n.id] = true;
          if (n.children) collectIds(n.children);
        });
      };
      collectIds(folderTree);
      setOpenFolders(allOpen);
    }
  };

  // Create new note
  const handleCreateNewNote = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const newId = `note-${Date.now()}`;
    const newNote: ObsidianNote = {
      id: newId,
      title: `${todayStr}-新笔记`,
      folderPath: '日记',
      updatedAt: '刚刚',
      properties: [
        { id: `p-${Date.now()}-1`, key: 'date', type: 'date', value: todayStr.replace(/-/g, '/') },
        { id: `p-${Date.now()}-2`, key: 'tags', type: 'tags', value: ['日记', '知识沉淀'] },
      ],
      content: `## 📅 ${todayStr}\n\n## 📋 主要要点\n\n- 在此编辑 Markdown 笔记内容...\n\n| 序号 | 模块 | 说明 |\n| :--- | :--- | :--- |\n| 1 | 核心功能 | 已就绪 |\n`,
    };

    setNotes(prev => ({ ...prev, [newId]: newNote }));
    setActiveNoteId(newId);
    setOpenFolders(prev => ({ ...prev, 'f-diary': true }));
    setViewMode('edit');
  };

  // Update current note content
  const handleContentChange = (newContent: string) => {
    setNotes(prev => ({
      ...prev,
      [activeNoteId]: {
        ...prev[activeNoteId],
        content: newContent,
        updatedAt: '刚刚',
      },
    }));
  };

  // Update note title
  const handleTitleChange = (newTitle: string) => {
    setNotes(prev => ({
      ...prev,
      [activeNoteId]: {
        ...prev[activeNoteId],
        title: newTitle,
      },
    }));
  };

  // Remove tag
  const handleRemoveTag = (tagToRemove: string) => {
    setNotes(prev => {
      const current = prev[activeNoteId];
      if (!current) return prev;
      const updatedProps = current.properties.map(prop => {
        if (prop.key === 'tags' && Array.isArray(prop.value)) {
          return {
            ...prop,
            value: prop.value.filter(t => t !== tagToRemove),
          };
        }
        return prop;
      });
      return {
        ...prev,
        [activeNoteId]: {
          ...current,
          properties: updatedProps,
        },
      };
    });
  };

  // Add tag
  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagInput.trim()) return;
    const cleanTag = newTagInput.trim();

    setNotes(prev => {
      const current = prev[activeNoteId];
      if (!current) return prev;

      let found = false;
      const updatedProps = current.properties.map(prop => {
        if (prop.key === 'tags' && Array.isArray(prop.value)) {
          found = true;
          if (!prop.value.includes(cleanTag)) {
            return { ...prop, value: [...prop.value, cleanTag] };
          }
        }
        return prop;
      });

      if (!found) {
        updatedProps.push({
          id: `p-${Date.now()}`,
          key: 'tags',
          type: 'tags',
          value: [cleanTag],
        });
      }

      return {
        ...prev,
        [activeNoteId]: {
          ...current,
          properties: updatedProps,
        },
      };
    });

    setNewTagInput('');
    setIsAddingTag(false);
  };

  // Add custom property
  const handleAddCustomProperty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPropKey.trim()) return;

    const newProp: NoteProperty = {
      id: `p-${Date.now()}`,
      key: newPropKey.trim(),
      type: newPropVal.startsWith('http') ? 'link' : 'text',
      value: newPropVal.trim(),
    };

    setNotes(prev => ({
      ...prev,
      [activeNoteId]: {
        ...prev[activeNoteId],
        properties: [...(prev[activeNoteId]?.properties || []), newProp],
      },
    }));

    setNewPropKey('');
    setNewPropVal('');
    setIsAddingProperty(false);
  };

  // Remove property
  const handleRemoveProperty = (propId: string) => {
    setNotes(prev => ({
      ...prev,
      [activeNoteId]: {
        ...prev[activeNoteId],
        properties: (prev[activeNoteId]?.properties || []).filter(p => p.id !== propId),
      },
    }));
  };

  // Prompt delete a note (opens custom alert modal)
  const promptDeleteNote = (noteId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const noteToDelete = notes[noteId];
    const title = noteToDelete?.title || noteId.replace('note-', '');
    setDeleteModalState({
      isOpen: true,
      type: 'file',
      id: noteId,
      name: `${title}.md`,
    });
  };

  // Prompt delete a folder (opens custom alert modal)
  const promptDeleteFolder = (folderId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const findFolder = (nodes: FolderNode[]): FolderNode | undefined => {
      for (const node of nodes) {
        if (node.id === folderId) return node;
        if (node.children) {
          const res = findFolder(node.children);
          if (res) return res;
        }
      }
      return undefined;
    };
    const folder = findFolder(folderTree);
    const folderName = folder?.name || '选定文件夹';
    setDeleteModalState({
      isOpen: true,
      type: 'folder',
      id: folderId,
      name: folderName,
    });
  };

  // Execute actual deletion after user confirmation in the modal
  const handleConfirmDelete = () => {
    const { type, id, name } = deleteModalState;

    if (type === 'file') {
      const targetNoteId = id;
      
      // 1. Remove from notes dictionary
      setNotes(prev => {
        const next = { ...prev };
        delete next[targetNoteId];
        return next;
      });

      // 2. Remove from folderTree
      const removeFromTree = (nodes: FolderNode[]): FolderNode[] => {
        return nodes.map(node => {
          const updatedNotes = (node.notes || []).filter(nid => nid !== targetNoteId);
          const updatedChildren = node.children ? removeFromTree(node.children) : undefined;
          return {
            ...node,
            notes: updatedNotes,
            children: updatedChildren,
          };
        });
      };
      setFolderTree(prev => removeFromTree(prev));

      // 3. Switch activeNoteId if deleting current active note
      if (activeNoteId === targetNoteId) {
        const remainingNotesInDict = Object.keys(notes).filter(nid => nid !== targetNoteId);
        if (remainingNotesInDict.length > 0) {
          setActiveNoteId(remainingNotesInDict[0]);
        } else {
          setActiveNoteId('');
        }
      }
      showToast(`已成功删除笔记「${name}」`);
    } else if (type === 'folder') {
      const targetFolderId = id;

      // 1. Collect all notes in this folder and subfolders
      const collectNotesInFolder = (nodes: FolderNode[]): string[] => {
        const acc: string[] = [];
        for (const node of nodes) {
          if (node.id === targetFolderId) {
            if (node.notes) acc.push(...node.notes);
            const collectSub = (children?: FolderNode[]) => {
              if (!children) return;
              for (const c of children) {
                if (c.notes) acc.push(...c.notes);
                collectSub(c.children);
              }
            };
            collectSub(node.children);
            break;
          }
          if (node.children) {
            acc.push(...collectNotesInFolder(node.children));
          }
        }
        return acc;
      };

      const notesToDelete = collectNotesInFolder(folderTree);

      // 2. Remove notes in folder from notes dictionary
      setNotes(prev => {
        const next = { ...prev };
        notesToDelete.forEach(nid => {
          delete next[nid];
        });
        return next;
      });

      // 3. Remove folder node from tree
      const removeFolderFromTree = (nodes: FolderNode[]): FolderNode[] => {
        return nodes
          .filter(n => n.id !== targetFolderId)
          .map(n => ({
            ...n,
            children: n.children ? removeFolderFromTree(n.children) : undefined,
          }));
      };

      setFolderTree(prev => {
        const updated = removeFolderFromTree(prev);
        // If active note was in deleted folder, switch
        if (notesToDelete.includes(activeNoteId)) {
          const collectAllNotes = (nds: FolderNode[]): string[] => {
            const acc: string[] = [];
            for (const n of nds) {
              if (n.notes) acc.push(...n.notes);
              if (n.children) acc.push(...collectAllNotes(n.children));
            }
            return acc;
          };
          const remaining = collectAllNotes(updated);
          if (remaining.length > 0) {
            setActiveNoteId(remaining[0]);
          } else {
            setActiveNoteId('');
          }
        }
        return updated;
      });

      showToast(`已成功清理文件夹「${name}」及所属文件`);
    }
  };

  // Copy raw markdown
  const handleCopyMarkdown = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(currentNote.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Calculate statistics
  const wordCount = useMemo(() => {
    const text = currentNote.content.replace(/[#*`|\-\n]/g, ' ').trim();
    return text.length;
  }, [currentNote.content]);

  // Breadcrumb display
  const breadcrumb = `${currentNote.folderPath} / ${currentNote.title}`;

  // Recursive folder node renderer
  const renderFolderNode = (node: FolderNode, depth = 0) => {
    const isOpen = !!openFolders[node.id];
    const hasChildren = (node.children && node.children.length > 0) || (node.notes && node.notes.length > 0);

    return (
      <div key={node.id} className="select-none font-sans text-xs">
        {/* Folder Header Row */}
        <div
          onClick={() => toggleFolder(node.id)}
          style={{ paddingLeft: `${8 + depth * 14}px` }}
          className="group flex items-center justify-between py-1 px-2 rounded-md text-[#8c8ea3] hover:text-[#e1e2eb] hover:bg-white/[0.04] cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
              {isOpen ? (
                <ChevronDown className="w-3 h-3 text-[#8c8ea3]" />
              ) : (
                <ChevronRight className="w-3 h-3 text-[#8c8ea3]" />
              )}
            </span>
            <span className="truncate tracking-tight text-[12px] font-medium text-[#c7c9dc] group-hover:text-white">
              {node.name}
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => promptDeleteFolder(node.id, e)}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/20 text-[#8c8ea3] hover:text-red-400 transition-all ml-1 shrink-0 cursor-pointer"
            title="删除此文件夹"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>

        {/* Folder Children (Subfolders & Notes) */}
        {isOpen && (
          <div className="space-y-0.5 mt-0.5">
            {/* Subfolders */}
            {node.children && node.children.map(child => renderFolderNode(child, depth + 1))}

            {/* Note items in this folder */}
            {node.notes && node.notes.map(noteKey => {
              const note = notes[noteKey] || {
                id: noteKey,
                title: noteKey.replace('note-', ''),
                folderPath: node.name,
                updatedAt: '',
                properties: [],
                content: '',
              };
              const isActive = activeNoteId === note.id;

              // Filter by search query if present
              if (searchQuery.trim()) {
                const match = note.title.toLowerCase().includes(searchQuery.toLowerCase());
                if (!match) return null;
              }

              return (
                <div
                  key={note.id}
                  onClick={() => setActiveNoteId(note.id)}
                  style={{ paddingLeft: `${24 + depth * 14}px` }}
                  className={`group flex items-center justify-between py-1 px-2.5 rounded-md cursor-pointer transition-all ${
                    isActive
                      ? 'bg-[#2A2E3D]/80 text-white font-medium shadow-sm'
                      : 'text-[#8c8ea3] hover:text-[#f1f2f8] hover:bg-white/[0.03]'
                  }`}
                >
                  <span className="truncate text-[12px] tracking-tight">
                    {note.title}
                  </span>
                  <div className="flex items-center gap-1 shrink-0 ml-1.5">
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#8083ff] shadow-[0_0_6px_#8083ff]"></span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => promptDeleteNote(note.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/20 text-[#8c8ea3] hover:text-red-400 transition-all cursor-pointer"
                      title="删除此文件"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-1 w-full overflow-hidden bg-[#0A0D14] text-[#E2E4ED] font-sans">
      {/* 1. Left Sidebar: Obsidian Project / File Explorer (左侧项目栏) */}
      <aside className="w-64 sm:w-72 h-full flex flex-col bg-[#10131B] border-r border-white/[0.08] shrink-0 select-none">
        {/* Obsidian-Style Top Action Bar */}
        <div className="h-10 px-3 flex items-center justify-between border-b border-white/[0.06] text-[#8c8ea3]">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCreateNewNote}
              className="p-1 rounded hover:bg-white/[0.08] hover:text-white transition-colors cursor-pointer"
              title="新建笔记"
            >
              <FilePlus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                const name = prompt('请输入新文件夹名称：', '新分类');
                if (name && name.trim()) {
                  const newFolder: FolderNode = {
                    id: `f-${Date.now()}`,
                    name: name.trim(),
                    path: name.trim(),
                    isOpen: true,
                    notes: [],
                  };
                  setFolderTree(prev => [...prev, newFolder]);
                }
              }}
              className="p-1 rounded hover:bg-white/[0.08] hover:text-white transition-colors cursor-pointer"
              title="新建文件夹"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                // Reverse folder order
                setFolderTree(prev => [...prev].reverse());
              }}
              className="p-1 rounded hover:bg-white/[0.08] hover:text-white transition-colors cursor-pointer"
              title="更改排序顺序"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleToggleCollapseAll}
              className="p-1 rounded hover:bg-white/[0.08] hover:text-white transition-colors cursor-pointer"
              title="全部折叠 / 展开"
            >
              <ChevronsDownUp className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowSearchInput(prev => !prev)}
              className={`p-1 rounded hover:bg-white/[0.08] hover:text-white transition-colors cursor-pointer ${
                showSearchInput ? 'text-[#c0c1ff] bg-white/[0.06]' : ''
              }`}
              title="搜索知识文件"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Search Input */}
        {showSearchInput && (
          <div className="p-2 border-b border-white/[0.06] bg-white/[0.02]">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索笔记文件名..."
                className="w-full h-7 pl-7 pr-2 rounded bg-white/[0.05] border border-white/[0.08] text-xs text-white placeholder:text-[#8c8ea3] outline-none focus:border-[#8083ff]/50"
                autoFocus
              />
              <Search className="w-3 h-3 text-[#8c8ea3] absolute left-2.5 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-[#8c8ea3] hover:text-white absolute right-2 top-1/2 -translate-y-1/2"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        )}

        {/* File Tree Hierarchy */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
          {folderTree.map((node) => renderFolderNode(node))}
        </div>

        {/* Obsidian Left Footer (Vault name, Help & Settings) */}
        <div className="h-10 px-3 flex items-center justify-between border-t border-white/[0.06] text-[#8c8ea3] text-xs bg-[#0D1017]">
          <div className="flex items-center gap-1.5 text-[#c7c9dc] font-mono text-[11px] truncate">
            <BookOpen className="w-3.5 h-3.5 text-[#8083ff]" />
            <span className="truncate">knowledge base</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onOpenSpec}
              className="p-1 rounded hover:bg-white/[0.08] hover:text-white transition-colors cursor-pointer"
              title="知识库帮助与系统规范"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              className="p-1 rounded hover:bg-white/[0.08] hover:text-white transition-colors cursor-pointer"
              title="库设置"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Right Pane: Markdown Editor / Live Preview Area (右侧MD编辑区) */}
      <main className="flex-1 flex flex-col h-full bg-[#0D1018] overflow-hidden">
        {/* Top Header / Breadcrumb Bar */}
        <header className="h-10 px-4 flex items-center justify-between border-b border-white/[0.06] bg-[#0E121B]/80 backdrop-blur-xl shrink-0">
          {/* Left: Navigation arrows & breadcrumbs */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-0.5 text-[#8c8ea3]">
              <button 
                type="button"
                className="p-1 rounded hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer disabled:opacity-40"
                title="后退"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button 
                type="button"
                className="p-1 rounded hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer disabled:opacity-40"
                title="前进"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="text-xs font-mono text-[#8c8ea3] truncate flex items-center gap-1.5 ml-1">
              <span className="text-[#c7c9dc] truncate">{breadcrumb}</span>
            </div>
          </div>

          {/* Right: View Mode Toggle & Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Mode Switcher Buttons */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs">
              <button
                type="button"
                onClick={() => setViewMode('reading')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'reading'
                    ? 'bg-[#c0c1ff] text-[#0B0E14] font-semibold shadow-sm'
                    : 'text-[#8c8ea3] hover:text-white'
                }`}
                title="阅读模式 (实时渲染)"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="text-[11px] hidden sm:inline">阅读</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('edit')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'edit'
                    ? 'bg-[#c0c1ff] text-[#0B0E14] font-semibold shadow-sm'
                    : 'text-[#8c8ea3] hover:text-white'
                }`}
                title="源码编辑模式"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="text-[11px] hidden sm:inline">源码</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'split'
                    ? 'bg-[#c0c1ff] text-[#0B0E14] font-semibold shadow-sm'
                    : 'text-[#8c8ea3] hover:text-white'
                }`}
                title="双栏分屏模式 (左编辑，右预览)"
              >
                <Columns className="w-3.5 h-3.5" />
                <span className="text-[11px] hidden md:inline">分屏</span>
              </button>
            </div>

            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="p-1.5 rounded-lg text-[#8c8ea3] hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="复制 Markdown 源码"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* Delete Note Button */}
            <button
              type="button"
              onClick={() => promptDeleteNote(activeNoteId)}
              className="p-1.5 rounded-lg text-[#8c8ea3] hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              title="删除当前笔记"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* More Menu */}
            <button
              type="button"
              className="p-1.5 rounded-lg text-[#8c8ea3] hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="更多选项"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main Document Content Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
          <div className="w-full max-w-4xl mx-auto px-6 sm:px-12 py-8 flex-1 flex flex-col space-y-6">
            {/* 1. Large Document H1 Title (Editable in Obsidian style) */}
            <div className="group">
              <input
                type="text"
                value={currentNote.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-2xl sm:text-3xl font-extrabold text-white tracking-tight placeholder:text-[#8c8ea3]"
                placeholder="无标题笔记..."
              />
            </div>

            {/* 2. Obsidian 笔记属性 (Frontmatter Properties Block - Screenshot Replication) */}
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3 font-sans text-xs">
              <div className="flex items-center justify-between text-[#8c8ea3] pb-1 border-b border-white/[0.04]">
                <span className="font-medium text-[11px] text-[#8c8ea3]">笔记属性</span>
                <span className="text-[10px] font-mono">YAML Frontmatter</span>
              </div>

              {/* Render Properties Rows */}
              <div className="space-y-2.5">
                {currentNote.properties.map((prop) => (
                  <div key={prop.id} className="flex flex-col sm:flex-row sm:items-center gap-2 group">
                    {/* Property Key */}
                    <div className="flex items-center gap-1.5 w-28 shrink-0 text-[#8c8ea3]">
                      {prop.key === 'date' && <Calendar className="w-3.5 h-3.5 text-[#8c8ea3]" />}
                      {prop.key === 'tags' && <Tag className="w-3.5 h-3.5 text-[#8c8ea3]" />}
                      {prop.type === 'link' && <ExternalLink className="w-3.5 h-3.5 text-[#8c8ea3]" />}
                      <span className="font-mono text-[11px] text-[#8c8ea3]">{prop.key}</span>
                    </div>

                    {/* Property Value Rendering */}
                    <div className="flex-1 flex items-center flex-wrap gap-1.5">
                      {prop.key === 'date' && (
                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[#c7c9dc] font-mono text-[11px]">
                          <Calendar className="w-3 h-3 text-[#c0c1ff]" />
                          <span>{String(prop.value)}</span>
                          <Link2 className="w-3 h-3 text-[#8c8ea3] cursor-pointer hover:text-white ml-1" />
                        </div>
                      )}

                      {prop.key === 'tags' && Array.isArray(prop.value) && (
                        <div className="flex items-center flex-wrap gap-1.5">
                          {prop.value.map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#c0c1ff]/15 border border-[#c0c1ff]/25 text-[#c0c1ff] text-[11px] font-medium"
                            >
                              <span>{t}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(t)}
                                className="hover:text-white transition-colors cursor-pointer text-xs"
                                title="移除标签"
                              >
                                ×
                              </button>
                            </span>
                          ))}

                          {isAddingTag ? (
                            <form onSubmit={handleAddTag} className="inline-flex items-center gap-1">
                              <input
                                type="text"
                                value={newTagInput}
                                onChange={(e) => setNewTagInput(e.target.value)}
                                placeholder="输入标签名..."
                                className="h-6 px-2 rounded-lg bg-white/[0.06] border border-[#c0c1ff]/40 text-xs text-white outline-none w-24"
                                autoFocus
                              />
                              <button
                                type="submit"
                                className="px-1.5 py-0.5 rounded bg-[#c0c1ff] text-[#0B0E14] text-[10px] font-bold"
                              >
                                确定
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsAddingTag(false)}
                                className="text-[#8c8ea3] hover:text-white text-xs px-1"
                              >
                                取消
                              </button>
                            </form>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setIsAddingTag(true)}
                              className="px-2 py-0.5 rounded-lg border border-dashed border-white/20 text-[#8c8ea3] hover:text-white hover:border-white/40 transition-colors text-[10px]"
                            >
                              + 添加标签
                            </button>
                          )}
                        </div>
                      )}

                      {prop.type === 'link' && typeof prop.value === 'string' && (
                        <a
                          href={prop.value}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#8083ff] hover:underline flex items-center gap-1 text-[11px] font-mono break-all group-hover:text-[#c0c1ff]"
                        >
                          <span className="truncate max-w-md">{prop.value}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      )}

                      {prop.type === 'text' && typeof prop.value === 'string' && (
                        <span className="text-[#c7c9dc] font-mono text-[11px]">
                          {prop.value}
                        </span>
                      )}

                      {/* Remove custom property button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveProperty(prop.id)}
                        className="opacity-0 group-hover:opacity-100 text-[#8c8ea3] hover:text-[#F87171] transition-opacity ml-auto text-xs p-1"
                        title="删除该属性"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add new property form / trigger */}
                {isAddingProperty ? (
                  <form onSubmit={handleAddCustomProperty} className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.08] flex items-center gap-2">
                    <input
                      type="text"
                      value={newPropKey}
                      onChange={(e) => setNewPropKey(e.target.value)}
                      placeholder="属性名称 (如 author)"
                      className="h-7 px-2 rounded bg-white/[0.05] border border-white/[0.10] text-xs text-white outline-none w-32"
                      autoFocus
                    />
                    <input
                      type="text"
                      value={newPropVal}
                      onChange={(e) => setNewPropVal(e.target.value)}
                      placeholder="属性值或链接..."
                      className="flex-1 h-7 px-2 rounded bg-white/[0.05] border border-white/[0.10] text-xs text-white outline-none"
                    />
                    <button
                      type="submit"
                      className="h-7 px-2.5 rounded bg-[#c0c1ff] text-[#0B0E14] text-xs font-semibold shrink-0"
                    >
                      保存
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingProperty(false)}
                      className="text-[#8c8ea3] hover:text-white text-xs px-1.5"
                    >
                      取消
                    </button>
                  </form>
                ) : (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingProperty(true)}
                      className="text-[11px] text-[#8c8ea3] hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>+ 添加笔记属性</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Markdown Editor / Live Render Body */}
            {viewMode === 'reading' && (
              <div className="markdown-body text-[#e2e4ed] leading-relaxed text-sm space-y-4">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-2xl font-bold text-white tracking-tight pb-2 border-b border-white/[0.08] mt-6 mb-3">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-lg sm:text-xl font-semibold text-white tracking-tight mt-6 mb-2 flex items-center gap-2">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-base font-semibold text-[#f1f2f8] mt-4 mb-2">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p className="text-sm leading-relaxed text-[#c7c9dc] mb-3 font-normal">
                        {children}
                      </p>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-4 rounded-xl border border-white/[0.12] bg-white/[0.02]">
                        <table className="w-full text-left text-xs border-collapse">
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead className="bg-white/[0.06] border-b border-white/[0.10] text-[#c0c1ff] font-semibold">
                        {children}
                      </thead>
                    ),
                    tbody: ({ children }) => (
                      <tbody className="divide-y divide-white/[0.06] text-[#e1e2eb]">
                        {children}
                      </tbody>
                    ),
                    tr: ({ children }) => (
                      <tr className="hover:bg-white/[0.03] transition-colors">
                        {children}
                      </tr>
                    ),
                    th: ({ children }) => (
                      <th className="px-4 py-2.5 font-mono text-[11px] font-semibold text-white">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="px-4 py-2.5 text-xs text-[#d1d2e0]">
                        {children}
                      </td>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="my-4 p-3.5 rounded-xl border-l-4 border-[#8083ff] bg-[#8083ff]/10 text-xs text-[#d7d8f5] leading-relaxed">
                        {children}
                      </blockquote>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside space-y-1.5 my-2 text-xs text-[#c7c9dc] pl-2">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside space-y-1.5 my-2 text-xs text-[#c7c9dc] pl-2">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li className="leading-relaxed">
                        {children}
                      </li>
                    ),
                    hr: () => <hr className="my-6 border-white/[0.08]" />,
                    code: ({ children }) => (
                      <code className="px-1.5 py-0.5 rounded bg-white/[0.08] text-[#c0c1ff] font-mono text-xs border border-white/[0.06]">
                        {children}
                      </code>
                    ),
                  }}
                >
                  {currentNote.content}
                </ReactMarkdown>
              </div>
            )}

            {viewMode === 'edit' && (
              <div className="flex-1 flex flex-col space-y-2">
                <div className="text-[11px] font-mono text-[#8c8ea3] flex items-center justify-between">
                  <span>Markdown 源码编辑 (支持 GFM 语法与 Obsidian 内部链接)</span>
                  <span className="text-emerald-400">● 实时自动保存</span>
                </div>
                <textarea
                  value={currentNote.content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="输入 Markdown 源码..."
                  className="w-full flex-1 min-h-[380px] p-4 rounded-xl bg-white/[0.03] border border-white/[0.10] text-sm text-[#f1f2f8] font-mono leading-relaxed outline-none focus:border-[#8083ff]/50 resize-y"
                  spellCheck={false}
                />
              </div>
            )}

            {viewMode === 'split' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                {/* Left: Editor */}
                <div className="flex flex-col space-y-2">
                  <span className="text-[11px] font-mono text-[#8c8ea3]">Markdown 源码</span>
                  <textarea
                    value={currentNote.content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    className="w-full h-full min-h-[380px] p-3 rounded-xl bg-white/[0.03] border border-white/[0.10] text-xs text-[#f1f2f8] font-mono leading-relaxed outline-none focus:border-[#8083ff]/50 resize-none"
                    spellCheck={false}
                  />
                </div>

                {/* Right: Real-time Live Preview */}
                <div className="flex flex-col space-y-2">
                  <span className="text-[11px] font-mono text-[#8c8ea3]">实时预览</span>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] h-full min-h-[380px] overflow-y-auto custom-scrollbar">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ children }) => <h1 className="text-xl font-bold text-white mb-2">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-base font-semibold text-white mt-4 mb-2">{children}</h2>,
                        p: ({ children }) => <p className="text-xs text-[#c7c9dc] mb-2">{children}</p>,
                        table: ({ children }) => <table className="w-full text-left text-xs border border-white/10 my-2">{children}</table>,
                        th: ({ children }) => <th className="p-1.5 bg-white/10 font-mono text-[10px] text-white border border-white/10">{children}</th>,
                        td: ({ children }) => <td className="p-1.5 text-xs text-[#d1d2e0] border border-white/10">{children}</td>,
                        blockquote: ({ children }) => <blockquote className="p-2 border-l-2 border-[#8083ff] bg-[#8083ff]/10 text-xs my-2">{children}</blockquote>,
                        ul: ({ children }) => <ul className="list-disc list-inside text-xs pl-1">{children}</ul>,
                        li: ({ children }) => <li className="text-xs">{children}</li>,
                      }}
                    >
                      {currentNote.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. Obsidian Bottom Status Bar (底部状态栏) */}
        <footer className="h-6 px-4 flex items-center justify-between border-t border-white/[0.06] bg-[#0A0D14] text-[11px] font-mono text-[#8c8ea3] shrink-0 select-none">
          <div className="flex items-center gap-4">
            <span>{currentNote.title}.md</span>
            <span>{wordCount} 字符</span>
            <span>0 条反向链接</span>
          </div>

          <div className="flex items-center gap-3 text-[10px]">
            {feishuSynced ? (
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>飞书多维表格双向同步正常</span>
              </span>
            ) : (
              <span className="text-[#8c8ea3]">本地离线保存</span>
            )}
            <span className="text-[#8c8ea3]">UTF-8</span>
          </div>
        </footer>
      </main>

      {/* Custom Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmDelete}
        title={deleteModalState.type === 'folder' ? '删除文件夹' : '删除文件'}
        itemName={deleteModalState.name}
        itemType={deleteModalState.type}
        warningText={
          deleteModalState.type === 'folder'
            ? '删除的文件夹将进入回收站，30天后自动彻底删除。'
            : '删除的文档将进入回收站，30天后自动彻底删除。'
        }
      />

      {/* Floating Success Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-10 right-10 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#161B26] border border-emerald-500/30 text-emerald-300 text-xs shadow-2xl animate-in slide-in-from-bottom-3 duration-200">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
