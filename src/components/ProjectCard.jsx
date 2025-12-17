import React, { useState } from 'react';
import { FolderKanban, Trash2 } from 'lucide-react';

// 项目资产卡片组件
export const ProjectCard = React.memo(({ project, onLoadProject, onDeleteProject }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    
    return date.toLocaleDateString('zh-CN');
  };
  
  const handleLoad = async () => {
    if (onLoadProject) {
      setIsLoading(true);
      try {
        await onLoadProject(project);
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  const handleConfirmDelete = () => {
    if (onDeleteProject) {
      onDeleteProject(project.id);
    }
    setShowDeleteConfirm(false);
  };

  const handleCancelDelete = (e) => {
    e?.stopPropagation();
    setShowDeleteConfirm(false);
  };

  return (
    <>
      {/* 删除确认气泡 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* 遮罩层 */}
          <div 
            className="absolute inset-0 bg-black/20" 
            onClick={handleCancelDelete}
          />
          {/* 气泡弹窗 */}
          <div className="relative z-60 bg-zinc-900 rounded-lg shadow-2xl border border-zinc-800 p-4 w-64 animate-in fade-in zoom-in-50 duration-200">
            <div className="text-sm text-zinc-300 mb-4 text-center">
              确定要删除项目"{project.title}"吗？
            </div>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={handleCancelDelete}
                className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm bg-red-900/40 hover:bg-red-900/60 text-red-200 border border-red-900/50 rounded-md transition-colors"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="group bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:shadow-lg hover:border-zinc-700 transition-all duration-300 cursor-pointer relative backdrop-blur-sm w-full">
        {/* 加载动画 */}
        {isLoading && (
          <div className="absolute inset-0 bg-zinc-900/80 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-3 border-zinc-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs text-zinc-400 font-medium">加载中...</span>
            </div>
          </div>
        )}
        
        {/* 项目图标和标题 */}
        <div className="flex items-start gap-3 mb-3" onClick={handleLoad}>
          <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center shadow-sm">
            <FolderKanban size={18} className="text-zinc-200" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-zinc-100 truncate text-sm leading-tight mb-1">
              {project.title}
            </h3>
            <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
              {project.description || '无描述'}
            </p>
          </div>
        </div>
        
        {/* 项目信息和操作 */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full"></div>
              节点: {project.nodes?.length || 0}
            </span>
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full"></div>
              连线: {project.edges?.length || 0}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded-full">
              {formatDate(project.timestamp)}
            </span>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              className="w-6 h-6 bg-red-900/20 hover:bg-red-900/40 rounded-full flex items-center justify-center text-red-400 hover:text-red-300 transition-all duration-200 opacity-0 group-hover:opacity-100"
              title="删除项目"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
});
