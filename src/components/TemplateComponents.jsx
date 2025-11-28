import React, { useState, useEffect } from 'react';
import { X, ChevronRight, LayoutTemplate, BookOpenText, FileText, Mountain, Sparkles, Search, Video, Play, Zap, ImageIcon, Music } from 'lucide-react';
import { Button } from './UI.jsx';

// 创建菜单组件
export const CreationMenu = ({ x, y, onSelect, onClose }) => (
  <div className="absolute z-[100] w-56 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 ring-1 ring-gray-200 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-left" style={{ left: x, top: y }} onMouseDown={e => e.stopPropagation()}>
    <div className="px-3 py-2 bg-gray-50/80 border-b border-gray-100 flex justify-between items-center">
      <span className="text-[10px] font-semibold text-blue-600 flex items-center gap-1">
        <Sparkles size={10}/> 创建新节点
      </span>
      <button onClick={onClose} className="text-gray-400 hover:bg-gray-200 rounded p-0.5">
        <X size={12}/>
      </button>
    </div>
    <div className="p-1 space-y-0.5">
      {[
        { id: 'text', icon: FileText, l: '文本节点', d: '输入提示词或剧本' }, 
        { id: 'image', icon: ImageIcon, l: '图片生成', d: 'Stable Diffusion' }, 
        { id: 'video', icon: Video, l: '视频生成', d: 'SVD / Runway' }, 
        { id: 'audio', icon: Music, l: '音频生成', d: 'MusicGen' }
      ].map(i => (
        <button 
          key={i.id} 
          onClick={() => onSelect(i.id)} 
          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-blue-50 group transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 group-hover:bg-blue-500 group-hover:text-white flex items-center justify-center">
            <i.icon size={16}/>
          </div>
          <div>
            <div className="text-xs font-bold text-gray-700 group-hover:text-blue-700">{i.l}</div>
            <div className="text-[10px] text-gray-400">{i.d}</div>
          </div>
        </button>
      ))}
    </div>
  </div>
);

