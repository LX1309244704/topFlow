import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Plus, X, Key, Save, BookOpenText, Pencil, Trash2, FileText, FolderKanban, Users, ImageIcon,
  LayoutTemplate, Search, ChevronRight, ChevronDown, TestTube, Mountain, Sparkles, Video, Play, Zap
} from 'lucide-react';
import apiClient from '../api/client';
import { Button } from './UI.jsx';

// 项目管理模态框
export const ProjectMenu = React.memo(({ 
  onClose, 
  episodes, 
  currentEpisodeId, 
  onUpdateName, 
  onAddEpisode, 
  onDeleteEpisode, 
  onSelectEpisode 
}) => {
  const [editingId, setEditingId] = useState(null); 
  const handleModalClick = (e) => e.stopPropagation();
  const handleInputBlur = useCallback(() => { setEditingId(null); }, []);
  
  return (
    <div className="fixed inset-0 z-[150]" onMouseDown={onClose}> 
      <div className="absolute inset-0 bg-black/5 pointer-events-none" />
      <div className="absolute bg-white rounded-2xl shadow-2xl p-6 w-[350px] max-w-full border border-gray-100 animate-in fade-in slide-in-from-left-4 duration-300" style={{ left: '100px', top: '180px' }} onMouseDown={handleModalClick}>
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
            <BookOpenText size={20} /> 剧集管理
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-2 max-h-72 overflow-y-auto pr-2 mb-4">
          {episodes.map((episode) => (
            <div key={episode.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all duration-150 group ${episode.id === currentEpisodeId ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`} onClick={() => onSelectEpisode(episode.id)}>
              <BookOpenText size={16} className={`${episode.id === currentEpisodeId ? 'text-blue-700' : 'text-gray-500'} flex-shrink-0`} />
              {editingId === episode.id ? (
                <input 
                  type="text" 
                  value={episode.name} 
                  onChange={(e) => onUpdateName(episode.id, e.target.value)} 
                  onMouseDown={e => e.stopPropagation()} 
                  onBlur={handleInputBlur} 
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setEditingId(null); }}} 
                  autoFocus 
                  className={`flex-1 bg-transparent text-sm font-medium focus:outline-none focus:ring-0 border-none p-0 ${episode.id === currentEpisodeId ? 'text-blue-800' : 'text-gray-700'}`} 
                />
              ) : (
                <span className={`flex-1 text-sm font-medium truncate ${episode.id === currentEpisodeId ? 'text-blue-800' : 'text-gray-700'}`}>
                  {episode.name}
                </span>
              )}
              {editingId !== episode.id && (
                <button onClick={(e) => { e.stopPropagation(); setEditingId(episode.id); }} onMouseDown={e => e.stopPropagation()} className="text-gray-400 hover:text-blue-500 p-1 rounded transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100" title="重命名剧集">
                  <Pencil size={16} />
                </button>
              )}
              <button onClick={() => onDeleteEpisode(episode.id)} onMouseDown={e => e.stopPropagation()} className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100" title="删除剧集">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
          <Button onClick={onAddEpisode} variant="secondary" icon={Plus} className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200">
            新增剧集
          </Button>
          <Button onClick={onClose} variant="primary">完成</Button>
        </div>
      </div>
    </div>
  );
});

// API Key配置模态框
export const ApiKeyConfigModal = React.memo(({ onClose, currentKey, onSave, onClear }) => {
  const [tempKey, setTempKey] = useState(currentKey);
  const inputRef = useRef(null);
  
  useEffect(() => { 
    if (inputRef.current) inputRef.current.focus(); 
  }, []);



  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-[400px] max-w-full border border-gray-100 animate-in fade-in zoom-in-50 duration-200" onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
            <Key size={20} /> API Key 配置
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">请配置您的AI服务API Key。该Key将用于所有AI服务调用。</p>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
          <input 
            ref={inputRef} 
            type="password" 
            value={tempKey} 
            onChange={(e) => setTempKey(e.target.value)} 
            placeholder="AIzaSy..." 
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm" 
          />
        </div>
        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
          <div className="flex gap-2">
            <a href="https://ai.jmyps.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-4 py-2 bg-green-50 text-green-600 hover:bg-green-100 border border-green-200 rounded-lg text-sm font-medium transition-colors">
              获取 Key
            </a>
            <Button onClick={() => {onClear(); setTempKey(""); onClose();}} variant="secondary" icon={Trash2} className="text-red-500 bg-red-50 hover:bg-red-100 border-red-200">
              清除
            </Button>
          </div>
          <Button onClick={() => {onSave(tempKey); onClose();}} variant="primary" icon={Save} className="bg-blue-600 hover:bg-blue-700">
            保存
          </Button>
        </div>
      </div>
    </div>
  );
});

// 剧本分析结果模态框
export const SynopsisDisplayModal = React.memo(({ onClose, synopsisData }) => {
  const safeData = synopsisData || { synopsis: "", characters: [], key_scenes: [] };
  const safeStringify = (val) => (typeof val === 'string' || typeof val === 'number' ? val : JSON.stringify(val));
  
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-[500px] max-w-full h-auto max-h-[90vh] overflow-y-auto border border-gray-100 animate-in fade-in zoom-in-50 duration-200" onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2 text-blue-700">
            <BookOpenText size={20} /> AI 剧本分析结果
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
              <FileText size={14}/> 剧本提纲/概要
            </h3>
            <p className="text-sm text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-100 whitespace-pre-wrap">
              {safeStringify(safeData.synopsis)}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
              <Sparkles size={14}/> 主要角色
            </h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-800 ml-4">
              {(Array.isArray(safeData.characters) ? safeData.characters : []).map((char, index) => (
                <li key={index} className="truncate">{safeStringify(char)}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
              <Video size={14}/> 关键场景
            </h3>
            <ul className="list-decimal list-inside space-y-1 text-sm text-gray-800 ml-4">
              {(Array.isArray(safeData.key_scenes) ? safeData.key_scenes : []).map((scene, index) => (
                <li key={index} className="truncate">{safeStringify(scene)}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="pt-4 mt-4 border-t border-gray-100 text-xs text-gray-400 text-right">
          数据由 Gemini API 提供分析
        </div>
      </div>
    </div>
  );
});

// 保存项目模态框
export const SaveProjectModal = React.memo(({ onClose, onSave, projectData }) => {
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  
  const handleSave = () => {
    if (!projectName.trim()) return;
    
    const newProject = {
      id: `project-${Date.now()}`,
      title: projectName,
      description: projectDescription || '自定义项目',
      timestamp: Date.now(),
      nodes: projectData.nodes || [],
      edges: projectData.edges || [],
      type: 'project'
    };
    
    onSave(newProject);
    onClose();
  };
  
  const handleModalClick = (e) => e.stopPropagation();
  
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[450px] max-w-full border border-gray-100 animate-in fade-in zoom-in-50 duration-200" onMouseDown={handleModalClick} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold flex items-center gap-2 text-blue-700">
            <Save size={20} /> 保存项目
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">项目名称</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="请输入项目名称"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition-colors"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">项目描述</label>
            <textarea
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="请输入项目描述（可选）"
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition-colors resize-none"
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <Button onClick={onClose} variant="secondary">取消</Button>
          <Button onClick={handleSave} variant="primary" disabled={!projectName.trim()}>
            保存项目
          </Button>
        </div>
      </div>
    </div>
  );
});

// 项目资产卡片组件
const ProjectCard = React.memo(({ project, onLoadProject, onDeleteProject }) => {
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
          <div className="relative z-60 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 w-64 animate-in fade-in zoom-in-50 duration-200">
            <div className="text-sm text-gray-700 mb-4 text-center">
              确定要删除项目"{project.title}"吗？
            </div>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={handleCancelDelete}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="group bg-gradient-to-br from-white to-gray-50/50 border border-gray-200/80 rounded-xl p-4 hover:shadow-lg hover:border-blue-200/80 transition-all duration-300 cursor-pointer relative backdrop-blur-sm w-full">
        {/* 加载动画 */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs text-blue-600 font-medium">加载中...</span>
            </div>
          </div>
        )}
        
        {/* 项目图标和标题 */}
        <div className="flex items-start gap-3 mb-3" onClick={handleLoad}>
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
            <FolderKanban size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate text-sm leading-tight mb-1">
              {project.title}
            </h3>
            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
              {project.description || '无描述'}
            </p>
          </div>
        </div>
        
        {/* 项目信息和操作 */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
              节点: {project.nodes?.length || 0}
            </span>
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
              连线: {project.edges?.length || 0}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
              {formatDate(project.timestamp)}
            </span>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              className="w-6 h-6 bg-red-50 hover:bg-red-100 rounded-full flex items-center justify-center text-red-400 hover:text-red-600 transition-all duration-200 opacity-0 group-hover:opacity-100"
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

// 空状态组件
const EmptyState = React.memo(({ icon: Icon, title, description }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
      <Icon size={24} className="text-gray-400" />
    </div>
    <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
    <p className="text-xs text-gray-400 max-w-[200px] leading-relaxed">{description}</p>
  </div>
));

// 确认删除弹窗组件
const ConfirmDeleteModal = React.memo(({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "确认删除", 
  message = "确定要删除这个项目吗？", 
  confirmText = "删除", 
  cancelText = "取消" 
}) => {
  if (!isOpen) return null;
  
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };
  
  const handleModalClick = (e) => e.stopPropagation();
  
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/40 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-[380px] max-w-full border border-gray-100 animate-in fade-in zoom-in-50 duration-200" onMouseDown={handleModalClick} onClick={e => e.stopPropagation()}>
        {/* 警告图标 */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-red-50 to-red-100 rounded-full flex items-center justify-center border-2 border-red-200">
            <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
              <Trash2 size={20} className="text-white" />
            </div>
          </div>
        </div>
        
        {/* 标题和消息 */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
        </div>
        
        {/* 操作按钮 */}
        <div className="flex gap-3 justify-center">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-all duration-200 hover:shadow-sm active:scale-95"
          >
            {cancelText}
          </button>
          <button 
            onClick={handleConfirm}
            className="px-6 py-2.5 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200 active:scale-95"
          >
            {confirmText}
          </button>
        </div>
        
        {/* 底部提示 */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400">此操作不可撤销，请谨慎操作</p>
        </div>
      </div>
    </div>
  );
});

// 分页导航组件
const Pagination = React.memo(({ currentPage, totalPages, onPageChange, className }) => {
  if (totalPages <= 1) return null;
  
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (currentPage > 3) pages.push('...');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) pages.push('...');
      
      if (totalPages > 1) pages.push(totalPages);
    }
    
    return pages;
  };
  
  return (
    <div className={`flex items-center justify-center gap-1 ${className}`}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="上一页"
      >
        <ChevronDown size={16} className="rotate-90" />
      </button>
      
      {getPageNumbers().map((page, index) => (
        <button
          key={index}
          onClick={() => typeof page === 'number' && onPageChange(page)}
          disabled={page === '...'}
          className={`w-8 h-8 flex items-center justify-center text-sm transition-colors rounded-lg ${
            page === currentPage
              ? 'bg-blue-500 text-white shadow-sm'
              : page === '...'
              ? 'text-gray-400 cursor-default'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
          }`}
        >
          {page === '...' ? '...' : page}
        </button>
      ))}
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="下一页"
      >
        <ChevronDown size={16} className="-rotate-90" />
      </button>
    </div>
  );
});

// 资产管理模态框
export const AssetModal = React.memo(({ onClose, projects = [], onLoadProject, onDeleteProject }) => {
  const tabs = [
    { id: 'projects', label: '项目资产', icon: FolderKanban, color: 'blue' },
    { id: 'characters', label: '角色库', icon: Users, color: 'purple' },
    { id: 'materials', label: '素材库', icon: ImageIcon, color: 'green' }
  ];
  
  const [activeTab, setActiveTab] = useState('projects');
  const [isLoading, setIsLoading] = useState(false);
  const [displayedProjects, setDisplayedProjects] = useState(projects);
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5); // 每页显示5个项目
  
  // 计算分页数据
  const getPaginatedProjects = useCallback(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return displayedProjects.slice(startIndex, endIndex);
  }, [displayedProjects, currentPage, itemsPerPage]);
  
  const totalPages = Math.ceil(displayedProjects.length / itemsPerPage);
  const paginatedProjects = getPaginatedProjects();
  
  // 当projects参数变化时更新显示的项目列表并重置页码
  useEffect(() => {
    setDisplayedProjects(projects);
    setCurrentPage(1); // 重置到第一页
  }, [projects]);
  
  // 处理页码变化
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // 真实加载动画 - 根据实际数据加载状态
  useEffect(() => {
    if (projects.length > 0) {
      // 如果项目数据已经存在，立即显示
      if (displayedProjects.length === projects.length) {
        setIsLoading(false);
      } else {
        // 数据还在加载中，显示加载动画
        setIsLoading(true);
        const timer = setTimeout(() => {
          setIsLoading(false);
        }, 600); // 缩短加载动画时间
      }
    } else {
      setIsLoading(false);
    }
  }, [projects, displayedProjects]);

  // 删除项目
  const handleDeleteProject = (projectId) => {
    if (onDeleteProject) {
      onDeleteProject(projectId);
    }
  };
  
  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
  };
  
  const handleModalClick = (e) => e.stopPropagation();
  
  const renderContent = () => {
    switch (activeTab) {
      case 'projects':
        return (
          <div className="flex flex-col h-full">
            {/* 项目列表 */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                // 加载动画
                <div className="flex flex-col gap-3 w-full">
                  {[1, 2, 3].map((_, index) => (
                    <div key={index} className="bg-gradient-to-br from-gray-100/50 to-gray-200/50 border border-gray-200/50 rounded-xl p-4 animate-pulse w-full">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 bg-gray-300 rounded-lg"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-300 rounded w-full"></div>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <div className="flex gap-4">
                          <div className="h-3 bg-gray-300 rounded w-12"></div>
                          <div className="h-3 bg-gray-300 rounded w-12"></div>
                        </div>
                        <div className="h-3 bg-gray-300 rounded w-16"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : paginatedProjects.length === 0 ? (
                <EmptyState 
                  icon={FolderKanban}
                  title="暂无项目资产"
                  description="保存的项目将显示在这里"
                />
              ) : (
                <div className="flex flex-col gap-3 w-full">
                  {paginatedProjects.map(project => (
                    <div key={project.id} className="w-full">
                      <ProjectCard 
                        project={project}
                        onLoadProject={onLoadProject}
                        onDeleteProject={handleDeleteProject}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* 分页导航 - 只有在有多个页面时才显示 */}
            {totalPages > 1 && (
              <div className="mt-4 pt-4 border-t border-gray-200/30">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>
                    第 {currentPage} 页，共 {totalPages} 页
                  </span>
                  <span>
                    显示 {paginatedProjects.length} 个项目，共 {displayedProjects.length} 个
                  </span>
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  className="mt-3"
                />
              </div>
            )}
          </div>
        );

      case 'characters':
        return (
          <EmptyState 
            icon={Users}
            title="暂无角色"
            description="创建的角色将显示在这里"
          />
        );
      case 'materials':
        return (
          <EmptyState 
            icon={ImageIcon}
            title="暂无素材"
            description="上传的素材将显示在这里"
          />
        );
      default:
        return null;
    }
  };
  
  const activeTabInfo = tabs.find(tab => tab.id === activeTab);
  
  return (
    <div className="fixed inset-0 z-[200] animate-in fade-in duration-300" onClick={onClose}>
      <div className="absolute bg-gradient-to-br from-white via-white to-gray-50/30 backdrop-blur-sm rounded-2xl shadow-2xl w-[420px] max-w-full max-h-[80vh] border border-gray-200/50 animate-in fade-in zoom-in-50 duration-300" style={{ left: '100px', top: '100px' }} onMouseDown={handleModalClick} onClick={e => e.stopPropagation()}>
        {/* 头部 */}
        <div className="relative bg-gradient-to-r from-blue-50/80 to-blue-100/30 border-b border-blue-200/30 px-6 py-4 backdrop-blur-sm">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                <FolderKanban size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">资产管理</h2>
                <p className="text-xs text-blue-600/80 font-medium">管理您的项目、角色和素材</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        
        {/* 标签页 */}
        <div className="bg-white/50 border-b border-gray-200/30 px-6 backdrop-blur-sm">
          <div className="flex space-x-0 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`px-4 py-3 text-sm font-medium transition-all duration-300 flex items-center gap-2 shrink-0 border-b-2 relative group ${
                  activeTab === tab.id 
                    ? `border-${tab.color}-500 text-${tab.color}-700 bg-gradient-to-r from-${tab.color}-50/80 to-${tab.color}-100/30` 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                }`}
              >
                <tab.icon size={16} className="group-hover:scale-110 transition-transform" />
                <span>{tab.label}</span>
                {activeTab === tab.id && (
                  <div className={`absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-${tab.color}-500 to-${tab.color}-600 rounded-full`}></div>
                )}
              </button>
            ))}
          </div>
        </div>
        
        {/* 内容区域 */}
        <div className="flex flex-col h-[calc(100%-140px)] min-h-[300px] bg-gradient-to-b from-white/30 to-gray-50/20">
          <div className="p-6 pb-4">
            {activeTabInfo && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <activeTabInfo.icon size={14} />
                <span>{activeTabInfo.label}</span>
                {activeTab === 'projects' && displayedProjects.length > 0 && (
                  <span className="ml-auto bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs font-medium">
                    {displayedProjects.length} 个项目
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* 可滚动的内容区域 */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
});