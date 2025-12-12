import React from 'react';
import { 
  Type, ImageIcon, Video, Music, FolderKanban, LayoutTemplate, Plus, Zap
} from 'lucide-react';

export const Sidebar = React.memo(({ 
  onAdd, 
  onShowProjectMenu, 
  onShowTemplateList, 
  onShowAssetModal 
}) => (
  <div className="fixed left-6 top-1/2 -translate-y-1/2 z-[100]" onMouseDown={e => e.stopPropagation()}>
    <div className="relative bg-gradient-to-br from-white to-gray-50 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 flex flex-col py-3 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 pointer-events-none"></div>
      
      {/* 顶部装饰元素 */}
      <div className="flex justify-center mb-2">
        <div className="w-10 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
      </div>
      
      {/* 菜单项容器 */}
      <div className="relative flex flex-col gap-1 px-3">
        {/* 快速添加按钮 - 保持原有样式 */}
        <div className="relative flex justify-center mb-1">
          <button 
            onClick={onShowTemplateList}
            className="relative w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center shadow-lg transform transition-all duration-300 hover:scale-110 hover:shadow-xl"
            title="快速添加"
          >
            <Plus size={18} strokeWidth={3} />
          </button>
        </div>

        {[
          { id: 'project', icon: FolderKanban, label: '项目', action: onShowProjectMenu }, 
          { id: 'text', icon: Type, label: '文本', action: () => onAdd('text') }, 
          { id: 'image', icon: ImageIcon, label: '图片', action: () => onAdd('image') }, 
          { id: 'video', icon: Video, label: '视频', action: () => onAdd('video') }, 
          { id: 'audio', icon: Music, label: '音频', action: () => onAdd('audio') },
          { id: 'assets', icon: FolderKanban, label: '资产', action: onShowAssetModal }
        ].map((item, index) => (
          <div key={item.id} className="relative">
            <button 
              onClick={item.action} 
              className="group relative w-12 h-12 rounded-xl flex items-center justify-center text-gray-600 hover:bg-white/80 hover:text-blue-600 hover:shadow-lg transition-all duration-300 transform hover:scale-110"
              title={item.label}
            >
              <item.icon size={18} strokeWidth={2.5} />
            </button>
            
            {/* 悬浮提示 */}
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              {item.label}
              {/* 小三角指示器 */}
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
));