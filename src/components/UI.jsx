import React from 'react';
import { ChevronDown, LinkIcon } from 'lucide-react';

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

// 节点选择器组件
export const NodeSelect = ({ value, options, onChange, icon: Icon, className }) => (
  <div className={`relative group flex-shrink-0 ${className}`} onMouseDown={e => e.stopPropagation()}>
    {Icon && <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"><Icon size={10} /></div>}
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      className={`appearance-none bg-gray-50 hover:bg-gray-100 border border-gray-100 hover:border-gray-200 text-[10px] font-medium text-gray-700 py-1.5 ${Icon ? 'pl-6' : 'pl-2'} pr-5 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-200 cursor-pointer w-full transition-colors`}
    >
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
    <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
      <ChevronDown size={10} />
    </div>
  </div>
);

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