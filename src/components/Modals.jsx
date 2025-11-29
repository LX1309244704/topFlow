import React, { useState, useEffect, useCallback } from 'react';
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
          <Button onClick={() => {onClear(); setTempKey(""); onClose();}} variant="secondary" icon={Trash2} className="text-red-500 bg-red-50 hover:bg-red-100 border-red-200">
            清除 Key
          </Button>
          <Button onClick={() => {onSave(tempKey); onClose();}} variant="primary" icon={Save} className="bg-blue-600 hover:bg-blue-700">
            保存 Key
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

// 保存模板模态框
export const SaveTemplateModal = React.memo(({ onClose, onSave, projectData }) => {
  const [templateName, setTemplateName] = useState('');
  const [templateCategory, setTemplateCategory] = useState('创作');
  const [templateDescription, setTemplateDescription] = useState('');
  
  const categories = ['创作', '故事', '影视', '商业', '教育', '游戏'];
  
  const handleSave = () => {
    if (!templateName.trim()) return;
    
    const newTemplate = {
      id: `custom-${Date.now()}`,
      icon: BookOpenText,
      title: templateName,
      description: templateDescription || '自定义项目模板',
      category: templateCategory,
      image: 'https://placehold.co/400x250/6366f1/ffffff?text=' + encodeURIComponent(templateName),
      color: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
      nodes: projectData.nodes || [],
      edges: projectData.edges || []
    };
    
    onSave(newTemplate);
    onClose();
  };
  
  const handleModalClick = (e) => e.stopPropagation();
  
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[450px] max-w-full border border-gray-100 animate-in fade-in zoom-in-50 duration-200" onMouseDown={handleModalClick} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold flex items-center gap-2 text-blue-700">
            <Save size={20} /> 保存为模板
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">模板名称</label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="请输入模板名称"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition-colors"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">分类</label>
            <select
              value={templateCategory}
              onChange={(e) => setTemplateCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition-colors"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">模板描述</label>
            <textarea
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              placeholder="请输入模板描述（可选）"
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition-colors resize-none"
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <Button onClick={onClose} variant="secondary">取消</Button>
          <Button onClick={handleSave} variant="primary" disabled={!templateName.trim()}>
            保存模板
          </Button>
        </div>
      </div>
    </div>
  );
});

// 资产管理模态框
export const AssetModal = React.memo(({ onClose }) => {
  const tabs = [
    { id: 'drafts', label: '项目草稿', icon: FileText },
    { id: 'assets', label: '项目资产', icon: FolderKanban },
    { id: 'characters', label: '角色库', icon: Users },
    { id: 'materials', label: '素材库', icon: ImageIcon }
  ];
  
  const [activeTab, setActiveTab] = useState('drafts');
  
  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
  };
  
  const handleModalClick = (e) => e.stopPropagation();
  
  const renderContent = () => {
    switch (activeTab) {
      case 'drafts':
        return (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
              <FileText size={20} className="text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm mb-1">暂无项目草稿</p>
            <p className="text-gray-400 text-xs">保存的草稿将显示在这里</p>
          </div>
        );
      case 'assets':
        return (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
              <FolderKanban size={20} className="text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm mb-1">暂无项目资产</p>
            <p className="text-gray-400 text-xs">项目资产将显示在这里</p>
          </div>
        );
      case 'characters':
        return (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
              <Users size={20} className="text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm mb-1">暂无角色</p>
            <p className="text-gray-400 text-xs">创建的角色将显示在这里</p>
          </div>
        );
      case 'materials':
        return (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
              <ImageIcon size={20} className="text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm mb-1">暂无素材</p>
            <p className="text-gray-400 text-xs">上传的素材将显示在这里</p>
          </div>
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="fixed inset-0 z-[200] animate-in fade-in duration-200" onClick={onClose}>
      <div className="absolute bg-white rounded-2xl shadow-2xl w-[400px] max-w-full h-[450px] max-h-[80vh] overflow-hidden border border-gray-100 animate-in fade-in zoom-in-50 duration-200" style={{ left: '100px', top: '300px' }} onMouseDown={handleModalClick} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b border-gray-100 px-4 py-3">
          <h2 className="text-base font-bold flex items-center gap-2 text-blue-700">
            <FolderKanban size={18} /> 资产管理
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        
        <div className="border-b border-gray-100 px-4">
          <div className="flex space-x-0 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`px-3 py-2 text-xs font-medium transition-all duration-200 flex items-center gap-1.5 shrink-0 border-b-2 ${
                  activeTab === tab.id 
                    ? 'border-blue-500 text-blue-700 bg-blue-50' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <tab.icon size={14} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
        
        <div className="p-4 h-full overflow-y-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
});