import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plus, X, Key, Save, BookOpenText, Pencil, Trash2, FileText, FolderKanban, Users, ImageIcon,
  LayoutTemplate, Search, ChevronRight, ChevronDown, TestTube, Mountain, Sparkles, Video, Play, Zap, Download
} from 'lucide-react';
import apiClient from '../api/client';
import { Button } from './UI.jsx';

import { indexedDBManager } from '../utils/indexedDB.js';
import { downloadFile } from '../constants.js';

// 生成历史模态框
export const HistoryModal = React.memo(({ onClose, position }) => {
  const [activeTab, setActiveTab] = useState('image'); // 'image' or 'video'
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  
  // 预览状态
  const [previewItem, setPreviewItem] = useState(null);
  const [previewPos, setPreviewPos] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (e, item) => {
    const rect = e.currentTarget.getBoundingClientRect();
    // 智能判断显示位置：如果右侧空间不足，显示在左侧
    const showOnRight = rect.right + 340 < window.innerWidth;
    
    setPreviewPos({
        x: showOnRight ? rect.right + 10 : rect.left - 330,
        y: rect.top - 20 // 略微上移
    });
    setPreviewItem(item);
  };

  const handleMouseLeave = () => {
    setPreviewItem(null);
  };
  
  useEffect(() => {
    loadHistory(activeTab);
  }, [activeTab]);
  
  const loadHistory = async (type) => {
    setLoading(true);
    try {
      const items = await indexedDBManager.getHistory(type);
      setHistoryItems(items);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = (e, id) => {
    e.stopPropagation();
    setItemToDelete(id);
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
        try {
            await indexedDBManager.deleteHistoryItem(itemToDelete);
            // Remove from local state
            setHistoryItems(prev => prev.filter(item => item.id !== itemToDelete));
        } catch (error) {
            console.error('Failed to delete history item:', error);
        } finally {
            setItemToDelete(null);
        }
    }
  };
  
  // Dynamic positioning logic
  const containerStyle = position ? {
    left: `${position.x}px`,
    top: `${position.y + 20}px`, // Center of the button (assuming 40px height)
    transform: 'translateY(-50%)', // Vertically center the modal
    margin: 0 // Override centered margin
  } : {
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)'
  };

  return (
    <div 
      className="fixed inset-0 z-[200] animate-in fade-in duration-300" 
      onClick={onClose}
      onDragOver={(e) => { e.preventDefault(); }}
      onDrop={(e) => { 
        e.preventDefault();
        let raw = e.dataTransfer.getData('application/x-topflow-history');
        if (!raw) raw = e.dataTransfer.getData('text/plain');
        if (!raw) return;
        let payload;
        try { payload = JSON.parse(raw); } catch { return; }
        if (window.topFlow && typeof window.topFlow.addNodeFromHistory === 'function') {
          window.topFlow.addNodeFromHistory(e.clientX, e.clientY, payload);
        }
      }}
    >
      <div className="absolute bg-zinc-950 rounded-xl shadow-2xl w-[380px] max-w-full h-[500px] border border-zinc-800 animate-in fade-in zoom-in-50 duration-300 flex flex-col" style={containerStyle} onClick={e => e.stopPropagation()}>
        {/* Minimalist Delete Confirmation Overlay */}
        {itemToDelete && (
            <div className="absolute inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200 rounded-xl bg-black/60 backdrop-blur-[1px]">
                <div 
                    className="w-[240px] bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-4 animate-in zoom-in-95 duration-200" 
                    onClick={e => e.stopPropagation()}
                >
                    <div className="text-center mb-4">
                        <h3 className="text-sm font-medium text-zinc-200 mb-1">确认删除</h3>
                        <p className="text-[11px] text-zinc-500 leading-relaxed">
                            确定要删除这条记录吗？
                        </p>
                    </div>
                    
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setItemToDelete(null)}
                            className="flex-1 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition-colors border border-transparent hover:border-zinc-800"
                        >
                            取消
                        </button>
                        <button 
                            onClick={confirmDelete}
                            className="flex-1 py-1.5 text-xs text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm"
                        >
                            删除
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm rounded-t-2xl">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-800 rounded-lg">
                    <BookOpenText size={20} className="text-zinc-200" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-zinc-100">生成历史</h2>
                    <p className="text-xs text-zinc-500">查看所有生成的图片和视频记录</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-200 transition-colors">
                <X size={20} />
            </button>
        </div>
        
        {/* Tabs */}
        <div className="flex items-center px-6 py-2 border-b border-zinc-800 gap-4 bg-zinc-950">
            <button 
                onClick={() => setActiveTab('image')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'image' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900'}`}
            >
                <ImageIcon size={16} />
                图片历史
            </button>
            <button 
                onClick={() => setActiveTab('video')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'video' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900'}`}
            >
                <Video size={16} />
                视频历史
            </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-zinc-950">
            {loading ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-3">
                    <div className="w-8 h-8 border-4 border-zinc-800 border-t-zinc-400 rounded-full animate-spin"></div>
                    <p className="text-sm">加载中...</p>
                </div>
            ) : historyItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4">
                    <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center">
                        {activeTab === 'image' ? <ImageIcon size={32} /> : <Video size={32} />}
                    </div>
                    <p>暂无{activeTab === 'image' ? '图片' : '视频'}生成记录</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3">
                    {historyItems.map((item) => (
                        <div 
                            key={item.id} 
                            className="group relative bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden hover:border-zinc-700 transition-all hover:shadow-lg"
                            onMouseEnter={(e) => handleMouseEnter(e, item)}
                            onMouseLeave={handleMouseLeave}
                            draggable
                            onDragStart={(e) => {
                              const payload = {
                                type: item.type,
                                url: item.url,
                                ratio: item.ratio || (item.metadata && item.metadata.aspectRatio) || null,
                                prompt: item.prompt || ''
                              };
                              try {
                                e.dataTransfer.setData('application/x-topflow-history', JSON.stringify(payload));
                              } catch {}
                              e.dataTransfer.setData('text/plain', JSON.stringify(payload));
                              e.dataTransfer.effectAllowed = 'copy';
                            }}
                        >
                            <div className="aspect-square bg-zinc-950 relative overflow-hidden">
                                {/* Delete button */}
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                    <button 
                                        onClick={(e) => handleDeleteItem(e, item.id)}
                                        className="p-1.5 bg-zinc-900/80 hover:bg-red-900/90 rounded-full text-zinc-400 hover:text-zinc-100 backdrop-blur-sm transition-colors border border-zinc-800"
                                        title="删除"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const ext = (() => {
                                            if (item.type === 'image') {
                                              const m = (item.url || '').match(/^data:image\/(\w+)/);
                                              if (m) return m[1] === 'jpeg' ? 'jpg' : m[1];
                                              const seg = (item.url || '').split('?')[0].split('.').pop();
                                              return seg && seg.length <= 4 ? seg : 'png';
                                            } else {
                                              const m = (item.url || '').match(/^data:video\/(\w+)/);
                                              if (m) return m[1];
                                              const seg = (item.url || '').split('?')[0].split('.').pop();
                                              return seg && seg.length <= 4 ? seg : 'mp4';
                                            }
                                          })();
                                          const fname = `${item.type}_${item.id}.${ext}`;
                                          downloadFile(item.url, fname);
                                        }}
                                        className="ml-2 p-1.5 bg-zinc-900/80 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-100 backdrop-blur-sm transition-colors border border-zinc-800"
                                        title="下载到本地"
                                    >
                                        <Download size={14} />
                                    </button>
                                </div>
                                {activeTab === 'image' ? (
                                    <img src={item.url} alt={item.prompt} className="w-full h-full object-cover" loading="lazy" />
                                ) : (
                                    <video src={item.url} className="w-full h-full object-cover" muted loop />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                    <p className="text-xs text-zinc-300 line-clamp-2 mb-2">{item.prompt}</p>
                                    <div className="flex justify-between items-center text-[10px] text-zinc-500">
                                        <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                                        <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">{item.ratio}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
        
        {/* Preview Portal */}
        {previewItem && createPortal(
            <div 
                className="fixed z-[9999] pointer-events-none animate-in fade-in zoom-in duration-200"
                style={{ 
                    left: previewPos.x, 
                    top: previewPos.y,
                    width: '320px',
                    maxHeight: '400px'
                }}
            >
                <div className="bg-zinc-900 rounded-xl border border-zinc-700 shadow-2xl overflow-hidden p-1">
                    {activeTab === 'image' ? (
                        <img 
                            src={previewItem.url} 
                            alt="Preview" 
                            className="w-full h-auto rounded-lg object-contain bg-zinc-950"
                        />
                    ) : (
                        <video 
                            src={previewItem.url} 
                            className="w-full h-auto rounded-lg object-contain bg-zinc-950" 
                            autoPlay 
                            loop 
                            muted={false} 
                            controls 
                        />
                    )}
                    <div className="p-2 bg-zinc-900">
                        <p className="text-xs text-zinc-300 line-clamp-3 font-medium">{previewItem.prompt}</p>
                        <div className="flex justify-between items-center mt-2 text-[10px] text-zinc-500">
                            <span>{new Date(previewItem.timestamp).toLocaleString()}</span>
                            <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 border border-zinc-700">{previewItem.ratio}</span>
                        </div>
                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={() => {
                              const ext = (() => {
                                if (previewItem.type === 'image') {
                                  const m = (previewItem.url || '').match(/^data:image\/(\w+)/);
                                  if (m) return m[1] === 'jpeg' ? 'jpg' : m[1];
                                  const seg = (previewItem.url || '').split('?')[0].split('.').pop();
                                  return seg && seg.length <= 4 ? seg : 'png';
                                } else {
                                  const m = (previewItem.url || '').match(/^data:video\/(\w+)/);
                                  if (m) return m[1];
                                  const seg = (previewItem.url || '').split('?')[0].split('.').pop();
                                  return seg && seg.length <= 4 ? seg : 'mp4';
                                }
                              })();
                              const fname = `${previewItem.type}_${previewItem.id}.${ext}`;
                              downloadFile(previewItem.url, fname);
                            }}
                            className="px-2 py-1 text-[11px] rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center gap-1 border border-zinc-700"
                          >
                            <Download size={12} />
                            下载
                          </button>
                        </div>
                    </div>
                </div>
            </div>,
            document.body
        )}
      </div>
    </div>
  );
});

// 项目管理模态框
export const ProjectMenu = React.memo(({ 
  onClose, 
  episodes, 
  currentEpisodeId, 
  onUpdateName, 
  onAddEpisode, 
  onDeleteEpisode, 
  onSelectEpisode,
  position 
}) => {
  const [editingId, setEditingId] = useState(null); 
  const handleModalClick = (e) => e.stopPropagation();
  const handleInputBlur = useCallback(() => { setEditingId(null); }, []);
  
  // Calculate style based on position if provided
  const style = position ? { 
    left: `${position.x}px`, 
    top: `${position.y}px`,
    transform: 'translateY(-50px)' // Adjust to align better with the button center if needed, or just remove
  } : { left: '100px', top: '180px' };

  // Remove translateY if we want exact alignment with top
  if (position) delete style.transform;
  
  return (
    <div className="fixed inset-0 z-[150]" onMouseDown={onClose}> 
      <div className="absolute inset-0 bg-black/5 pointer-events-none" />
      <div className="absolute bg-zinc-950 rounded-xl shadow-xl p-6 w-[350px] max-w-full border border-zinc-800 animate-in fade-in slide-in-from-left-4 duration-300" style={style} onMouseDown={handleModalClick}>
        <div className="flex justify-between items-center border-b border-zinc-900 pb-3 mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-100">
            <BookOpenText size={20} /> 剧集管理
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-2 max-h-72 overflow-y-auto pr-2 mb-4">
          {episodes.map((episode) => (
            <div key={episode.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all duration-150 group ${episode.id === currentEpisodeId ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-950 border-transparent hover:bg-zinc-900'}`} onClick={() => onSelectEpisode(episode.id)}>
              <BookOpenText size={16} className={`${episode.id === currentEpisodeId ? 'text-zinc-100' : 'text-zinc-500'} flex-shrink-0`} />
              {editingId === episode.id ? (
                <input 
                  type="text" 
                  value={episode.name} 
                  onChange={(e) => onUpdateName(episode.id, e.target.value)} 
                  onMouseDown={e => e.stopPropagation()} 
                  onBlur={handleInputBlur} 
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setEditingId(null); }}} 
                  autoFocus 
                  className={`flex-1 bg-transparent text-sm font-medium focus:outline-none focus:ring-0 border-none p-0 ${episode.id === currentEpisodeId ? 'text-zinc-100' : 'text-zinc-400'}`} 
                />
              ) : (
                <span className={`flex-1 text-sm font-medium truncate ${episode.id === currentEpisodeId ? 'text-zinc-100' : 'text-zinc-400'}`}>
                  {episode.name}
                </span>
              )}
              {editingId !== episode.id && (
                <button onClick={(e) => { e.stopPropagation(); setEditingId(episode.id); }} onMouseDown={e => e.stopPropagation()} className="text-zinc-500 hover:text-zinc-100 p-1 rounded transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100" title="重命名剧集">
                  <Pencil size={16} />
                </button>
              )}
              <button onClick={() => onDeleteEpisode(episode.id)} onMouseDown={e => e.stopPropagation()} className="text-zinc-500 hover:text-red-400 p-1 rounded transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100" title="删除剧集">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center pt-3 border-t border-zinc-900">
          <Button onClick={onAddEpisode} variant="secondary" icon={Plus} className="bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border-zinc-800">
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
      <div className="bg-zinc-950 rounded-xl shadow-xl p-6 w-[400px] max-w-full border border-zinc-800 animate-in fade-in zoom-in-50 duration-200" onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b border-zinc-900 pb-3 mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-100">
            <Key size={20} /> API Key 配置
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-zinc-400 mb-4">请配置您的AI服务API Key。该Key将用于所有AI服务调用。</p>
        <div className="mb-6">
          <input 
            ref={inputRef}
            type="password" 
            value={tempKey} 
            onChange={(e) => setTempKey(e.target.value)} 
            placeholder="输入 API Key..." 
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-700 focus:border-zinc-600 text-sm text-zinc-100 placeholder-zinc-600"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={onClear} variant="secondary" icon={Trash2} className="text-red-400 hover:text-red-300 hover:bg-red-900/20 border-red-900/30">
            清除
          </Button>
          <Button onClick={() => onSave(tempKey)} variant="primary" icon={Save}>
            保存配置
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
      <div className="bg-zinc-950 rounded-2xl shadow-2xl p-6 w-[500px] max-w-full h-auto max-h-[90vh] overflow-y-auto border border-zinc-800 animate-in fade-in zoom-in-50 duration-200" onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b border-zinc-900 pb-3 mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-100">
            <BookOpenText size={20} /> AI 剧本分析结果
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-zinc-300 mb-1 flex items-center gap-1">
              <FileText size={14}/> 剧本提纲/概要
            </h3>
            <p className="text-sm text-zinc-300 bg-zinc-900 p-3 rounded-lg border border-zinc-800 whitespace-pre-wrap">
              {safeStringify(safeData.synopsis)}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-300 mb-1 flex items-center gap-1">
              <Sparkles size={14}/> 主要角色
            </h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-zinc-300 ml-4">
              {(Array.isArray(safeData.characters) ? safeData.characters : []).map((char, index) => (
                <li key={index} className="truncate">{safeStringify(char)}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-300 mb-1 flex items-center gap-1">
              <Video size={14}/> 关键场景
            </h3>
            <ul className="list-decimal list-inside space-y-1 text-sm text-zinc-300 ml-4">
              {(Array.isArray(safeData.key_scenes) ? safeData.key_scenes : []).map((scene, index) => (
                <li key={index} className="truncate">{safeStringify(scene)}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="pt-4 mt-4 border-t border-zinc-900 text-xs text-zinc-500 text-right">
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
      <div className="bg-zinc-950 rounded-2xl shadow-2xl w-[450px] max-w-full border border-zinc-800 animate-in fade-in zoom-in-50 duration-200" onMouseDown={handleModalClick} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b border-zinc-900 px-6 py-4">
          <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-100">
            <Save size={20} /> 保存项目
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">项目名称</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="请输入项目名称"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:ring-2 focus:ring-zinc-700 focus:border-zinc-600 outline-none transition-colors text-zinc-100 placeholder-zinc-600"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">项目描述</label>
            <textarea
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="请输入项目描述（可选）"
              rows={3}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:ring-2 focus:ring-zinc-700 focus:border-zinc-600 outline-none transition-colors resize-none text-zinc-100 placeholder-zinc-600"
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-900 bg-zinc-900/50">
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

// 空状态组件
const EmptyState = React.memo(({ icon: Icon, title, description }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
      <Icon size={24} className="text-zinc-500" />
    </div>
    <h3 className="text-sm font-medium text-zinc-400 mb-1">{title}</h3>
    <p className="text-xs text-zinc-500 max-w-[200px] leading-relaxed">{description}</p>
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
      <div className="bg-zinc-950 rounded-2xl shadow-2xl p-6 w-[380px] max-w-full border border-zinc-800 animate-in fade-in zoom-in-50 duration-200" onMouseDown={handleModalClick} onClick={e => e.stopPropagation()}>
        {/* 警告图标 */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center border-2 border-red-900/30">
            <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
              <Trash2 size={20} className="text-white" />
            </div>
          </div>
        </div>
        
        {/* 标题和消息 */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-zinc-100 mb-2">{title}</h3>
          <p className="text-sm text-zinc-400 leading-relaxed">{message}</p>
        </div>
        
        {/* 操作按钮 */}
        <div className="flex gap-3 justify-center">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-medium transition-all duration-200 hover:shadow-sm active:scale-95"
          >
            {cancelText}
          </button>
          <button 
            onClick={handleConfirm}
            className="px-6 py-2.5 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200 active:scale-95"
          >
            {confirmText}
          </button>
        </div>
        
        {/* 底部提示 */}
        <div className="mt-4 text-center">
          <p className="text-xs text-zinc-500">此操作不可撤销，请谨慎操作</p>
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
        className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
              ? 'bg-zinc-100 text-zinc-900 shadow-sm'
              : page === '...'
              ? 'text-zinc-500 cursor-default'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          {page === '...' ? '...' : page}
        </button>
      ))}
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="下一页"
      >
        <ChevronDown size={16} className="-rotate-90" />
      </button>
    </div>
  );
});

// 资产管理模态框
export const AssetModal = React.memo(({ onClose, projects = [], onLoadProject, onDeleteProject, position }) => {
  const tabs = [
    { id: 'projects', label: '项目资产', icon: FolderKanban },
    { id: 'characters', label: '角色库', icon: Users },
    { id: 'materials', label: '素材库', icon: ImageIcon }
  ];
  
  // Dynamic positioning logic
  const containerStyle = position ? {
    left: `${position.x}px`,
    top: `${position.y + 20}px`, // Center of the button
    transform: 'translateY(-50%)', // Vertically center the modal
    margin: 0
  } : {
    left: '100px', 
    top: '100px'
  };
  
  const [activeTab, setActiveTab] = useState('projects');
  const [isLoading, setIsLoading] = useState(false);
  const [displayedProjects, setDisplayedProjects] = useState(projects);
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5); // 每页显示5个项目
  
  // 角色管理状态
  const [customRoles, setCustomRoles] = useState(() => {
    try {
      const saved = localStorage.getItem('topflow_custom_roles');
      if (saved) {
        const roles = JSON.parse(saved);
        // 保留所有角色，不进行任何过滤
        return roles.filter(role => role && role.value && role.label);
      }
      return [];
    } catch {
      return [];
    }
  });
  
  const [showRoleManager, setShowRoleManager] = useState(false);
  const [showRoleEditor, setShowRoleEditor] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRolePrompt, setNewRolePrompt] = useState('');
  const [editingRole, setEditingRole] = useState(null);
  const [editingRoleName, setEditingRoleName] = useState('');
  const [editingRolePrompt, setEditingRolePrompt] = useState('');
  
  // 保存自定义角色到本地存储并触发同步事件
  const saveCustomRoles = (newRoles) => {
    try {
      console.log('资产角色库保存角色到localStorage:', newRoles);
      localStorage.setItem('topflow_custom_roles', JSON.stringify(newRoles));
      // 触发storage事件以通知其他组件（跨标签页）
      window.dispatchEvent(new Event('storage'));
      // 触发自定义事件以通知同一标签页内的组件
      window.dispatchEvent(new Event('localStorageChange'));
      console.log('资产角色库已保存:', newRoles.length, '个角色');
    } catch (error) {
      console.error('保存自定义角色失败:', error);
    }
  };
  
  // 监听localStorage变化实现实时同步
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem('topflow_custom_roles');
        if (saved) {
          const newRoles = JSON.parse(saved);
          setCustomRoles(newRoles);
        }
      } catch (error) {
        console.error('同步自定义角色失败:', error);
      }
    };

    // 监听storage事件（跨标签页同步）
    window.addEventListener('storage', handleStorageChange);
    
    // 定期检查localStorage变化（同标签页内同步）
    const interval = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);
  
  // 添加自定义角色
  const addCustomRole = (name, prompt) => {
    if (!name.trim() || !prompt.trim()) return;
    
    const newRole = {
      value: `custom_${Date.now()}`,
      label: name,
      prompt: prompt
    };
    
    const updatedRoles = [...customRoles, newRole];
    setCustomRoles(updatedRoles);
    saveCustomRoles(updatedRoles);
    setNewRoleName('');
    setNewRolePrompt('');
  };
  
  // 删除自定义角色
  const deleteCustomRole = (roleValue) => {
    const updatedRoles = customRoles.filter(role => role.value !== roleValue);
    setCustomRoles(updatedRoles);
    saveCustomRoles(updatedRoles);
  };
  
  // 开始编辑角色
  const startEditRole = (role) => {
    setEditingRole(role);
    setEditingRoleName(role.label);
    setEditingRolePrompt(role.prompt);
    setShowRoleEditor(true);
  };
  
  // 更新角色
  const updateRole = () => {
    if (!editingRole || !editingRoleName.trim() || !editingRolePrompt.trim()) return;
    
    const updatedRoles = customRoles.map(role => 
      role.value === editingRole.value 
        ? { ...role, label: editingRoleName, prompt: editingRolePrompt }
        : role
    );
    
    setCustomRoles(updatedRoles);
    saveCustomRoles(updatedRoles);
    setShowRoleEditor(false);
    setEditingRole(null);
    setEditingRoleName('');
    setEditingRolePrompt('');
  };
  
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
                    <div key={index} className="bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 border border-zinc-800/50 rounded-xl p-4 animate-pulse w-full">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 bg-zinc-700 rounded-lg"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-zinc-700 rounded w-3/4"></div>
                          <div className="h-3 bg-zinc-700 rounded w-full"></div>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <div className="flex gap-4">
                          <div className="h-3 bg-zinc-700 rounded w-12"></div>
                          <div className="h-3 bg-zinc-700 rounded w-12"></div>
                        </div>
                        <div className="h-3 bg-zinc-700 rounded w-16"></div>
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
              <div className="mt-4 pt-4 border-t border-zinc-800/30">
                <div className="flex items-center justify-between text-sm text-zinc-500">
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
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-zinc-300">自定义角色库</h3>
              <button 
                onClick={() => setShowRoleManager(true)}
                className="text-xs bg-zinc-100 text-zinc-900 px-3 py-1 rounded-lg hover:bg-white transition-colors"
              >
                + 添加角色
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {customRoles.length === 0 ? (
                <EmptyState 
                  icon={Users}
                  title="暂无自定义角色"
                  description="点击添加角色按钮创建您的专属AI角色"
                />
              ) : (
                <div className="space-y-3">
                  {customRoles.map(role => (
                    <div key={role.value} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-zinc-200">{role.label}</h4>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => startEditRole(role)}
                            className="text-zinc-500 hover:text-zinc-300 text-xs flex items-center gap-1"
                            title="修改角色"
                          >
                            <Pencil size={12} />
                            修改
                          </button>
                          <button 
                            onClick={() => deleteCustomRole(role.value)}
                            className="text-red-400 hover:text-red-500 text-xs flex items-center gap-1"
                            title="删除角色"
                          >
                            <Trash2 size={12} />
                            删除
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-zinc-400 leading-relaxed overflow-hidden line-clamp-3" style={{ 
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 3,
                        lineClamp: 3,
                        maxHeight: '4.5rem'
                      }}>
                        {role.prompt}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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
      <div className="absolute bg-zinc-950 rounded-2xl shadow-2xl w-[420px] max-w-full max-h-[80vh] border border-zinc-800 animate-in fade-in zoom-in-50 duration-300" style={containerStyle} onMouseDown={handleModalClick} onClick={e => e.stopPropagation()}>
        {/* 头部 */}
        <div className="relative bg-zinc-900/90 border-b border-zinc-800 px-6 py-4 backdrop-blur-sm">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center shadow-sm">
                <FolderKanban size={18} className="text-zinc-200" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-zinc-100">资产管理</h2>
                <p className="text-xs text-zinc-500 font-medium">管理您的项目、角色和素材</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        
        {/* 标签页 */}
        <div className="bg-zinc-900 border-b border-zinc-800 px-6 backdrop-blur-sm">
          <div className="flex space-x-0 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`px-4 py-3 text-sm font-medium transition-all duration-300 flex items-center gap-2 shrink-0 border-b-2 relative group ${
                  activeTab === tab.id 
                    ? `border-zinc-100 text-zinc-100 bg-zinc-800` 
                    : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                <tab.icon size={16} className="group-hover:scale-110 transition-transform" />
                <span>{tab.label}</span>
                {activeTab === tab.id && (
                  <div className={`absolute bottom-0 left-0 w-full h-0.5 bg-zinc-100 rounded-full`}></div>
                )}
              </button>
            ))}
          </div>
        </div>
        
        {/* 内容区域 */}
        <div className="flex flex-col h-[calc(100%-140px)] min-h-[300px] bg-zinc-950">
          <div className="p-6 pb-4">
            {activeTabInfo && (
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <activeTabInfo.icon size={14} />
                <span>{activeTabInfo.label}</span>
                {activeTab === 'projects' && displayedProjects.length > 0 && (
                  <span className="ml-auto bg-zinc-800 text-zinc-300 px-2 py-1 rounded-full text-xs font-medium">
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

      {/* 角色管理模态框 */}
      {showRoleManager && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/30 animate-in fade-in duration-200" onClick={() => setShowRoleManager(false)}>
          <div className="bg-zinc-950 rounded-2xl shadow-2xl p-6 w-[450px] max-w-full border border-zinc-800 animate-in fade-in zoom-in-50 duration-200" onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-zinc-900 pb-3 mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-100">
                <Users size={20} /> 添加自定义角色
              </h2>
              <button onClick={() => setShowRoleManager(false)} className="text-zinc-500 hover:text-zinc-300">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">角色名称</label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="输入角色名称，如：专业编剧、小说家等"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:ring-2 focus:ring-zinc-700 focus:border-transparent outline-none text-zinc-100 placeholder-zinc-600"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">角色提示词</label>
                <textarea
                  value={newRolePrompt}
                  onChange={(e) => setNewRolePrompt(e.target.value)}
                  placeholder="输入角色的设定和特点，如：你是一位经验丰富的专业编剧，擅长创作引人入胜的故事情节..."
                  rows={4}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:ring-2 focus:ring-zinc-700 focus:border-transparent outline-none resize-none text-zinc-100 placeholder-zinc-600"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setNewRoleName('');
                  setNewRolePrompt('');
                  setShowRoleManager(false);
                }}
                className="px-4 py-2 text-zinc-400 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  addCustomRole(newRoleName, newRolePrompt);
                  setShowRoleManager(false);
                }}
                disabled={!newRoleName.trim() || !newRolePrompt.trim()}
                className="px-4 py-2 bg-zinc-100 text-zinc-900 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                添加角色
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 角色编辑模态框 */}
      {showRoleEditor && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/30 animate-in fade-in duration-200" onClick={() => setShowRoleEditor(false)}>
          <div className="bg-zinc-950 rounded-2xl shadow-2xl p-6 w-[450px] max-w-full border border-zinc-800 animate-in fade-in zoom-in-50 duration-200" onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-zinc-900 pb-3 mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-100">
                <Pencil size={20} /> 修改角色
              </h2>
              <button onClick={() => setShowRoleEditor(false)} className="text-zinc-500 hover:text-zinc-300">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">角色名称</label>
                <input
                  type="text"
                  value={editingRoleName}
                  onChange={(e) => setEditingRoleName(e.target.value)}
                  placeholder="输入角色名称"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:ring-2 focus:ring-zinc-700 focus:border-transparent outline-none text-zinc-100 placeholder-zinc-600"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">角色提示词</label>
                <textarea
                  value={editingRolePrompt}
                  onChange={(e) => setEditingRolePrompt(e.target.value)}
                  placeholder="输入角色的设定和特点"
                  rows={4}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:ring-2 focus:ring-zinc-700 focus:border-transparent outline-none resize-none text-zinc-100 placeholder-zinc-600"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRoleEditor(false);
                  setEditingRole(null);
                  setEditingRoleName('');
                  setEditingRolePrompt('');
                }}
                className="px-4 py-2 text-zinc-400 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  updateRole();
                  setShowRoleEditor(false);
                }}
                disabled={!editingRoleName.trim() || !editingRolePrompt.trim()}
                className="px-4 py-2 bg-zinc-100 text-zinc-900 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
