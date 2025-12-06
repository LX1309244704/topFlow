import React from 'react';
import { 
  Type, ImageIcon, Video, Music, FolderKanban, LayoutTemplate 
} from 'lucide-react';

export const Sidebar = React.memo(({ 
  onAdd, 
  onShowProjectMenu, 
  onShowTemplateList, 
  onShowAssetModal 
}) => (
  <div className="absolute left-4 top-1/2 -translate-y-1/2 z-[100] bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col p-2 gap-2" onMouseDown={e => e.stopPropagation()}>
    <div className="flex flex-col gap-1.5 pt-1"> 
      {[
        { id: 'project', icon: FolderKanban, label: '项目', action: onShowProjectMenu }, 
        { id: 'text', icon: Type, label: '文本', action: () => onAdd('text') }, 
        { id: 'image', icon: ImageIcon, label: '图片', action: () => onAdd('image') }, 
        { id: 'video', icon: Video, label: '视频', action: () => onAdd('video') }, 
        { id: 'audio', icon: Music, label: '音频', action: () => onAdd('audio') },
        { id: 'assets', icon: FolderKanban, label: '资产', action: onShowAssetModal }
        // { id: 'template', icon: LayoutTemplate, label: '模板', action: onShowTemplateList }
      ].map(item => (
        <button 
          key={item.id} 
          onClick={item.action} 
          className="p-3 rounded-xl flex flex-col items-center gap-1 w-16 text-gray-500 hover:bg-gray-50 hover:text-blue-600 transition-colors" 
          title={item.label}
        >
          <item.icon size={20} strokeWidth={2} />
          <span className="text-[10px] font-medium">{item.label}</span>
        </button>
      ))}
    </div>
  </div>
));