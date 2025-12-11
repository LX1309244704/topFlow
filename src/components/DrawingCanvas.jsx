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
        const maxWidth = window.innerWidth * 0.8;
        const maxHeight = window.innerHeight * 0.6;
        
        let canvasWidth = img.width;
        let canvasHeight = img.height;
        
        if (canvasWidth > maxWidth) {
          canvasHeight = (maxWidth / canvasWidth) * canvasHeight;
          canvasWidth = maxWidth;
        }
        
        if (canvasHeight > maxHeight) {
          canvasWidth = (maxHeight / canvasHeight) * canvasWidth;
          canvasHeight = maxHeight;
        }
        
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        canvas.style.width = canvasWidth + 'px';
        canvas.style.height = canvasHeight + 'px';
        
        // 清除画布并绘制图片
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
        
        // 初始化绘制设置
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        setIsCanvasReady(true);
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
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL();
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
            <Brush size={14} className="text-blue-400" />
            <span className="text-white text-sm font-medium">涂鸦编辑</span>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative w-full h-full p-8 flex items-center justify-center overflow-hidden bg-black">
        <div className="relative select-none max-w-full max-h-full flex items-center justify-center">
            <canvas
              ref={canvasRef}
              className="cursor-crosshair shadow-2xl"
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
              style={{ touchAction: 'none', maxWidth: '90vw', maxHeight: '80vh' }}
            />
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md p-6 z-50 flex flex-col items-center gap-4">
        {/* Tools */}
        <div className="flex items-center gap-4 p-2 bg-white/10 rounded-xl overflow-x-auto max-w-full">
            {/* Tool Selection */}
            <div className="flex gap-1 bg-black/40 rounded-lg p-1">
              <button
                onClick={() => setCurrentTool('pen')}
                className={`p-2 rounded transition-colors ${
                  currentTool === 'pen' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
                title="画笔"
              >
                <Brush size={18} />
              </button>
              <button
                onClick={() => setCurrentTool('eraser')}
                className={`p-2 rounded transition-colors ${
                  currentTool === 'eraser' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
                title="橡皮擦"
              >
                <Eraser size={18} />
              </button>
            </div>

            <div className="w-px h-8 bg-white/20 mx-1" />

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
            
            <div className="w-px h-8 bg-white/20 mx-1" />

            {/* Brush Size */}
            <div className="flex gap-1 items-center">
                {brushSizes.map(size => (
                  <button
                    key={size}
                    onClick={() => setBrushSize(size)}
                    className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
                      brushSize === size ? 'bg-white/20 text-white' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <div 
                        className="rounded-full bg-current"
                        style={{ width: Math.max(2, size), height: Math.max(2, size) }}
                    />
                  </button>
                ))}
            </div>

            <div className="w-px h-8 bg-white/20 mx-1" />

            {/* Undo */}
            <button
              onClick={undo}
              disabled={historyStep <= 0}
              className="p-2 rounded text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="撤销"
            >
              <RotateCcw size={18} />
            </button>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
            <button 
                onClick={onCancel}
                className="px-6 py-2 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors flex items-center gap-2"
            >
                <X size={16} />
                取消
            </button>
            <button 
                onClick={handleSave}
                className="px-6 py-2 rounded-full bg-white text-black text-sm font-bold hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
                <Download size={16} />
                保存
            </button>
        </div>
      </div>
    </div>
  );
};