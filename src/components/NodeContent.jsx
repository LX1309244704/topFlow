import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mountain, Play, Video, Music, FileText, ImageIcon, Wand2, Download, Trash2, Square, Layers, ChevronDown, Sparkles, Search, RefreshCw, LinkIcon } from 'lucide-react';
import { Button, NodeSelect, InputBadge } from './UI.jsx';
import { downloadFile, NODE_WIDTHS } from '../constants.js';

// 图片节点内容组件
export const ImageContent = ({ node, updateNode, isExpanded, handleGenerate, textInputLabel, generateText }) => {
  const modelOptions = [
    { value: "imagen-4", label: "Imagen 4.0 (AI)" },
    { value: "nano-banana", label: "Nano Banana" },
    { value: "sdxl", label: "SDXL Lightning" },
  ];
  const fileRef = useRef(null);

  useEffect(() => {
    const generatedImage = node.data.generatedImage;
    const currentAspect = node.data.aspectRatio;
    if (generatedImage && typeof generatedImage === 'string' && generatedImage.startsWith('data:')) {
      const img = new Image();
      img.onload = () => {
        const aspect = img.width / img.height;
        if (Math.abs(aspect - currentAspect) > 0.01) {
          updateNode(node.id, { data: { ...node.data, aspectRatio: aspect } });
        }
      };
      img.src = generatedImage;
    }
  }, [node.data.generatedImage, node.id, updateNode, node.data.aspectRatio]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const aspect = img.width / img.height;
          updateNode(node.id, { data: { ...node.data, generatedImage: reader.result, aspectRatio: aspect } });
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEnhance = async () => {
    if (!node.data.prompt) return;
    updateNode(node.id, { data: { ...node.data, isGenerating: true } });
    const enhanced = await generateText(`Rewrite this image prompt to be more descriptive...: ${node.data.prompt}`);
    updateNode(node.id, { data: { ...node.data, prompt: enhanced, isGenerating: false } });
  };
  
  const handleDownload = () => {
    downloadFile(node.data.generatedImage, `image-${node.id}.png`);
  };

  const handleClearImage = () => {
    updateNode(node.id, { data: { ...node.data, generatedImage: null } });
  };
  
  const currentAspect = node.data.aspectRatio || 4/3;

  return (
    <>
      <div className={`relative w-full bg-[#dbeafe] border overflow-hidden transition-all duration-300 cursor-pointer shadow-sm group ${isExpanded ? 'rounded-t-2xl border-blue-200' : 'rounded-2xl border-[#60a5fa] hover:border-blue-600'}`} style={{ aspectRatio: currentAspect }}>
        {node.data.isGenerating ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-blue-50/50 backdrop-blur-sm">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
            <span className="text-xs text-blue-600 font-bold animate-pulse">Generating...</span>
          </div>
        ) : node.data.generatedImage ? (
          <>
            <img src={node.data.generatedImage} alt="Gen" className="w-full h-full object-cover select-none" draggable={false} onDragStart={(e) => e.preventDefault()} />
            <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
              <button onClick={(e) => { e.stopPropagation(); handleDownload(); }} className="p-1.5 bg-white/80 hover:bg-white text-gray-700 rounded-full shadow-sm backdrop-blur-sm transition-colors" title="下载图片">
                <Download size={14} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleClearImage(); }} className="p-1.5 bg-white/80 hover:bg-white text-red-500 rounded-full shadow-sm backdrop-blur-sm transition-colors" title="清除图片">
                <Trash2 size={14} />
              </button>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Mountain size={64} className="text-blue-200/80" />
          </div>
        )}
      </div>
      <div className={`bg-white shadow-xl border-x border-b border-gray-200 p-3 flex flex-col gap-3 relative z-10 ${isExpanded ? 'rounded-b-2xl opacity-100 max-h-[350px] py-3' : 'opacity-0 max-h-0 py-0 border-none rounded-b-2xl'}`} style={{ overflow: 'hidden' }}>
        {textInputLabel && <InputBadge text={textInputLabel} type="text" />}
        <div className="relative">
          <textarea className="w-full text-sm bg-transparent border border-gray-100 rounded-md p-2 focus:ring-1 focus:ring-blue-200 outline-none resize-none pr-8" placeholder="描述画面..." rows={2} value={node.data.prompt || ''} onChange={e => updateNode(node.id, { data: { ...node.data, prompt: e.target.value } })} onMouseDown={e => e.stopPropagation()} onWheel={e => e.stopPropagation()} />
          <button onClick={handleEnhance} className="absolute right-2 top-2 text-purple-400 hover:text-purple-600 transition-colors">
            <Wand2 size={14} />
          </button>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <NodeSelect value={node.data.model || "imagen-4"} options={modelOptions} onChange={v => updateNode(node.id, { data: {...node.data, model: v} })} className="flex-1" />
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-gray-50">
          <div className="flex gap-1.5">
            <NodeSelect 
              value={node.data.ratio || "4:3"} 
              options={[
                {value:"1:1",label:"1:1"}, 
                {value:"4:3",label:"4:3"}, 
                {value:"16:9",label:"16:9"}, 
                {value:"3:4",label:"3:4"}, 
                {value:"9:16",label:"9:16"}
              ]} 
              icon={Square} 
              onChange={v => { 
                const [w, h] = v.split(':').map(Number); 
                updateNode(node.id, { 
                  data: {...node.data, ratio: v, aspectRatio: w/h} 
                }); 
              }} 
              className="w-20" 
            />
            <NodeSelect 
              value={node.data.batchSize || 1} 
              options={[
                {value:1,label:"1x"}, 
                {value:2,label:"2x"}, 
                {value:4,label:"4x"}
              ]} 
              icon={Layers} 
              onChange={v => updateNode(node.id, { 
                data: {...node.data, batchSize: parseInt(v)} 
              })} 
              className="w-16" 
            />
            <button onClick={() => fileRef.current?.click()} className="p-1.5 hover:bg-gray-100 rounded text-gray-400">
              <ImageIcon size={14}/>
            </button>
            <input type="file" ref={fileRef} className="hidden" onChange={handleImageUpload} />
          </div>
          <button onClick={handleGenerate} className="flex items-center gap-1 bg-black text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:shadow-lg active:scale-95">
            <Wand2 size={10} className="fill-white" />生成
          </button>
        </div>
      </div>
    </>
  );
};

