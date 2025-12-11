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
      className="fixed inset-0 bg-black bg-opacity-80 z-[999] flex items-center justify-center p-8"
      onMouseDown={onCancel}
      onTouchStart={onCancel}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden" 
        style={{ 
          width: 'auto',
          height: 'auto',
          maxWidth: '90vw',
          maxHeight: '90vh'
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* 工具栏 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            {/* 工具选择 */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setCurrentTool('pen')}
                className={`p-2 rounded transition-colors ${
                  currentTool === 'pen' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                }`}
                title="画笔"
              >
                <Brush size={16} />
              </button>
              <button
                onClick={() => setCurrentTool('eraser')}
                className={`p-2 rounded transition-colors ${
                  currentTool === 'eraser' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                }`}
                title="橡皮擦"
              >
                <Eraser size={16} />
              </button>
            </div>

            {/* 颜色选择 */}
            {currentTool === 'pen' && (
              <div className="flex items-center gap-2 ml-4">
                <Palette size={16} className="text-gray-600" />
                <div className="flex gap-1">
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => setCurrentColor(color)}
                      className={`w-6 h-6 rounded border-2 transition-transform ${
                        currentColor === color ? 'border-blue-500 scale-110' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 画笔大小 */}
            <div className="flex items-center gap-2 ml-4">
              <span className="text-sm text-gray-600">大小:</span>
              <div className="flex gap-1">
                {brushSizes.map(size => (
                  <button
                    key={size}
                    onClick={() => setBrushSize(size)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      brushSize === size ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* 撤销按钮 */}
            <button
              onClick={undo}
              disabled={historyStep <= 0}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="撤销"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Download size={16} />
              保存
            </button>
            <button
              onClick={onCancel}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <X size={16} />
              取消
            </button>
          </div>
        </div>

        {/* 画布区域 */}
        <div className="flex-1 bg-gray-50 flex items-center justify-center p-8">
          <div className="relative bg-white p-4 rounded-lg shadow-inner">
            <canvas
              ref={canvasRef}
              className="border border-gray-300 rounded cursor-crosshair"
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
              style={{ touchAction: 'none', maxWidth: '100%', maxHeight: '100%' }}
            />
          </div>
        </div>

        {/* 提示信息 */}
        <div className="p-2 bg-gray-100 text-center text-sm text-gray-600">
          使用鼠标或触摸屏在图片上绘制 • 选择工具和颜色进行涂鸦 • 点击保存应用更改
        </div>
      </div>
    </div>
  );
};