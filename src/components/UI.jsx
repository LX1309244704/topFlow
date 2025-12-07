import React, { useState, useEffect } from 'react';
import { ChevronDown, LinkIcon, Search } from 'lucide-react';

// 通用按钮组件
export const Button = React.memo(({ 
  children, 
  className, 
  variant = 'primary', 
  onClick, 
  icon: Icon, 
  disabled, 
  title 
}) => {
  const variants = {
    primary: "bg-gray-900 text-white hover:bg-black disabled:bg-gray-700 shadow-md",
    secondary: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100",
    icon: "p-2 hover:bg-gray-100 rounded-md text-gray-500",
  };

  return (
    <button 
      onClick={onClick} 
      onMouseDown={e => e.stopPropagation()} 
      disabled={disabled} 
      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm active:scale-95 select-none ${variants[variant]} ${className}`} 
      title={title}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
});

// 基础节点选择器组件（保持原样用于少量选项）
export const NodeSelect = ({ value, options, onChange, icon: Icon, className, maxOptions = 10 }) => {
  // 确保options是有效的数组
  const safeOptions = Array.isArray(options) ? options : [];
  
  // 如果选项数量超过限制，使用增强版选择器
  if (safeOptions.length > maxOptions) {
    return <EnhancedNodeSelect value={value} options={safeOptions} onChange={onChange} icon={Icon} className={className} />;
  }
  
  return (
    <div className={`relative group flex-shrink-0 ${className}`} onMouseDown={e => e.stopPropagation()}>
      {Icon && <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"><Icon size={10} /></div>}
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        className={`appearance-none bg-gray-50 hover:bg-gray-100 border border-gray-100 hover:border-gray-200 text-[10px] font-medium text-gray-700 py-1.5 ${Icon ? 'pl-6' : 'pl-2'} pr-5 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-200 cursor-pointer w-full transition-colors`}
      >
        {safeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
      <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
        <ChevronDown size={10} />
      </div>
    </div>
  );
};

// 增强版节点选择器组件（用于大量选项）
export const EnhancedNodeSelect = ({ value, options, onChange, icon: Icon, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  
  // 确保options是有效的数组
  const safeOptions = Array.isArray(options) ? options : [];
  
  // 初始化选择项
  useEffect(() => {
    const option = safeOptions.find(opt => opt.value === value);
    setSelectedOption(option);
    setFilteredOptions(safeOptions.slice(0, 20)); // 默认显示前20个
  }, [safeOptions, value]);
  
  // 搜索过滤
  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = safeOptions.filter(opt => 
        opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (opt.value && opt.value.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredOptions(filtered.slice(0, 50)); // 搜索结果最多显示50个
    } else {
      setFilteredOptions(safeOptions.slice(0, 20)); // 默认显示前20个
    }
  }, [searchTerm, safeOptions]);
  
  const handleOptionClick = (option) => {
    onChange(option.value);
    setSelectedOption(option);
    setIsOpen(false);
    setSearchTerm('');
  };
  
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchTerm('');
    }
  };

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isOpen && !e.target.closest('.enhanced-select-container')) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);
  
  return (
    <div className={`relative enhanced-select-container ${className}`}>
      {/* 自定义选择框 - 简化样式 */}
      <div 
        className="flex items-center justify-between bg-gray-50 border border-gray-200 text-[10px] font-medium text-gray-700 py-1.5 px-2 rounded-md cursor-pointer transition-colors hover:bg-gray-100 hover:border-gray-300"
        onClick={toggleDropdown}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-1 truncate">
          {Icon && <Icon size={10} className="text-gray-500 flex-shrink-0" />}
          <span className="truncate max-w-[120px]">{selectedOption?.label || '选择角色...'}</span>
        </div>
        <ChevronDown size={10} className={`text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      {/* 下拉菜单 - 优化样式和性能 */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-xl z-50 max-h-80 min-h-[40px] overflow-hidden">
          {/* 搜索框 */}
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索角色..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-6 pr-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-300"
                autoFocus
              />
            </div>
          </div>
          
          {/* 选项列表 - 显示角色详情 */}
          <div className="max-h-60 min-h-[40px] overflow-y-auto">
            {filteredOptions.length > 0 ? (
              <div className="py-1">
                {filteredOptions.map(opt => {
                  // 获取角色详情（优先使用prompt，如果没有则使用label）
                  const roleDetail = opt.prompt || opt.label || '';
                  // 将详情按行分割，最多显示3行
                  const lines = roleDetail.split('\n').slice(0, 3);
                  const hasMoreLines = roleDetail.split('\n').length > 3;
                  
                  return (
                    <div
                      key={opt.value}
                      className={`px-3 py-2 text-xs cursor-pointer transition-colors hover:bg-blue-50 border-b border-gray-50 last:border-b-0 ${
                        value === opt.value ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
                      }`}
                      onClick={() => handleOptionClick(opt)}
                    >
                      {/* 角色名称 */}
                      <div className="font-medium mb-1 truncate">{opt.label}</div>
                      {/* 角色详情 - 最多显示3行 */}
                      <div className="text-gray-600 leading-tight break-words overflow-hidden" style={{ 
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 3,
                        lineClamp: 3
                      }}>
                        {roleDetail || <span className="text-gray-400">（无详情）</span>}
                        {hasMoreLines && (
                          <span className="text-gray-400 text-[10px] italic">...</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-3 py-4 text-xs text-gray-500 text-center">
                未找到匹配的角色
              </div>
            )}
          </div>
          
          {/* 显示总数信息 */}
          {safeOptions.length > 0 && (
            <div className="px-3 py-1.5 text-[10px] text-gray-500 border-t border-gray-200 bg-gray-50">
              共 {safeOptions.length} 个角色，{filteredOptions.length} 个匹配
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// 连接手柄组件
export const HandlePoint = React.memo(({ type, top, onMouseDown, onMouseUp }) => (
  <div 
    className={`absolute w-6 h-6 flex items-center justify-center cursor-crosshair z-[60] hover:scale-110 transition-transform ${type === 'source' ? '-right-5' : '-left-5'}`}
    style={{ top: top, marginTop: -12 }}
    onMouseDown={onMouseDown}
    onMouseUp={onMouseUp}
  >
    <div className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow-md transition-colors duration-200 ${type === 'source' ? 'bg-blue-500' : 'bg-slate-400 hover:bg-blue-500'}`} />
  </div>
));

// 贝塞尔曲线连接组件
export const BezierCurve = React.memo(({ 
  start, 
  end, 
  stroke = "#94a3b8", 
  strokeWidth = 3, 
  strokeDasharray, 
  isSelected, 
  onDoubleClick 
}) => {
  const dist = Math.abs(end.x - start.x);
  const controlOffset = Math.max(dist * 0.5, 50);
  const path = `M ${start.x} ${start.y} C ${start.x + controlOffset} ${start.y}, ${end.x - controlOffset} ${end.y}, ${end.x} ${end.y}`;
  
  return (
    <g onDoubleClick={onDoubleClick} className="group pointer-events-auto cursor-pointer">
      <path d={path} stroke="transparent" strokeWidth="20" fill="none" />
      <path d={path} stroke={isSelected ? "#3b82f6" : stroke} strokeWidth={strokeWidth} fill="none" strokeDasharray={strokeDasharray} className="transition-colors duration-200 group-hover:stroke-blue-500" />
      <circle cx={start.x} cy={start.y} r="3" fill={isSelected ? "#3b82f6" : stroke} />
      <circle cx={end.x} cy={end.y} r="3" fill={isSelected ? "#3b82f6" : stroke} />
    </g>
  );
});

// 输入标签组件
export const InputBadge = ({ text, type }) => {
  const display = (typeof text === 'string' || typeof text === 'number') ? text : JSON.stringify(text || '');
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-100 rounded-md text-[10px] text-blue-600 mb-2 animate-in fade-in">
      <LinkIcon size={10} />
      <span className="font-medium truncate max-w-[200px]">引用: {display} ({type === 'text' ? '文本' : '图片'})</span>
    </div>
  );
};