// 文本节点内容组件
export const TextContent = ({ node, updateNode, generateText, generateStreamText, handleAnalyze, isAnalyzing }) => {
  const minHeight = 160;
  const currentHeight = node.data.height || minHeight;
  const [localResizing, setLocalResizing] = useState(false);
  const isWriting = !!node.data.isWriting;
  const textContentRef = useRef(null);
  const [displayText, setDisplayText] = useState('');
  const typingIntervalRef = useRef(null);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  
  // 打字机效果
  useEffect(() => {
    const streamingText = node.data.streamingText || '';
    
    if (isWriting && streamingText && streamingText.length > 0) {
      setCurrentCharIndex(0);
      setDisplayText('');
      
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
      
      typingIntervalRef.current = setInterval(() => {
        setCurrentCharIndex(prev => {
          if (prev < streamingText.length) {
            const newText = streamingText.substring(0, prev + 1);
            setDisplayText(newText);
            return prev + 1;
          } else {
            if (typingIntervalRef.current) {
              clearInterval(typingIntervalRef.current);
              typingIntervalRef.current = null;
            }
            return prev;
          }
        });
      }, 30);
      
      return () => {
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }
      };
    } else if (!isWriting) {
      setDisplayText('');
      setCurrentCharIndex(0);
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
    }
  }, [isWriting, node.data.streamingText]);

  const handleAIWrite = async () => {
    if (!node.data.text || isWriting || isAnalyzing) return;
    
    const originalText = node.data.text || '';
    
    updateNode(node.id, { data: { ...node.data, isWriting: true, streamingText: '' } });
    setDisplayText('');
    setCurrentCharIndex(0);
    
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    
    const prompt = `请续写以下故事或剧本（使用中文）：${originalText}`;
    
    let accumulatedText = '';
    const finalResult = await generateStreamText(prompt, (chunk) => {
      if (chunk && chunk.trim() && chunk !== undefined && chunk !== null) {
        accumulatedText += chunk;
        updateNode(node.id, { 
          data: { 
            ...node.data, 
            streamingText: accumulatedText
          } 
        });
      }
    });
    
    updateNode(node.id, { 
      data: { 
        ...node.data, 
        text: originalText + "\n\n" + (accumulatedText || finalResult || ''), 
        streamingText: '',
        isWriting: false 
      } 
    });
    
    setDisplayText('');
    setCurrentCharIndex(0);
    
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
  };
  
  const handleAnalysisClick = async () => {
    if (!node.data.text || isWriting || isAnalyzing) return;
    handleAnalyze(node.data.text);
  };
  
  const handleLocalResize = useCallback((e) => {
    if (!localResizing || !textContentRef.current) return;
    const dy = e.clientY - textContentRef.current.initialY;
    let newHeight = textContentRef.current.initialHeight + dy;
    newHeight = Math.max(minHeight, newHeight);
    updateNode(node.id, { data: { ...node.data, height: newHeight } });
  }, [localResizing, updateNode, node.id, node.data]);

  const handleLocalResizeEnd = useCallback(() => {
    setLocalResizing(false);
    document.body.style.cursor = 'default';
  }, []);

  useEffect(() => {
    if (localResizing) {
      window.addEventListener('mousemove', handleLocalResize);
      window.addEventListener('mouseup', handleLocalResizeEnd);
      document.body.style.cursor = 'ns-resize';
    } else {
      window.removeEventListener('mousemove', handleLocalResize);
      window.removeEventListener('mouseup', handleLocalResizeEnd);
      document.body.style.cursor = 'default';
    }
    return () => {
      window.removeEventListener('mousemove', handleLocalResize);
      window.removeEventListener('mouseup', handleLocalResizeEnd);
    };
  }, [localResizing, handleLocalResize, handleLocalResizeEnd]);

  const isAiWorking = isAnalyzing || isWriting;

  return (
    <div ref={textContentRef} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col cursor-text relative" onClick={e => e.stopPropagation()} onWheel={e => e.stopPropagation()} style={{ height: `${currentHeight}px`, minHeight: `${minHeight}px` }}>
      <div className="flex-1 p-4 relative group">
        <textarea 
          className="w-full h-full text-sm bg-transparent border-none outline-none resize-none p-0 focus:ring-0 leading-relaxed placeholder-gray-300" 
          placeholder="输入剧本..." 
          value={(() => {
            const baseText = node.data.text || '';
            if (isWriting) {
              return baseText + (displayText ? "\n\n" + displayText : '');
            } else {
              return baseText;
            }
          })()} 
          onChange={e => updateNode(node.id, { data: { ...node.data, text: e.target.value } })} 
          onMouseDown={e => e.stopPropagation()} 
          onWheel={e => e.stopPropagation()}
          readOnly={isWriting}
        />
        {isWriting && (
          <div className="absolute bottom-2 left-4 text-xs text-blue-500 animate-pulse">
            正在生成内容...
          </div>
        )}
        <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={handleAnalysisClick} className="bg-purple-50 text-purple-600 px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 hover:bg-purple-100 disabled:opacity-50" disabled={isAiWorking}>
            {isAnalyzing ? 
              <span className="flex items-center gap-1"><RefreshCw size={10} className="animate-spin"/> 分析中...</span> : 
              <span className="flex items-center gap-1"><Search size={10}/> 生成大纲</span>
            }
          </button>
          <button onClick={handleAIWrite} className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 hover:bg-blue-100 disabled:opacity-50" disabled={isAiWorking}>
            {isWriting ? 
              <span className="flex items-center gap-1"><RefreshCw size={10} className="animate-spin"/> 续写中...</span> : 
              <span className="flex items-center gap-1"><Sparkles size={10}/> AI 续写</span>
            }
          </button>
        </div>
      </div>
      <div className="bg-gray-50 px-3 py-2 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400 rounded-b-2xl">
        <span>{(node.data.text?.length || 0) + (node.data.streamingText?.length || 0)} 字符</span>
        <div className="absolute right-0 bottom-0 w-4 h-4 cursor-ns-resize z-10 text-gray-400 hover:text-blue-500 flex items-center justify-center transition-colors"
          onMouseDown={(e) => { 
            e.stopPropagation(); 
            textContentRef.current.initialY = e.clientY; 
            textContentRef.current.initialHeight = currentHeight; 
            setLocalResizing(true); 
          }}
        >
          <span className="w-1.5 h-1.5 bg-current rounded-full absolute -bottom-0.5 -right-0.5" />
        </div>
      </div>
    </div>
  );
};

