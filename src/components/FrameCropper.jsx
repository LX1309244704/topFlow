import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Check, Crop, Move } from 'lucide-react';

export const FrameCropper = ({ imageSrc, onConfirm, onCancel }) => {
  const [aspectRatio, setAspectRatio] = useState(null); // null for free
  const [crop, setCrop] = useState({ x: 10, y: 10, width: 80, height: 80 }); // percentages
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cropStart, setCropStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [activeHandle, setActiveHandle] = useState(null);

  // Aspect ratios configuration
  const ratios = [
    { label: '自由', value: null },
    { label: '16:9', value: 16/9 },
    { label: '9:16', value: 9/16 },
    { label: '4:3', value: 4/3 },
    { label: '3:4', value: 3/4 },
    { label: '1:1', value: 1 },
  ];

  // Initialize crop when image loads or aspect ratio changes
  useEffect(() => {
    if (!aspectRatio || !containerRef.current) return;
    
    // Get current crop or use default centered box if initializing
    let currentWidth = crop.width;
    let currentHeight = crop.height;
    
    // If setting a ratio, recalculate height based on current width to fit the ratio immediately
    // We work in percentages relative to the container
    const containerRect = containerRef.current.getBoundingClientRect();
    const containerRatio = containerRect.width / containerRect.height;
    
    // Calculate new height percentage based on current width percentage
    // ratio = (width_px) / (height_px)
    // ratio = (w% * containerW) / (h% * containerH)
    // h% = (w% * containerW) / (ratio * containerH)
    // h% = w% * (containerW / containerH) / ratio
    let newHeight = currentWidth * containerRatio / aspectRatio;
    let newWidth = currentWidth;

    // Check if new height exceeds 100% or bounds
    if (crop.y + newHeight > 100) {
        // Try to move y up
        if (newHeight <= 100) {
             // Center vertically if possible or align to bottom
             const centerY = 50 - newHeight/2;
             // We can just update height and let the user move it, but better to keep it valid
        } else {
             // Height is too big, constrain by height instead
             newHeight = 50; // default to 50% height
             // w% = h% * ratio * (containerH / containerW)
             newWidth = newHeight * aspectRatio / containerRatio;
        }
    }
    
    // Recalculate to ensure it fits perfectly within the container (simpler approach: reset to center)
    // When switching ratios, it's often better to reset to a good default center crop
    // rather than trying to morph the existing arbitrary box which might be very distorted
    
    // Calculate a safe centered box
    const targetW_px = containerRect.width * 0.5; // Start with 50% width
    const targetH_px = targetW_px / aspectRatio;
    
    // Check if height fits
    let finalW_px, finalH_px;
    
    if (targetH_px > containerRect.height * 0.8) {
        // Too tall, constrain by height
        finalH_px = containerRect.height * 0.6;
        finalW_px = finalH_px * aspectRatio;
    } else {
        finalW_px = targetW_px;
        finalH_px = targetH_px;
    }
    
    const w_pct = (finalW_px / containerRect.width) * 100;
    const h_pct = (finalH_px / containerRect.height) * 100;
    
    setCrop({
        x: 50 - w_pct/2,
        y: 50 - h_pct/2,
        width: w_pct,
        height: h_pct
    });

  }, [aspectRatio]);

  const getClientPos = (e) => {
    if (e.touches && e.touches[0]) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  };

  const handleMouseDown = (e, handle = null) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = getClientPos(e);
    setIsDragging(true);
    setDragStart(pos);
    setCropStart({ ...crop });
    setActiveHandle(handle);
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();

    const pos = getClientPos(e);
    const containerRect = containerRef.current.getBoundingClientRect();
    
    const deltaX = ((pos.x - dragStart.x) / containerRect.width) * 100;
    const deltaY = ((pos.y - dragStart.y) / containerRect.height) * 100;

    let newCrop = { ...cropStart };

    if (activeHandle === 'move') {
      newCrop.x = Math.max(0, Math.min(100 - newCrop.width, cropStart.x + deltaX));
      newCrop.y = Math.max(0, Math.min(100 - newCrop.height, cropStart.y + deltaY));
    } else {
        // Resizing logic
        if (activeHandle?.includes('e')) newCrop.width = Math.min(100 - newCrop.x, Math.max(5, cropStart.width + deltaX));
        if (activeHandle?.includes('w')) {
            const maxDelta = cropStart.width - 5;
            const actualDelta = Math.min(maxDelta, Math.max(-cropStart.x, deltaX));
            newCrop.x += actualDelta;
            newCrop.width -= actualDelta;
        }
        if (activeHandle?.includes('s')) newCrop.height = Math.min(100 - newCrop.y, Math.max(5, cropStart.height + deltaY));
        if (activeHandle?.includes('n')) {
            const maxDelta = cropStart.height - 5;
            const actualDelta = Math.min(maxDelta, Math.max(-cropStart.y, deltaY));
            newCrop.y += actualDelta;
            newCrop.height -= actualDelta;
        }

        // Maintain aspect ratio if set
        if (aspectRatio) {
            const containerRatio = containerRect.width / containerRect.height;
            // Simplified ratio locking - prioritize width change
            if (activeHandle?.includes('e') || activeHandle?.includes('w')) {
                const targetHeight = (newCrop.width * containerRect.width) / aspectRatio / containerRect.height;
                // Check if height fits
                if (newCrop.y + targetHeight <= 100) {
                    newCrop.height = targetHeight;
                } else {
                    // Limit width based on max height
                    newCrop.height = 100 - newCrop.y;
                    newCrop.width = (newCrop.height * containerRect.height) * aspectRatio / containerRect.width;
                }
            } else if (activeHandle?.includes('n') || activeHandle?.includes('s')) {
                const targetWidth = (newCrop.height * containerRect.height) * aspectRatio / containerRect.width;
                 if (newCrop.x + targetWidth <= 100) {
                    newCrop.width = targetWidth;
                } else {
                    newCrop.width = 100 - newCrop.x;
                    newCrop.height = (newCrop.width * containerRect.width) / aspectRatio / containerRect.height;
                }
            }
        }
    }

    setCrop(newCrop);
  }, [isDragging, dragStart, cropStart, activeHandle, aspectRatio]);

  const handleMouseUp = () => {
    setIsDragging(false);
    setActiveHandle(null);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove]);

  const handleCropConfirm = () => {
    if (!imageRef.current) return;

    const canvas = document.createElement('canvas');
    const img = imageRef.current;
    
    // Get the actual displayed size of the image
    const rect = img.getBoundingClientRect();
    
    // Calculate scale factors between natural size and displayed size
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    
    // Calculate crop coordinates in pixels relative to the displayed image
    // crop state is in percentages (0-100)
    const cropX = (crop.x / 100) * rect.width;
    const cropY = (crop.y / 100) * rect.height;
    const cropW = (crop.width / 100) * rect.width;
    const cropH = (crop.height / 100) * rect.height;

    // Map to natural image coordinates
    let finalX = cropX * scaleX;
    let finalY = cropY * scaleY;
    let finalW = cropW * scaleX;
    let finalH = cropH * scaleY;

    // Enforce aspect ratio precision if one is selected
    // This fixes small floating point rounding errors that might make 16:9 look like 16.01:9
    if (aspectRatio) {
        // Adjust height to match width exactly according to ratio
        // (Alternatively we could adjust width, but usually width is the leading dimension)
        finalH = finalW / aspectRatio;
    }

    // Ensure we don't go out of bounds (floating point safety)
    finalX = Math.max(0, finalX);
    finalY = Math.max(0, finalY);
    finalW = Math.min(img.naturalWidth - finalX, finalW);
    finalH = Math.min(img.naturalHeight - finalY, finalH);

    // Set canvas size to the final cropped size
    canvas.width = finalW;
    canvas.height = finalH;
    
    const ctx = canvas.getContext('2d');
    // Use high quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.drawImage(
        img, 
        finalX, finalY, finalW, finalH, // Source rect
        0, 0, finalW, finalH            // Dest rect
    );
    
    const resultDataUrl = canvas.toDataURL('image/png');
    onConfirm(resultDataUrl);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 z-50 flex flex-col items-center pointer-events-none">
        <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-zinc-800 flex items-center gap-2 mb-2">
            <Crop size={14} className="text-zinc-100" />
            <span className="text-zinc-100 text-sm font-medium">局部分镜截取</span>
        </div>
        <div className="text-zinc-500 text-xs">拖拽四角调整 • 按住中间移动</div>
      </div>

      {/* Main Area */}
      <div className="relative w-full h-full p-8 flex items-center justify-center overflow-hidden bg-black">
        <div 
            ref={containerRef}
            className="relative max-w-full max-h-full select-none"
            style={{ width: 'fit-content', height: 'fit-content' }}
        >
            <img 
                ref={imageRef}
                src={imageSrc} 
                alt="Original" 
                className="max-w-[90vw] max-h-[80vh] object-contain block"
                draggable={false}
            />
            
            {/* Overlay - Darken non-cropped areas */}
            <div className="absolute inset-0 bg-black/60 pointer-events-none">
                {/* Cut out the crop area using clip-path */}
                <div 
                    className="absolute bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]"
                    style={{
                        left: `${crop.x}%`,
                        top: `${crop.y}%`,
                        width: `${crop.width}%`,
                        height: `${crop.height}%`,
                    }}
                />
            </div>

            {/* Crop Box */}
            <div 
                className="absolute border-2 border-white box-border cursor-move group"
                style={{
                    left: `${crop.x}%`,
                    top: `${crop.y}%`,
                    width: `${crop.width}%`,
                    height: `${crop.height}%`,
                }}
                onMouseDown={(e) => handleMouseDown(e, 'move')}
                onTouchStart={(e) => handleMouseDown(e, 'move')}
            >
                {/* Grid Lines */}
                <div className="absolute inset-0 flex flex-col pointer-events-none opacity-0 group-hover:opacity-30 transition-opacity">
                    <div className="flex-1 border-b border-white/50" />
                    <div className="flex-1 border-b border-white/50" />
                    <div className="flex-1" />
                </div>
                <div className="absolute inset-0 flex pointer-events-none opacity-0 group-hover:opacity-30 transition-opacity">
                    <div className="flex-1 border-r border-white/50" />
                    <div className="flex-1 border-r border-white/50" />
                    <div className="flex-1" />
                </div>

                {/* Handles */}
                {/* Corners */}
                <div 
                    className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-2 border-l-2 border-white cursor-nw-resize z-20 hover:scale-125 transition-transform bg-transparent"
                    onMouseDown={(e) => handleMouseDown(e, 'nw')}
                    onTouchStart={(e) => handleMouseDown(e, 'nw')}
                />
                <div 
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-2 border-r-2 border-white cursor-ne-resize z-20 hover:scale-125 transition-transform bg-transparent"
                    onMouseDown={(e) => handleMouseDown(e, 'ne')}
                    onTouchStart={(e) => handleMouseDown(e, 'ne')}
                />
                <div 
                    className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-2 border-l-2 border-white cursor-sw-resize z-20 hover:scale-125 transition-transform bg-transparent"
                    onMouseDown={(e) => handleMouseDown(e, 'sw')}
                    onTouchStart={(e) => handleMouseDown(e, 'sw')}
                />
                <div 
                    className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-2 border-r-2 border-white cursor-se-resize z-20 hover:scale-125 transition-transform bg-transparent"
                    onMouseDown={(e) => handleMouseDown(e, 'se')}
                    onTouchStart={(e) => handleMouseDown(e, 'se')}
                />
                
                {/* Edges - Simplified for better touch/click targets */}
                <div className="absolute top-0 left-4 right-4 h-2 cursor-n-resize -mt-1" onMouseDown={(e) => handleMouseDown(e, 'n')} />
                <div className="absolute bottom-0 left-4 right-4 h-2 cursor-s-resize -mb-1" onMouseDown={(e) => handleMouseDown(e, 's')} />
                <div className="absolute left-0 top-4 bottom-4 w-2 cursor-w-resize -ml-1" onMouseDown={(e) => handleMouseDown(e, 'w')} />
                <div className="absolute right-0 top-4 bottom-4 w-2 cursor-e-resize -mr-1" onMouseDown={(e) => handleMouseDown(e, 'e')} />

                {/* Size Indicator */}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {Math.round(crop.width)}% x {Math.round(crop.height)}%
                </div>
            </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md p-6 z-50 flex flex-col items-center gap-4">
        {/* Ratios */}
        <div className="flex items-center gap-2 p-1 bg-zinc-900 border border-zinc-800 rounded-lg overflow-x-auto max-w-full">
            {ratios.map(r => (
                <button
                    key={r.label}
                    onClick={() => setAspectRatio(r.value)}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                        aspectRatio === r.value 
                            ? 'bg-zinc-100 text-zinc-900 shadow-lg' 
                            : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
                    }`}
                >
                    {r.label}
                </button>
            ))}
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
                onClick={handleCropConfirm}
                className="px-6 py-2 rounded-full bg-zinc-100 text-zinc-900 text-sm font-bold hover:bg-white transition-colors flex items-center gap-2"
            >
                <Check size={16} />
                确认裁剪
            </button>
        </div>
      </div>
    </div>
  );
};
