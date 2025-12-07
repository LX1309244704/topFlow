import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mountain, Play, Video, Music, FileText, ImageIcon, Wand2, Download, Trash2, Square, Layers, ChevronDown, Sparkles, Search, RefreshCw, LinkIcon } from 'lucide-react';
import { Button, NodeSelect, InputBadge } from './UI.jsx';
import { downloadFile, NODE_WIDTHS } from '../constants.js';
import apiClient from '../api/client.js';

// 图片节点内容组件
export const ImageContent = ({ node, updateNode, isExpanded, handleGenerate, textInputLabel, generateText, linkedSources }) => {
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
    const selectedModel = node.data.model || "gemini-2.5";
    const rolePrompt = node.data.rolePrompt || '';
    
    updateNode(node.id, { data: { ...node.data, isWriting: true, streamingText: '' } });
    setDisplayText('');
    setCurrentCharIndex(0);
    
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    
    // 如果有角色提示词，则使用角色提示词格式
    let prompt;
    if (rolePrompt && rolePrompt.trim()) {
      prompt = `${rolePrompt}\n\n请基于以上角色设定，续写以下内容：${originalText}`;
    } else {
      prompt = `请续写以下故事或剧本（使用中文）：${originalText}`;
    }
    
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
    }, selectedModel);
    
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
    const selectedModel = node.data.model || "gemini-2.5";
    const rolePrompt = node.data.rolePrompt || '';
    
    // 如果有角色提示词，则使用角色提示词格式
    let prompt;
    if (rolePrompt && rolePrompt.trim()) {
      prompt = `${rolePrompt}\n\n请基于以上角色设定，分析以下文本并生成大纲：${node.data.text}`;
    } else {
      prompt = `请分析以下文本并生成大纲（使用中文）：${node.data.text}`;
    }
    
    handleAnalyze(prompt, selectedModel);
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
  
  // 文本模型选项
  const textModelOptions = [
    {value: "gemini-2.5", label: "Gemini 2.5"},
    {value: "gemini-3", label: "Gemini 3"}
  ];

  // 移除预设角色，只保留'无角色设定'选项

  // 获取自定义角色 - 简化逻辑，直接使用函数获取
  const [customRoles, setCustomRoles] = useState([]);

  // 加载角色数据的函数
  const loadRoles = () => {
    try {
      const saved = localStorage.getItem('topflow_custom_roles');
      if (saved) {
        const roles = JSON.parse(saved);
        // 过滤有效角色
        const filteredRoles = roles.filter(role => role && role.value && role.label);
        setCustomRoles(filteredRoles);
        console.log('Text节点加载角色数据:', filteredRoles.length, '个角色');
      } else {
        setCustomRoles([]);
        console.log('Text节点: 没有找到角色数据');
      }
    } catch (error) {
      console.error('加载自定义角色失败:', error);
      setCustomRoles([]);
    }
  };

  // 组件挂载时加载角色数据
  useEffect(() => {
    loadRoles();
  }, []);

  // 监听localStorage变化实现实时同步
  useEffect(() => {
    const handleStorageChange = () => {
      loadRoles();
    };

    // 监听storage事件（跨标签页同步）
    window.addEventListener('storage', handleStorageChange);
    
    // 监听自定义的localStorage变化事件（同标签页内同步）
    window.addEventListener('localStorageChange', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageChange', handleStorageChange);
    };
  }, []);

  // 角色选项 - 仅从资产角色库获取
  const allRoleOptions = [
    { value: '', label: '无角色设定' },
    ...(customRoles || []).filter(role => role && role.value && role.label) // 确保只包含有效的角色
  ];
  


  return (
    <div ref={textContentRef} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col cursor-text relative" onClick={e => e.stopPropagation()} onWheel={e => e.stopPropagation()} style={{ height: `${currentHeight}px`, minHeight: `${minHeight}px` }}>
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
        <div className="text-xs text-gray-500 font-medium">模型:</div>
        <NodeSelect 
          value={node.data.model || "gemini-2.5"} 
          options={textModelOptions} 
          onChange={v => updateNode(node.id, { data: { ...node.data, model: v } })} 
          className="flex-1" 
        />
      </div>
      
      {/* 角色设置区域 */}
      <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
        <div className="text-xs text-gray-500 font-medium mb-2">角色设定:</div>
        <div className="flex items-center gap-2">
          <NodeSelect 
            value={node.data.selectedRole || ""} 
            options={allRoleOptions} 
            onChange={v => {
              const selectedRole = allRoleOptions.find(role => role.value === v);
              updateNode(node.id, { 
                data: { 
                  ...node.data, 
                  selectedRole: v,
                  rolePrompt: selectedRole ? (selectedRole.prompt || selectedRole.value) : ''
                } 
              });
            }} 
            className="flex-1" 
          />
        </div>
      </div>
      
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
              <span className="flex items-center gap-1"><RefreshCw size={10} className="animate-spin"/> 生成中...</span> : 
              <span className="flex items-center gap-1"><Sparkles size={10}/> AI 生成</span>
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
          <textarea className="w-full text-sm bg-transparent border border-gray-100 rounded-md p-2 focus:ring-1 focus:ring-blue-200 outline-none resize-none pr-8" placeholder="视频描述..." rows={2} value={node.data.prompt} onChange={e => updateNode(node.id, { data: { ...node.data, prompt: e.target.value } })} onMouseDown={e => e.stopPropagation()} onWheel={e => e.stopPropagation()} />
          <button onClick={handleEnhance} className="absolute right-2 top-2 text-purple-400 hover:text-purple-600 transition-colors">
            <Wand2 size={14} />
          </button>
        </div>
        
        <div className="flex items-center gap-2 mt-1">
          <NodeSelect value={node.data.model || "svd"} options={videoModelOptions} onChange={v => updateNode(node.id, {data:{...node.data, model: v}})} className="flex-1" />
        </div>
        
        {/* 底部操作栏 - 确保生成按钮在右下角 */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-50 w-full">
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
          <button onClick={handleGenerate} className="flex items-center gap-1 bg-black text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:shadow-lg active:scale-95 ml-auto">
            <Wand2 size={10} className="fill-white" />生成
          </button>
        </div>
      </div>
    </>
  );
};