// 视频节点内容组件
export const VideoContent = ({ node, updateNode, isExpanded, handleGenerate, textInputLabel, imageInputs, generateText }) => {
  const videoModelOptions = [
    {value:"svd",label:"Stable Video Diffusion"}, 
    {value:"gen2",label:"Runway Gen-2"}, 
    {value:"pika",label:"Pika Labs"}, 
    {value:"luma",label:"Luma Dream Machine"}
  ];
  
  const handleEnhance = async () => {
    if (!node.data.prompt) return;
    updateNode(node.id, { data: { ...node.data, isGenerating: true } });
    const enhanced = await generateText(`Rewrite this video generation prompt...: ${node.data.prompt}`);
    updateNode(node.id, { data: { ...node.data, prompt: enhanced, isGenerating: false } });
  };
  
  const handleDownload = () => {
    if (node.data.videoUrl) {
      downloadFile(node.data.videoUrl, `video-${node.id}.mp4`);
    }
  };

  const handleClearVideo = () => {
    updateNode(node.id, { data: { ...node.data, videoUrl: null, generatedVideo: false } });
  };

  const imageCount = imageInputs.length;
  let inputStatusText = imageCount === 0 ? '文生视频模式 (T2V)' : imageCount === 1 ? '参考图生视频模式 (I2V)' : `首尾帧生视频模式 (${imageCount} Refs)`;
  let inputStatusColor = imageCount === 0 ? 'text-gray-500' : imageCount === 1 ? 'text-orange-500' : 'text-purple-500';

  return (
    <>
      <div className={`relative w-full bg-[#dbeafe] border overflow-hidden transition-all duration-300 cursor-pointer shadow-sm group ${isExpanded ? 'rounded-t-2xl border-blue-200' : 'rounded-2xl border-[#60a5fa] hover:border-blue-600'}`} style={{ aspectRatio: node.data.aspectRatio || 16/9 }}>
        {node.data.isGenerating ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-blue-50/50 backdrop-blur-sm">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
            <span className="text-xs text-blue-600 font-bold animate-pulse">AI Processing...</span>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center group">
            {node.data.videoUrl ? (
              <video src={node.data.videoUrl} controls className="w-full h-full object-cover" />
            ) : (
              node.data.generatedVideo ? 
                <Play size={48} className="text-blue-600 opacity-80" /> : 
                <Video size={64} className="text-blue-200/80" />
            )}
            {(node.data.videoUrl || node.data.generatedVideo) && !node.data.isGenerating && (
              <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                {node.data.videoUrl && (
                  <button onClick={(e) => { e.stopPropagation(); handleDownload(); }} className="p-1.5 bg-white/80 hover:bg-white text-gray-700 rounded-full shadow-sm backdrop-blur-sm transition-colors" title="下载视频">
                    <Download size={14} />
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); handleClearVideo(); }} className="p-1.5 bg-white/80 hover:bg-white text-red-500 rounded-full shadow-sm backdrop-blur-sm transition-colors" title="清除视频">
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className={`bg-white shadow-xl border-x border-b border-gray-200 p-3 flex flex-col gap-3 relative z-10 ${isExpanded ? 'rounded-b-2xl opacity-100 max-h-[350px] py-3' : 'opacity-0 max-h-0 py-0 border-none rounded-b-2xl'}`} style={{ overflow: 'hidden' }}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-xs">
            <Play size={12} className={inputStatusColor} />
            <span className={`font-semibold ${inputStatusColor}`}>{inputStatusText}</span>
          </div>
          {textInputLabel && <InputBadge text={textInputLabel} type="text" />}
        </div>
        <div className="relative">
          <textarea className="w-full text-sm bg-transparent border border-gray-100 rounded-lg p-2 focus:ring-1 focus:ring-blue-200 outline-none resize-none pr-8" placeholder="视频描述..." rows={2} value={node.data.prompt} onChange={e => updateNode(node.id, { data: { ...node.data, prompt: e.target.value } })} onMouseDown={e => e.stopPropagation()} onWheel={e => e.stopPropagation()} />
          <button onClick={handleEnhance} className="absolute right-2 top-2 text-purple-400 hover:text-purple-600 transition-colors">
            <Wand2 size={14} />
          </button>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <NodeSelect value={node.data.model || "svd"} options={videoModelOptions} onChange={v => updateNode(node.id, {data:{...node.data, model: v}})} className="flex-1" />
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-gray-50">
          <div className="flex gap-1.5">
            <NodeSelect 
              value={node.data.ratio || "16:9"} 
              options={[
                {value:"16:9",label:"16:9"}, 
                {value:"9:16",label:"9:16"}, 
                {value:"1:1",label:"1:1"}
              ]} 
              icon={Square} 
              onChange={v => updateNode(node.id, { data: {...node.data, ratio: v} })} 
              className="w-20" 
            />
            <NodeSelect 
              value={node.data.batchSize || 1} 
              options={[
                {value:1,label:"1x"}, 
                {value:2,label:"2x"}
              ]} 
              icon={Layers} 
              onChange={v => updateNode(node.id, { data: {...node.data, batchSize: parseInt(v)} })} 
              className="w-16" 
            />
          </div>
          <button onClick={handleGenerate} className="flex items-center gap-1 bg-black text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:shadow-lg active:scale-95">
            <Wand2 size={10} className="fill-white" />生成
          </button>
        </div>
      </div>
    </>
  );
};

// 音频节点内容组件
export const AudioContent = ({ node, updateNode, isExpanded, handleGenerate, textInputLabel }) => (
  <>
    <div className={`relative w-full h-24 bg-[#dbeafe] border overflow-hidden transition-all duration-300 cursor-pointer shadow-sm ${isExpanded ? 'rounded-t-2xl border-blue-200' : 'rounded-2xl border-[#60a5fa] hover:border-blue-600'}`}>
      {node.data.isGenerating ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-blue-50/50 backdrop-blur-sm">
          <span className="text-[10px] text-blue-600 font-mono animate-pulse">Synthesizing...</span>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-between px-6 group">
          {node.data.audioUrl ? (
            <audio controls src={node.data.audioUrl} className="w-full h-8" />
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-white/60 flex items-center justify-center text-blue-600 shadow-sm">
                <Play size={16} fill="currentColor" className="ml-0.5" />
              </div>
              <div className="flex items-center gap-1 h-8 opacity-60">
                {[...Array(15)].map((_,i) => <div key={i} className="w-1 bg-blue-500 rounded-full" style={{ height: `${Math.random() * 100}%` }}></div>)}
              </div>
            </>
          )}
        </div>
      )}
    </div>
    <div className={`bg-white shadow-xl border-x border-b border-gray-200 p-3 flex flex-col gap-3 relative z-10 ${isExpanded ? 'rounded-b-2xl opacity-100 max-h-[200px] py-3' : 'opacity-0 max-h-0 py-0 border-none rounded-b-2xl'}`} style={{ overflow: 'hidden' }}>
      {textInputLabel && <InputBadge text={textInputLabel} type="text" />}
      <textarea className="w-full text-sm bg-transparent border-none outline-none resize-none p-0 focus:ring-0" placeholder="输入要朗读的文本..." rows={2} value={node.data.prompt} onChange={e => updateNode(node.id, { data: { ...node.data, text: e.target.value } })} onMouseDown={e => e.stopPropagation()} onWheel={e => e.stopPropagation()} />
      <div className="flex justify-between items-center pt-2 border-t border-gray-50">
        <button onClick={handleGenerate} className="flex items-center gap-1 bg-black text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:shadow-lg active:scale-95">
          <Wand2 size={10} className="fill-white" />生成音频
        </button>
      </div>
    </div>
  </>
);