// 模板列表模态框
export const TemplateListModal = React.memo(({ onClose, onSelectTemplate }) => {
  const templates = [
    { 
      id: 'story', 
      icon: BookOpenText, 
      title: '故事创作模板', 
      description: '包含完整的故事情节结构和角色设定', 
      category: '创作',
      image: 'https://placehold.co/400x250/3b82f6/ffffff?text=故事创作',
      color: 'bg-gradient-to-br from-blue-500 to-blue-600'
    },
    { 
      id: 'script', 
      icon: FileText, 
      title: '剧本模板', 
      description: '适用于电影、电视剧的剧本格式', 
      category: '创作',
      image: 'https://placehold.co/400x250/8b5cf6/ffffff?text=剧本创作',
      color: 'bg-gradient-to-br from-purple-500 to-purple-600'
    },
    { 
      id: 'adventure', 
      icon: Mountain, 
      title: '冒险故事模板', 
      description: '包含探险、发现和冲突的经典结构', 
      category: '故事',
      image: 'https://placehold.co/400x250/10b981/ffffff?text=冒险故事',
      color: 'bg-gradient-to-br from-emerald-500 to-emerald-600'
    },
    { 
      id: 'romance', 
      icon: Sparkles, 
      title: '爱情故事模板', 
      description: '浪漫情感发展的经典情节模式', 
      category: '故事',
      image: 'https://placehold.co/400x250/ec4899/ffffff?text=爱情故事',
      color: 'bg-gradient-to-br from-pink-500 to-pink-600'
    },
    { 
      id: 'mystery', 
      icon: Search, 
      title: '悬疑推理模板', 
      description: '包含谜题、线索和真相揭示', 
      category: '故事',
      image: 'https://placehold.co/400x250/f59e0b/ffffff?text=悬疑推理',
      color: 'bg-gradient-to-br from-amber-500 to-amber-600'
    },
    { 
      id: 'animation', 
      icon: Play, 
      title: '动画短片模板', 
      description: '适用于3-5分钟动画短片的脚本结构', 
      category: '影视',
      image: 'https://placehold.co/400x250/ef4444/ffffff?text=动画短片',
      color: 'bg-gradient-to-br from-red-500 to-red-600'
    },
    { 
      id: 'commercial', 
      icon: Zap, 
      title: '商业广告模板', 
      description: '产品推广和品牌宣传的脚本格式', 
      category: '商业',
      image: 'https://placehold.co/400x250/06b6d4/ffffff?text=商业广告',
      color: 'bg-gradient-to-br from-cyan-500 to-cyan-600'
    }
  ];

  const categories = [...new Set(templates.map(t => t.category))];
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const templatesPerPage = 6;
  
  // 获取当前显示的模板
  const filteredTemplates = activeTab === 'all' 
    ? templates 
    : templates.filter(t => t.category === activeTab);
  
  // 分页逻辑
  const totalPages = Math.ceil(filteredTemplates.length / templatesPerPage);
  const startIndex = (currentPage - 1) * templatesPerPage;
  const endIndex = startIndex + templatesPerPage;
  const currentTemplates = filteredTemplates.slice(startIndex, endIndex);
  
  // 获取当前分类的模板数量
  const getTemplateCount = (category) => {
    if (category === 'all') return templates.length;
    return templates.filter(t => t.category === category).length;
  };

  // 分页处理
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // 重置页码当切换Tab时
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);
  
  const TemplateCard = ({ template }) => (
    <button
      key={template.id}
      onClick={() => onSelectTemplate(template.id)}
      className="group relative overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 hover:scale-105 text-left"
    >
      {/* 图片区域 */}
      <div className="relative h-32 overflow-hidden">
        <img 
          src={template.image} 
          alt={template.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {/* 渐变遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
        {/* 分类标签 */}
        <div className="absolute top-3 left-3">
          <span className={`px-2 py-1 text-xs font-medium text-white rounded-full backdrop-blur-sm bg-black/30`}>
            {template.category}
          </span>
        </div>
        {/* 图标 */}
        <div className={`absolute top-3 right-3 w-8 h-8 rounded-full ${template.color} flex items-center justify-center text-white shadow-lg`}>
          <template.icon size={16} />
        </div>
      </div>
      
      {/* 内容区域 */}
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">
          {template.title}
        </h3>
        <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">
          {template.description}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">点击使用</span>
          <div className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1">
            <ChevronRight size={14} />
          </div>
        </div>
      </div>
    </button>
  );
  
  return (
    <div className="fixed inset-0 z-[200] animate-in fade-in duration-200" onClick={onClose}>
      <div className="absolute bg-white rounded-2xl shadow-2xl w-[700px] max-w-full h-auto max-h-[80vh] overflow-hidden border border-gray-100 animate-in fade-in zoom-in-50 duration-200" style={{ left: '100px', top: '180px' }} onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b border-gray-100 px-4 py-3">
          <h2 className="text-base font-bold flex items-center gap-2 text-blue-700">
            <LayoutTemplate size={18} /> 项目模板库
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        
        {/* Tab导航 */}
        <div className="border-b border-gray-100 px-4">
          <div className="flex space-x-1 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-all duration-200 flex items-center gap-1.5 shrink-0 ${
                activeTab === 'all' 
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>全部</span>
              <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                {getTemplateCount('all')}
              </span>
            </button>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setActiveTab(category)}
                className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-all duration-200 flex items-center gap-1.5 shrink-0 ${
                  activeTab === category 
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{category}</span>
                <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                  {getTemplateCount(category)}
                </span>
              </button>
            ))}
          </div>
        </div>
        
        <div className="p-4 max-h-[50vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-gray-500">
              {activeTab === 'all' 
                ? '选择适合您项目的模板快速开始创作' 
                : `浏览${activeTab}类模板 (${getTemplateCount(activeTab)}个)`}
            </p>
            <div className="text-xs text-gray-400">
              第 {currentPage} 页，共 {totalPages} 页
            </div>
          </div>
          
          {currentTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentTemplates.map(template => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                <LayoutTemplate size={20} className="text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm">暂无模板</p>
            </div>
          )}
        </div>
        
        {/* 分页控件 */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <div className="flex justify-between items-center">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                上一页
              </button>
              
              <div className="flex space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`w-7 h-7 text-sm rounded-lg transition-colors ${
                      page === currentPage
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                下一页
              </button>
            </div>
          </div>
        )}
        
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">
              {activeTab === 'all' 
                ? `共 ${templates.length} 个模板` 
                : `${activeTab}类模板 ${filteredTemplates.length} 个`}
            </span>
            <Button onClick={onClose} variant="primary" className="bg-blue-600 hover:bg-blue-700">
              关闭
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});