// 音频节点内容组件
export const AudioContent = ({ node, updateNode, isExpanded, handleGenerate, textInputLabel }) => {
  const audioMode = node.data.audioMode || 'speech'; // 默认为语音合成模式
  const minTextHeight = 80; // 最小文本输入框高度
  const currentTextHeight = node.data.textHeight || minTextHeight; // 当前文本输入框高度
  const [localResizing, setLocalResizing] = useState(false);
  const textAreaRef = useRef(null);
  
  // 音色选项
  const voiceOptions = [
    { value: "alloy", label: "Alloy (中性)" },
    { value: "echo", label: "Echo (男声)" },
    { value: "fable", label: "Fable (英式)" },
    { value: "onyx", label: "Onyx (深沉男声)" },
    { value: "nova", label: "Nova (女声)" },
    { value: "shimmer", label: "Shimmer (柔和女声)" }
  ];
  
  // 歌曲风格选项
  const styleOptions = [
    { value: "pop", label: "流行音乐" },
    { value: "rock", label: "摇滚" },
    { value: "jazz", label: "爵士" },
    { value: "classical", label: "古典" },
    { value: "electronic", label: "电子" },
    { value: "folk", label: "民谣" },
    { value: "country", label: "乡村" },
    { value: "hip-hop", label: "嘻哈" }
  ];
  
  // 拖拽调整文本输入框高度的逻辑
  const handleLocalResize = useCallback((e) => {
    if (!localResizing || !textAreaRef.current) return;
    const dy = e.clientY - textAreaRef.current.initialY;
    let newHeight = textAreaRef.current.initialHeight + dy;
    newHeight = Math.max(minTextHeight, newHeight);
    updateNode(node.id, { data: { ...node.data, textHeight: newHeight } });
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

  // 切换音频模式
  const toggleAudioMode = (mode) => {
    updateNode(node.id, { data: { ...node.data, audioMode: mode } });
  };
  
  // 获取当前模式的状态文本
  const getModeStatus = () => {
    if (audioMode === 'speech') {
      const voice = node.data.voice || 'alloy';
      const voiceOption = voiceOptions.find(v => v.value === voice);
      return { text: `语音合成 (${voiceOption?.label || voice})`, color: 'text-blue-500' };
    } else {
      const style = node.data.style || 'pop';
      const styleOption = styleOptions.find(s => s.value === style);
      return { text: `歌曲生成 (${styleOption?.label || style})`, color: 'text-purple-500' };
    }
  };
  
  const modeStatus = getModeStatus();
  
  return (
    <>
      <div className={`relative w-full h-24 bg-[#dbeafe] border overflow-hidden transition-all duration-300 cursor-pointer shadow-sm ${isExpanded ? 'rounded-t-2xl border-blue-200' : 'rounded-2xl border-[#60a5fa] hover:border-blue-600'}`}>
        {node.data.isGenerating ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-blue-50/50 backdrop-blur-sm">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-1" />
            <span className="text-[10px] text-blue-600 font-mono animate-pulse">
              {audioMode === 'song' ? '生成歌曲中...' : '合成语音中...'}
            </span>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-between px-6 group">
            {node.data.audioUrl ? (
              <audio controls src={node.data.audioUrl} className="w-full h-8" />
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-white/60 flex items-center justify-center text-blue-600 shadow-sm">
                  {audioMode === 'song' ? (
                    <Music size={16} />
                  ) : (
                    <Play size={16} fill="currentColor" className="ml-0.5" />
                  )}
                </div>
                <div className="flex items-center gap-1 h-8 opacity-60">
                  {[...Array(15)].map((_,i) => <div key={i} className="w-1 bg-blue-500 rounded-full" style={{ height: `${Math.random() * 100}%` }}></div>)}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      
      <div className={`bg-white shadow-xl border-x border-b border-gray-200 p-3 flex flex-col gap-3 relative z-10 ${isExpanded ? 'rounded-b-2xl opacity-100 max-h-[400px] py-3' : 'opacity-0 max-h-0 py-0 border-none rounded-b-2xl'}`} style={{ overflow: 'hidden' }}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-xs">
            {audioMode === 'song' ? (
              <Music size={12} className={modeStatus.color} />
            ) : (
              <Play size={12} className={modeStatus.color} />
            )}
            <span className={`font-semibold ${modeStatus.color}`}>{modeStatus.text}</span>
          </div>
          {textInputLabel && <InputBadge text={textInputLabel} type="text" />}
        </div>
        
        {/* 模式切换按钮 */}
        <div className="flex gap-2 p-1 bg-gray-50 rounded-lg">
          <button
            onClick={() => toggleAudioMode('speech')}
            className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-colors ${
              audioMode === 'speech' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            语音生成
          </button>
          <button
            onClick={() => toggleAudioMode('song')}
            className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-colors ${
              audioMode === 'song' 
                ? 'bg-white text-purple-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            歌曲生成
          </button>
        </div>
        
        {/* 文本/歌词输入区域 - 可调整高度 */}
        <div ref={textAreaRef} className="relative border border-gray-100 rounded-lg overflow-hidden" style={{ height: `${currentTextHeight}px` }}>
          <textarea 
            className="w-full h-full text-sm bg-transparent p-2 focus:ring-1 focus:ring-blue-200 outline-none resize-none border-none" 
            placeholder={audioMode === 'song' ? '输入歌词...' : '输入要朗读的文本...'} 
            value={audioMode === 'song' ? (node.data.lyrics || '') : (node.data.prompt || '')} 
            onChange={e => updateNode(node.id, { 
              data: { 
                ...node.data, 
                [audioMode === 'song' ? 'lyrics' : 'text']: e.target.value 
              } 
            })} 
            onMouseDown={e => e.stopPropagation()} 
            onWheel={e => e.stopPropagation()} 
          />
          {/* 拖拽调整高度的手柄 */}
          <div 
            className="absolute right-0 bottom-0 w-4 h-4 cursor-ns-resize z-10 text-gray-400 hover:text-blue-500 flex items-center justify-center transition-colors"
            onMouseDown={(e) => { 
              e.stopPropagation(); 
              textAreaRef.current.initialY = e.clientY; 
              textAreaRef.current.initialHeight = currentTextHeight; 
              setLocalResizing(true); 
            }}
          >
            <span className="w-1.5 h-1.5 bg-current rounded-full absolute -bottom-0.5 -right-0.5" />
          </div>
        </div>
        
        {/* 模式特定选项 */}
        {audioMode === 'speech' ? (
          <div className="flex items-center gap-2 mt-1">
            <NodeSelect 
              value={node.data.voice || "alloy"} 
              options={voiceOptions} 
              onChange={v => updateNode(node.id, { data: { ...node.data, voice: v } })} 
              className="flex-1" 
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-1">
            <NodeSelect 
              value={node.data.style || "pop"} 
              options={styleOptions} 
              onChange={v => updateNode(node.id, { data: { ...node.data, style: v } })} 
              className="flex-1" 
            />
          </div>
        )}
        
        <div className="flex justify-between items-center pt-2 border-t border-gray-50">
          <div className="flex gap-1.5">
            <NodeSelect 
              value={node.data.batchSize || 1} 
              options={[
                {value:1,label:"1x"}, 
                {value:2,label:"2x"}
              ]} 
              icon={Layers} 
              onChange={v => updateNode(node.id, { 
                data: {...node.data, batchSize: parseInt(v)} 
              })} 
              className="w-16" 
            />
          </div>
          <button 
            onClick={handleGenerate} 
            className="flex items-center gap-1 bg-black text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:shadow-lg active:scale-95"
          >
            <Wand2 size={10} className="fill-white" />
            {audioMode === 'song' ? '生成歌曲' : '生成音频'}
          </button>
        </div>
      </div>
    </>
  );
};