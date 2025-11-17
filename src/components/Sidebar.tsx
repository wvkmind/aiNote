import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Folder, Document } from '../types';
import { GlobalSearch } from './GlobalSearch';

// 辅助函数：检查文件夹（包括子文件夹）是否包含匹配的文档
const hasFolderMatchingDocuments = (
  folderId: string,
  documents: Document[],
  folders: Folder[]
): boolean => {
  // 检查当前文件夹是否有匹配的文档
  const hasDirectMatch = documents.some(d => d.folderId === folderId);
  if (hasDirectMatch) return true;

  // 递归检查子文件夹
  const childFolders = folders.filter(f => f.parentId === folderId);
  return childFolders.some(child => hasFolderMatchingDocuments(child.id, documents, folders));
};

interface TreeItemProps {
  folder?: Folder;
  documents: Document[];
  level: number;
  isRoot?: boolean;
  isSearching?: boolean;
}

const TreeItem: React.FC<TreeItemProps> = ({ folder, documents, level, isRoot = false, isSearching = false }) => {
  const {
    folders,
    expandedFolders,
    currentDocumentId,
    selectDocument,
    deleteDocument,
    createDocument,
    createFolder,
    updateFolder,
    deleteFolder,
    toggleFolder,
    moveDocument,
  } = useAppStore();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showMoveDialog, setShowMoveDialog] = useState<string | null>(null);

  const folderId = folder?.id;
  // 根目录使用特殊ID '__root__'，其他文件夹使用实际ID
  const toggleId = isRoot ? '__root__' : folderId;
  const isExpanded = toggleId ? (expandedFolders[toggleId] ?? false) : true;

  // 获取子文件夹 - 根目录显示没有parentId的文件夹
  const childFolders = folders.filter(f => {
    const isChild = isRoot 
      ? (!f.parentId || f.parentId === null || f.parentId === undefined)
      : f.parentId === folderId;
    
    if (!isChild) return false;
    
    // 搜索时，只显示包含匹配文档的文件夹（递归检查）
    if (isSearching) {
      return hasFolderMatchingDocuments(f.id, documents, folders);
    }
    
    return true;
  });
  
  // 获取当前文件夹下的文档 - 根目录显示没有folderId的文档
  const folderDocuments = documents.filter(d => {
    if (isRoot) {
      return !d.folderId || d.folderId === null || d.folderId === undefined;
    }
    return d.folderId === folderId;
  });

  const handleToggle = () => {
    if (toggleId) {
      toggleFolder(toggleId);
    }
  };

  const handleCreateDocument = async () => {
    const title = `新文档 ${new Date().toLocaleString('zh-CN')}`;
    await createDocument(title, folderId);
  };

  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      await createFolder(newFolderName.trim(), folderId);
      setNewFolderName('');
      setShowNewFolder(false);
    }
  };

  const handleRenameFolder = async () => {
    if (editingId && editingName.trim()) {
      await updateFolder(editingId, editingName.trim());
      setEditingId(null);
      setEditingName('');
    }
  };

  const handleDeleteFolder = async (id: string) => {
    await deleteFolder(id);
    setShowDeleteConfirm(null);
  };

  const handleDeleteDocument = async (id: string) => {
    await deleteDocument(id);
    setShowDeleteConfirm(null);
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp || timestamp === 0) return '刚刚';
    const ms = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
    const date = new Date(ms);
    if (isNaN(date.getTime())) return '刚刚';
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatSize = (content: any) => {
    const size = JSON.stringify(content).length;
    if (size < 1024) return `${size}B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
    return `${(size / (1024 * 1024)).toFixed(1)}MB`;
  };

  const getSizeColor = (content: any) => {
    const size = JSON.stringify(content).length;
    if (size > 10 * 1024 * 1024) return 'text-red-500';
    if (size > 5 * 1024 * 1024) return 'text-orange-500';
    if (size > 1 * 1024 * 1024) return 'text-yellow-600';
    return 'text-[var(--text-secondary)]';
  };

  return (
    <div>
      {/* 文件夹头部（包括根目录） */}
      {(isRoot || folder) && (
        <div
          className="group flex items-center gap-2 px-3 py-2 hover:bg-[var(--bg-hover)] rounded-lg cursor-pointer transition-all"
          style={{ paddingLeft: `${level * 16 + 12}px` }}
        >
          <button
            onClick={handleToggle}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--accent-primary)] transition-colors"
          >
            <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>

          {editingId === folder?.id ? (
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={handleRenameFolder}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameFolder();
                if (e.key === 'Escape') {
                  setEditingId(null);
                  setEditingName('');
                }
              }}
              className="flex-1 px-2 py-1 text-sm bg-[var(--bg-primary)] border border-[var(--accent-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
              autoFocus
            />
          ) : (
            <>
              <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
              <span className="flex-1 text-sm font-medium truncate text-[var(--text-primary)]">
                {isRoot ? 'Root' : folder?.name}
              </span>
              
              {/* 文件夹操作按钮 */}
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCreateDocument();
                  }}
                  className="p-1 text-[var(--accent-primary)] hover:bg-[var(--accent-light)] rounded transition-colors"
                  title="新建文档"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNewFolder(true);
                  }}
                  className="p-1 text-emerald-500 hover:bg-emerald-50 rounded transition-colors"
                  title="新建子文件夹"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                {!isRoot && folder && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(folder.id);
                        setEditingName(folder.name);
                      }}
                      className="p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded transition-colors"
                      title="重命名"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(folder.id);
                      }}
                      className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="删除文件夹"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* 新建文件夹输入框 */}
      {showNewFolder && (
        <div
          className="px-3 py-2 flex items-center gap-2"
          style={{ paddingLeft: `${(level + 1) * 16 + 12}px` }}
        >
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onBlur={() => {
              if (!newFolderName.trim()) setShowNewFolder(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFolder();
              if (e.key === 'Escape') {
                setNewFolderName('');
                setShowNewFolder(false);
              }
            }}
            placeholder="文件夹名称"
            className="flex-1 px-3 py-1.5 text-sm bg-[var(--bg-primary)] border border-[var(--accent-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] shadow-sm"
            autoFocus
          />
        </div>
      )}

      {/* 删除确认对话框 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[var(--bg-primary)] rounded-2xl p-6 shadow-2xl max-w-sm border border-[var(--border-color)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-[var(--text-primary)]">确定删除吗？</p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg text-sm hover:bg-[var(--bg-hover)] transition-all font-medium"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (folders.find(f => f.id === showDeleteConfirm)) {
                    handleDeleteFolder(showDeleteConfirm);
                  } else {
                    handleDeleteDocument(showDeleteConfirm);
                  }
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-all font-medium shadow-sm hover:shadow"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 移动文档对话框 */}
      {showMoveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[var(--bg-primary)] rounded-2xl p-6 shadow-2xl max-w-md w-full mx-4 border border-[var(--border-color)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <p className="text-sm font-medium text-[var(--text-primary)]">移动文档到</p>
            </div>
            
            <div className="max-h-96 overflow-y-auto mb-4 space-y-1">
              {/* 根目录选项 */}
              <button
                onClick={() => {
                  moveDocument(showMoveDialog, undefined);
                  setShowMoveDialog(null);
                }}
                className="w-full text-left px-4 py-2 rounded-lg hover:bg-[var(--bg-hover)] transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
                <span className="text-sm">根目录</span>
              </button>
              
              {/* 文件夹列表 */}
              {folders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    moveDocument(showMoveDialog, f.id);
                    setShowMoveDialog(null);
                  }}
                  className="w-full text-left px-4 py-2 rounded-lg hover:bg-[var(--bg-hover)] transition-all flex items-center gap-2"
                  style={{ paddingLeft: `${(f.parentId ? 2 : 1) * 16}px` }}
                >
                  <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                  </svg>
                  <span className="text-sm">{f.name}</span>
                </button>
              ))}
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowMoveDialog(null)}
                className="px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg text-sm hover:bg-[var(--bg-hover)] transition-all font-medium"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 展开的内容 */}
      {isExpanded && (
        <div>
          {/* 子文件夹 */}
          {childFolders.map((childFolder) => (
            <TreeItem
              key={childFolder.id}
              folder={childFolder}
              documents={documents}
              level={level + 1}
              isSearching={isSearching}
            />
          ))}

          {/* 文档列表 */}
          {folderDocuments.map((doc) => (
            <div
              key={doc.id}
              className={`group relative px-3 py-3 cursor-pointer transition-all rounded-lg mb-1 ${
                currentDocumentId === doc.id
                  ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-[var(--accent-primary)] shadow-sm'
                  : 'hover:bg-[var(--bg-hover)] hover:shadow-sm'
              }`}
              style={{ paddingLeft: `${(level + 1) * 16 + 24}px` }}
              onClick={() => selectDocument(doc.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    {doc.isPinned && (
                      <svg className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    {doc.isImportant && (
                      <svg className="w-3.5 h-3.5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    )}
                    <svg className="w-4 h-4 text-[var(--accent-primary)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className={`text-sm font-medium truncate ${
                      currentDocumentId === doc.id ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'
                    }`}>{doc.title}</h3>
                  </div>
                  <div className="flex items-center gap-3 ml-6 text-xs text-[var(--text-tertiary)]">
                    <div className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="whitespace-nowrap">{formatDate(doc.updatedAt)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span className={`font-medium whitespace-nowrap ${getSizeColor(doc.content)}`}>
                        {formatSize(doc.content)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      useAppStore.getState().togglePinDocument(doc.id);
                    }}
                    className={`p-1.5 rounded-lg transition-all ${
                      doc.isPinned 
                        ? 'text-amber-500 bg-amber-50' 
                        : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)]'
                    }`}
                    title={doc.isPinned ? '取消置顶' : '置顶'}
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      useAppStore.getState().toggleImportantDocument(doc.id);
                    }}
                    className={`p-1.5 rounded-lg transition-all ${
                      doc.isImportant 
                        ? 'text-red-500 bg-red-50' 
                        : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)]'
                    }`}
                    title={doc.isImportant ? '取消重要' : '标记重要'}
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMoveDialog(doc.id);
                    }}
                    className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                    title="移动到文件夹"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(doc.id);
                    }}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="删除文档"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC = () => {
  const { documents, collapseAllFolders, expandAllFolders, navigateToCurrentDocument } = useAppStore();

  return (
    <div className="h-full flex flex-col bg-[var(--bg-secondary)]">
      {/* Header */}
      <div className="p-6 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">AI 笔记</h1>
        </div>

        {/* Global Search */}
        <GlobalSearch />

        {/* 文件夹操作按钮条 */}
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={collapseAllFolders}
            className="flex-1 px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition-all flex items-center justify-center gap-1.5"
            title="全部折叠"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <span>折叠</span>
          </button>
          <button
            onClick={expandAllFolders}
            className="flex-1 px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition-all flex items-center justify-center gap-1.5"
            title="全部展开"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            <span>展开</span>
          </button>
          <button
            onClick={navigateToCurrentDocument}
            className="flex-1 px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition-all flex items-center justify-center gap-1.5"
            title="定位到当前文档"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>定位</span>
          </button>
        </div>
      </div>

      {/* Tree View */}
      <div className="flex-1 overflow-y-auto p-3">
        <TreeItem documents={documents} level={0} isRoot />
      </div>
    </div>
  );
};
