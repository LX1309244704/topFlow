import React from 'react';
import { 
  Type, ImageIcon, Video, Music, FolderKanban, LayoutTemplate, Plus, Zap, History
} from 'lucide-react';

export const Sidebar = React.memo(({ 
  onAdd, 
  onShowProjectMenu, 
  onShowTemplateList, 
  onShowAssetModal,
  onShowHistory
}) => (
  <div className="fixed left-6 top-1/2 -translate-y-1/2 z-[100]" onMouseDown={e => e.stopPropagation()}>
    <div className="relative bg-zinc-900/95 backdrop-blur-xl rounded-xl shadow-lg border border-zinc-800 flex flex-col py-2 px-2 gap-1">
      
      {/* 快速添加按钮 -> 改为项目管理 */}
      <div className="relative flex justify-center mb-2 pb-2 border-b border-zinc-800">
        <button 
          onClick={(e) => onShowProjectMenu(e)}
          className="relative w-10 h-10 rounded-lg bg-zinc-100 text-zinc-900 flex items-center justify-center shadow-sm transition-all duration-200 hover:bg-white hover:scale-105"
          title="项目管理"
        >
          <FolderKanban size={18} />
        </button>
      </div>

      {[
        { id: 'text', icon: Type, label: '文本', action: () => onAdd('text') }, 
        { id: 'image', icon: ImageIcon, label: '图片', action: () => onAdd('image') }, 
        { id: 'video', icon: Video, label: '视频', action: () => onAdd('video') }, 
        { id: 'audio', icon: Music, label: '音频', action: () => onAdd('audio') },
        { id: 'history', icon: History, label: '生成历史', action: (e) => onShowHistory(e) },
        { id: 'assets', icon: FolderKanban, label: '资产', action: (e) => onShowAssetModal(e) }
      ].map((item) => (
        <div key={item.id} className="relative group">
          <button 
            onClick={item.action} 
            className="w-10 h-10 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-all duration-200"
          >
            <item.icon size={18} strokeWidth={2} />
          </button>
          
          {/* 悬浮提示 */}
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-zinc-800 text-zinc-100 border border-zinc-700 text-[10px] font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
            {item.label}
          </div>
        </div>
      ))}
    </div>
  </div>
));