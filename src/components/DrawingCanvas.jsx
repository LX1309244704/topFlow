import { useState, useRef, useEffect, useCallback } from 'react';
import { Brush, Palette, Eraser, Download, X, RotateCcw } from 'lucide-react';

/* eslint-disable react/prop-types */
/**
 * DrawingCanvas component for image editing with drawing tools
 * @param {Object} props - Component props
 * @param {string} props.imageSrc - Source image data URL
 * @param {Function} props.onSave - Callback function when saving edits
 * @param {Function} props.onCancel - Callback function when canceling edits
 * @param {boolean} props.isVisible - Whether the canvas is visible
 * @returns {JSX.Element|null} Drawing canvas component or null
 */
export const DrawingCanvas = ({ 
  imageSrc, 
  onSave, 
  onCancel, 
  isVisible 
}) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState('pen'); // pen, eraser
  const [currentColor, setCurrentColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [isCanvasReady, setIsCanvasReady] = useState(false);

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
    '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB'
  ];

  const brushSizes = [1, 3, 5, 8, 12];

  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const imageElementRef = useRef(null);

  // 当工具或设置改变时，更新画布状态
  useEffect(() => {
    if (!isCanvasReady || !canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    
    if (currentTool === 'pen') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = brushSize;
    } else if (currentTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = brushSize * 2;
    }
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [currentTool, currentColor, brushSize, isCanvasReady]);

  const saveToHistory = useCallback(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL();
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(dataUrl);
    
    if (newHistory.length > 20) {
      newHistory.shift();
    }
    
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  }, [history, historyStep]);

  useEffect(() => {
    if (isVisible && imageSrc && canvasRef.current && !isCanvasReady) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // 设置画布尺寸
        const maxWidth = window.innerWidth * 0.9;
        const maxHeight = window.innerHeight * 0.8;
        
        let canvasWidth = img.width;
        let canvasHeight = img.height;
        
        // 计算适应屏幕的尺寸
        if (canvasWidth > maxWidth) {
          canvasHeight = (maxWidth / canvasWidth) * canvasHeight;
          canvasWidth = maxWidth;
        }
        
        if (canvasHeight > maxHeight) {
          canvasWidth = (maxHeight / canvasHeight) * canvasWidth;
          canvasHeight = maxHeight;
        }
        
        // 保存显示尺寸和原始图片对象
        setDisplaySize({ width: canvasWidth, height: canvasHeight });
        setImageSize({ width: img.width, height: img.height });
        imageElementRef.current = img;

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        
        // 清除画布（保持透明，只绘制笔触）
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 初始化绘制设置
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        setIsCanvasReady(true);
        // 保存初始空白状态到历史
        saveToHistory();
      };
      
      img.src = imageSrc;
    }
  }, [imageSrc, isVisible, isCanvasReady, saveToHistory]);

  const undo = () => {
    if (historyStep > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const step = historyStep - 1;
      const img = new Image();
      
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        setHistoryStep(step);
      };
      
      img.src = history[step];
    }
  };

  const startDrawing = (e) => {
    if (!canvasRef.current || !isCanvasReady) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);
    
    const ctx = canvas.getContext('2d');
    
    if (currentTool === 'pen') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = brushSize;
    } else if (currentTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = brushSize * 2;
    }
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing || !canvasRef.current || !isCanvasReady) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);
    
    const ctx = canvas.getContext('2d');
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveToHistory();
    }
  };

  const handleSave = () => {
    if (canvasRef.current && imageElementRef.current) {
      // 创建一个临时画布来合并图片和笔触
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      const canvas = canvasRef.current;
      
      // 设置临时画布尺寸为当前画布尺寸（即显示尺寸）
      // 注意：如果需要保存原图分辨率，这里需要更复杂的逻辑来缩放笔触
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      
      // 1. 绘制背景图片
      tempCtx.drawImage(imageElementRef.current, 0, 0, tempCanvas.width, tempCanvas.height);
      
      // 2. 绘制笔触层
      tempCtx.drawImage(canvas, 0, 0);
      
      const dataUrl = tempCanvas.toDataURL();
      onSave(dataUrl);
    }
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    canvasRef.current?.dispatchEvent(mouseEvent);
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    canvasRef.current?.dispatchEvent(mouseEvent);
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    const mouseEvent = new MouseEvent('mouseup', {});
    canvasRef.current?.dispatchEvent(mouseEvent);
  };

  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center animate-in fade-in duration-200"
    >
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 z-50 flex flex-col items-center pointer-events-none">
        <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 mb-2">
            <Brush size={14} className="text-white" />
            <span className="text-white text-sm font-medium">涂鸦编辑</span>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative w-full h-full p-8 flex items-center justify-center overflow-hidden bg-zinc-950">
        <div className="relative select-none max-w-full max-h-full flex items-center justify-center"
             style={{ width: displaySize.width, height: displaySize.height }}>
            {/* 底层背景图片 */}
            <img 
              src={imageSrc} 
              alt="Background" 
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              style={{ width: '100%', height: '100%' }}
            />
            
            {/* 上层绘图画布 - 透明背景 */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 cursor-crosshair z-10"
              onMouseDown={(e) => {
                e.stopPropagation();
                startDrawing(e);
              }}
              onMouseMove={(e) => {
                e.stopPropagation();
                draw(e);
              }}
              onMouseUp={(e) => {
                e.stopPropagation();
                stopDrawing(e);
              }}
              onMouseLeave={(e) => {
                e.stopPropagation();
                stopDrawing(e);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                handleTouchStart(e);
              }}
              onTouchMove={(e) => {
                e.stopPropagation();
                handleTouchMove(e);
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                handleTouchEnd(e);
              }}
              style={{ width: '100%', height: '100%', touchAction: 'none' }}
            />
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md p-6 z-50 flex flex-col items-center gap-4">
        {/* Tools */}
        <div className="flex items-center gap-4 p-2 bg-zinc-900/80 rounded-xl overflow-x-auto max-w-full border border-zinc-800">
            {/* Tool Selection */}
            <div className="flex gap-1 bg-zinc-950/50 rounded-lg p-1">
              <button
                onClick={() => setCurrentTool('pen')}
                className={`p-2 rounded transition-colors ${
                  currentTool === 'pen' ? 'bg-zinc-100 text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
                title="画笔"
              >
                <Brush size={18} />
              </button>
              <button
                onClick={() => setCurrentTool('eraser')}
                className={`p-2 rounded transition-colors ${
                  currentTool === 'eraser' ? 'bg-zinc-100 text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
                title="橡皮擦"
              >
                <Eraser size={18} />
              </button>
            </div>

            <div className="w-px h-8 bg-zinc-800 mx-1" />

            {/* Colors */}
            {currentTool === 'pen' && (
                <div className="flex gap-1.5 items-center">
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => setCurrentColor(color)}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        currentColor === color ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-black' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
            )}
            
            <div className="w-px h-8 bg-zinc-800 mx-1" />

            {/* Brush Size */}
            <div className="flex gap-1 items-center">
                {brushSizes.map(size => (
                  <button
                    key={size}
                    onClick={() => setBrushSize(size)}
                    className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
                      brushSize === size ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <div 
                        className="rounded-full bg-current"
                        style={{ width: Math.max(2, size), height: Math.max(2, size) }}
                    />
                  </button>
                ))}
            </div>

            <div className="w-px h-8 bg-zinc-800 mx-1" />

            {/* Undo */}
            <button
              onClick={undo}
              disabled={historyStep <= 0}
              className="p-2 rounded text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="撤销"
            >
              <RotateCcw size={18} />
            </button>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
            <button 
                onClick={onCancel}
                className="px-6 py-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-800 transition-colors flex items-center gap-2"
            >
                <X size={16} />
                取消
            </button>
            <button 
                onClick={handleSave}
                className="px-6 py-2 rounded-full bg-zinc-100 text-zinc-900 text-sm font-bold hover:bg-white transition-colors flex items-center gap-2"
            >
                <Download size={16} />
                保存
            </button>
        </div>
      </div>
    </div>
  );
};