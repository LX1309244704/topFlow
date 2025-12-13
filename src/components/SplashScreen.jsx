import React, { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';

const SplashScreen = ({ onEnter }) => {
  const [sliderValue, setSliderValue] = useState(0);
  const sliderValueRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef(null);
  const containerRef = useRef(null);

  // Animation states
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    updateSlider(e.clientX);
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      updateSlider(e.clientX);
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      if (sliderValueRef.current > 90) {
        setSliderValue(100);
        sliderValueRef.current = 100;
        // Add a small delay for the completion animation
        setTimeout(onEnter, 300);
      } else {
        // Snap back
        const snapBack = () => {
          setSliderValue(prev => {
            const next = prev - 5;
            if (next <= 0) {
              sliderValueRef.current = 0;
              return 0;
            }
            sliderValueRef.current = next;
            requestAnimationFrame(snapBack);
            return next;
          });
        };
        requestAnimationFrame(snapBack);
      }
    }
  };

  const updateSlider = (clientX) => {
    if (sliderRef.current) {
      const rect = sliderRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = (x / rect.width) * 100;
      setSliderValue(percentage);
      sliderValueRef.current = percentage;
    }
  };

  // Touch events support
  const handleTouchStart = (e) => {
    setIsDragging(true);
    updateSlider(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    if (isDragging) {
      updateSlider(e.touches[0].clientX);
    }
  };

  const handleTouchEnd = () => {
    handleMouseUp();
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  // Calculate opacity for the "SLIDE TO ENTER" text
  const textOpacity = Math.max(0, 1 - sliderValue / 50);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#09090b] text-white flex flex-col items-center justify-center overflow-hidden font-sans select-none">
      
      {/* Background Ambience (Optional - Subtle Gradient) */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-950 to-black opacity-80 pointer-events-none" />

      {/* Main Content */}
      <div className={`relative z-10 flex flex-col items-center transition-all duration-1000 ease-out transform ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        
        {/* Title Section */}
        <div className="flex items-center gap-12 mb-16">
          {/* Left Title */}
          <div className="flex flex-col items-end text-right group">
            <h1 className="text-7xl md:text-8xl font-thin tracking-tighter text-zinc-100 transition-transform duration-700 group-hover:-translate-x-2">
              Top
            </h1>
            <div className="mt-2 space-y-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 flex flex-col items-end">
              <span className="text-xs font-medium tracking-[0.2em] text-zinc-500 uppercase">AI Workflow</span>
              <span className="text-[10px] text-zinc-600">智能工作流</span>
            </div>
          </div>

          {/* Vertical Divider */}
          <div className="w-[1px] h-32 bg-gradient-to-b from-transparent via-zinc-700 to-transparent" />

          {/* Right Title */}
          <div className="flex flex-col items-start text-left group">
            <h1 className="text-7xl md:text-8xl font-thin tracking-tighter text-zinc-100 transition-transform duration-700 group-hover:translate-x-2">
              Flow
            </h1>
            <div className="mt-2 space-y-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 flex flex-col items-start">
              <span className="text-xs font-medium tracking-[0.2em] text-zinc-500 uppercase">Limitless Canvas</span>
              <span className="text-[10px] text-zinc-600">无限画布</span>
            </div>
          </div>
        </div>

        {/* Quote Section */}
        <div className="mb-24 text-center max-w-md px-6">
          <p className="text-zinc-500 text-sm italic font-light tracking-wide">
            "Unleash your creativity with node-based AI generation."
          </p>
          <p className="text-zinc-600 text-xs mt-2">
            The modern act of sharing small digital treasures.
          </p>
        </div>

        {/* Slider Section */}
        <div 
          ref={sliderRef}
          className="relative w-72 h-14 bg-zinc-900/50 border border-zinc-800 rounded-full flex items-center px-1 cursor-pointer overflow-hidden backdrop-blur-sm group hover:border-zinc-700 transition-colors"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* Progress Fill (Subtle) */}
          <div 
            className="absolute inset-y-0 left-0 bg-zinc-800/30 transition-all duration-75 ease-linear"
            style={{ width: `${sliderValue}%` }}
          />

          {/* Slider Text */}
          <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300"
            style={{ opacity: textOpacity }}
          >
            <span className="text-[10px] font-medium tracking-[0.2em] text-zinc-500 group-hover:text-zinc-400 transition-colors">
              SLIDE TO ENTER
            </span>
          </div>

          {/* Thumb */}
          <div 
            className="relative z-10 w-12 h-12 bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.2)] flex items-center justify-center text-black transform transition-transform active:scale-95"
            style={{ 
              transform: `translateX(${Math.min(sliderValue * 2.3, 230)}px)` // 230px is approx max travel (288px width - 48px thumb - padding)
            }}
          >
            <Plus size={20} strokeWidth={1.5} className={`transition-transform duration-300 ${sliderValue > 90 ? 'rotate-90 scale-110' : ''}`} />
          </div>
        </div>

      </div>

      {/* Footer / Decorative Elements */}
      <div className="absolute bottom-8 left-0 right-0 px-12 flex justify-between items-end text-zinc-700 text-[10px] font-mono pointer-events-none">
        <div>00:00</div>
        <div className="flex-1 mx-4 h-[1px] bg-zinc-900">
           <div className="w-1/3 h-full bg-zinc-800"></div>
        </div>
        <div>01:15</div>
      </div>
    </div>
  );
};

export default SplashScreen;
