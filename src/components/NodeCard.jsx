import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { X, ChevronDown, ImageIcon, Video, Music, FileText, Zap } from 'lucide-react';
import { HandlePoint } from './UI.jsx';
import { ImageContent, TextContent, VideoContent, AudioContent } from './NodeContent.jsx';
import { NODE_WIDTHS } from '../constants.js';

const NodeCard = React.memo(({ 
  node, 
  updateNode, 
  isSelected, 
  onSelect, 
  onConnectStart, 
  onConnectEnd, 
  linkedSources, 
  onSpawnNodes, 
  onDelete, 
  apiFunctions, 
  onShowAssetModal 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  useEffect(() => { 
    if (!isSelected) setIsExpanded(false); 
  }, [isSelected]);

  const promptInputNode = linkedSources.textInput;
  const imageInputNodes = linkedSources.imageInputs;
  const promptFromSource = promptInputNode?.data?.text || node.data.prompt;
  const textInputLabel = useMemo(() => 
    promptInputNode ? `节点 #${promptInputNode.id.toString().slice(-4)}` : null, 
    [promptInputNode]
  );

  const handleGenerate = useCallback(async (e) => {
    e.stopPropagation();
    
    // 检查API Key是否有效
    if (!apiFunctions.checkApiKeyBeforeGenerate) {
      console.warn('API Key检查函数未找到，跳过验证');
    } else if (!apiFunctions.checkApiKeyBeforeGenerate()) {
      console.log('API Key验证失败，停止生成操作');
      return;
    }
    
    const prompt = promptFromSource;
    let referenceImage = null; 
    let referenceImages = []; 
    
    if (node.type === 'image') {
      if (imageInputNodes.length > 0) referenceImage = imageInputNodes[0].data.generatedImage;
      else if (node.data.generatedImage) referenceImage = node.data.generatedImage;
    } else if (node.type === 'video') {
      // 优先检查视频节点输入是否有 capturedFrame 或 lastFrame
      // 如果有视频节点作为输入，且该节点有 capturedFrame 或 lastFrame，则优先使用它作为参考图
      const videoInputNodes = linkedSources.videoInputs || [];
      const capturedFrames = videoInputNodes
        .map(n => n.data.capturedFrame || n.data.lastFrame)
        .filter(img => img && typeof img === 'string' && img.startsWith('data:'));
      
      let allReferences = [];
      
      if (capturedFrames.length > 0) {
        allReferences = [...capturedFrames];
      } else {
         // 如果没有截取帧或已保存的最后一帧，尝试使用videoUrl提取最后一帧（异步操作可能不适合这里同步获取，但我们尽力获取已有的数据）
         // 注意：这里的filter可能会漏掉只有videoUrl但没有lastFrame的情况
         // 但由于我们不能在渲染阶段异步提取，只能依赖已经提取好的数据
         // 所以确保NodeContent中正确提取并保存lastFrame至关重要
      }
      
      // 添加普通图片输入
      const normalImages = imageInputNodes.map(n => n.data.generatedImage).filter(img => img);
      if (normalImages.length > 0) {
        allReferences = [...allReferences, ...normalImages];
      }

      // 根据模型限制参考图数量
      const currentModel = node.data.model || "sora2";
      let maxImages = 0;
      if (currentModel === 'sora2') maxImages = 1;
      else if (currentModel === 'veo_3_1-fast') maxImages = 2;
      
      referenceImages = allReferences.slice(0, maxImages);
    }
    
    const isRefValid = referenceImage && typeof referenceImage === 'string' && referenceImage.startsWith('data:');

    if ((node.data.batchSize || 1) > 1) {
      if (onSpawnNodes) onSpawnNodes(node.id, prompt, isRefValid ? referenceImage : null); 
      return;
    }

    if (node.data.isGenerating) return;
    
    const hasReference = (node.type === 'image' && referenceImage) || (node.type === 'video' && referenceImages.length > 0);
    updateNode(node.id, { data: { ...node.data, isGenerating: true, usingReference: hasReference } });

    try {
      if (node.type === 'image') {
        // 确保比例参数正确传递
        const selectedRatio = node.data.ratio || "4:3";
        const selectedModel = node.data.model || "nano-banana";
        
        let url = null;
        
        try {
            if (referenceImage && isRefValid) {
                url = await apiFunctions.generateImageFromRef(prompt, referenceImage, selectedModel, selectedRatio);
            } else {
                url = await apiFunctions.generateImage(prompt, selectedModel, selectedRatio);
            }
        } catch (error) {
            console.error('❌ NodeCard图片生成API调用失败:', error);
            url = null;
        }
        
        // 如果API成功返回图片
        if (url && url !== null && url !== undefined) {
            setTimeout(() => {
                updateNode(node.id, { data: { ...node.data, isGenerating: false, generatedImage: url, usingReference: false } });
            }, 500); 
        } else {
            // 生成占位图片，确保使用正确的比例
            const [wRatio, hRatio] = selectedRatio.split(':').map(Number);
            const isPortrait = hRatio > wRatio;
            
            // 根据横竖图调整尺寸
            let mockWidth, mockHeight;
            if (isPortrait) {
                // 竖图，固定宽度为400像素
                mockWidth = 400;
                mockHeight = Math.round(mockWidth * hRatio / wRatio);
            } else {
                // 横图，固定宽度为800像素
                mockWidth = 800;
                mockHeight = Math.round(mockWidth * hRatio / wRatio);
            }
            
            const textContent = prompt ? prompt.split(/\s+/).slice(0, 3).join(' ') : 'Image';
            const mockUrl = `https://placehold.co/${mockWidth}x${mockHeight}/1d4ed8/ffffff?text=${encodeURIComponent(textContent)}`;
            
            const calculatedAspectRatio = wRatio / hRatio;
            
            updateNode(node.id, { 
                data: { 
                    ...node.data, 
                    isGenerating: false, 
                    generatedImage: mockUrl,
                    usingReference: false,
                    aspectRatio: calculatedAspectRatio 
                } 
            });
        }
      } else if (node.type === 'video') {
        setTimeout(() => {
          updateNode(node.id, { 
            data: { 
              ...node.data, 
              isGenerating: false, 
              generatedVideo: true, 
              videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4", 
              prompt: promptFromSource || node.data.prompt 
            } 
          });
        }, 2000);
      } else if (node.type === 'audio') {
        let audioUrl = null;
        // 根据音频节点模式选择不同的生成方法
        if (node.data.audioMode === 'song') {
          // 歌曲生成模式
          const lyrics = promptFromSource || node.data.lyrics || '';
          const style = node.data.style || 'pop';
          audioUrl = await apiFunctions.generateSong(lyrics, style);
        } else {
          // 默认语音合成模式
          const voice = node.data.voice || 'alloy';
          audioUrl = await apiFunctions.generateSpeech(promptFromSource, 'tts-1', voice);
        }
        
        setTimeout(() => {
          updateNode(node.id, { data: { ...node.data, isGenerating: false, audioUrl: audioUrl } });
        }, 500);
      }
    } catch (err) {
      updateNode(node.id, { data: { ...node.data, isGenerating: false, usingReference: false } });
    }
  }, [node.id, node.data, updateNode, node.type, onSpawnNodes, promptFromSource, imageInputNodes, apiFunctions]); 

  const toggleExpand = useCallback((e) => { 
    e.stopPropagation(); 
    setIsExpanded(!isExpanded); 
  }, [isExpanded]);

  const handleMouseDown = useCallback((e) => {
    // 如果是 Shift + 左键，不处理节点选择，让容器处理框选
    if (e.shiftKey && e.button === 0) {
      return; // 让事件冒泡到容器
    }
    onSelect(e, node.id);
  }, [onSelect, node.id]);
  
  const width = NODE_WIDTHS[node.type];
  let handleY = 120;
  
  if (node.type === 'image' || node.type === 'video') {
    const ratio = node.data.aspectRatio || (node.type === 'video' ? 16/9 : 4/3); 
    const previewHeight = width / ratio; 
    handleY = previewHeight / 2;
  } else if (node.type === 'audio') {
    handleY = 48;
  } else if (node.type === 'text') {
    handleY = (node.data.height || 200) / 2; 
  }

  const headerIcon = { 
    image: ImageIcon, 
    video: Video, 
    audio: Music, 
    text: FileText 
  }[node.type];
  
  const headerLabel = { 
    image: "Image", 
    video: "Video", 
    audio: "Audio", 
    text: "Text" 
  }[node.type];
  
  const headerColor = { 
    image: "text-zinc-300", 
    video: "text-zinc-300", 
    audio: "text-zinc-300", 
    text: "text-zinc-500" 
  }[node.type];

  return (
    <div 
      className={`absolute flex flex-col transition-all duration-200 ease-out group bg-zinc-950 rounded-xl ${isSelected ? 'ring-2 ring-zinc-100 shadow-xl z-50' : 'shadow-sm border border-zinc-800 hover:shadow-md'}`} 
      style={{ left: node.x, top: node.y, width, zIndex: isSelected || isExpanded ? 50 : 10 }} 
      onMouseDown={handleMouseDown}
      onMouseUp={(e) => {
        // 如果正在连接中，且释放鼠标在节点上，则触发连接结束
        // 注意：onConnectEnd 需要处理这种情况，通常它需要知道目标节点的 ID
        if (onConnectEnd) {
          onConnectEnd(node.id, e);
        }
      }}
    >
      <HandlePoint type="target" top={handleY} onMouseUp={(e) => onConnectEnd(node.id, e)} />
      <HandlePoint type="source" top={handleY} onMouseDown={(e) => onConnectStart(node.id, e)} />
      
      <button 
        onClick={(e) => { e.stopPropagation(); onDelete(node.id); }} 
        className="absolute -top-2 -right-2 w-6 h-6 bg-zinc-900 rounded-full shadow-md border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-red-500 hover:border-red-900 transition-all opacity-0 group-hover:opacity-100 z-[60]"
      >
        <X size={12} />
      </button>
      
      <div className="flex items-center justify-between px-3 py-2 cursor-grab active:cursor-grabbing handle select-none border-b border-zinc-900">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
          {React.createElement(headerIcon, { size: 14, strokeWidth: 2, className: "text-zinc-400" })}
          <span>{headerLabel}</span>
        </div>
        {node.type !== 'text' && <div className="text-[10px] text-zinc-600 font-mono">#{node.id.toString().slice(-4)}</div>}
      </div>
      
      <div className="p-1" onClick={node.type !== 'text' ? (e) => { e.stopPropagation(); setIsExpanded(true); } : undefined}>
        {node.type === 'text' && (
          <TextContent 
            node={node} 
            updateNode={updateNode} 
            generateText={apiFunctions.generateText} 
            generateStreamText={apiFunctions.generateStreamText} 
            handleAnalyze={(script) => apiFunctions.handleTextNodeAnalysis(script, node.id)} 
            isAnalyzing={node.data.isAnalyzing}
          />
        )}
        {node.type === 'image' && (
          <ImageContent 
            node={node} 
            updateNode={updateNode} 
            isExpanded={isExpanded} 
            handleGenerate={handleGenerate} 
            textInputLabel={null} 
            generateText={apiFunctions.generateText}
          />
        )}
        {node.type === 'video' && (
          <VideoContent 
            node={node} 
            updateNode={updateNode} 
            isExpanded={isExpanded} 
            handleGenerate={handleGenerate} 
            textInputLabel={null} 
            imageInputs={linkedSources.imageInputs} 
            linkedSources={linkedSources}
            generateText={apiFunctions.generateText}
          />
        )}
        {node.type === 'audio' && (
          <AudioContent 
            node={node} 
            updateNode={updateNode} 
            isExpanded={isExpanded} 
            handleGenerate={handleGenerate} 
            textInputLabel={null} 
          />
        )}
      </div>
      
      {isExpanded && (
        <button 
          onClick={toggleExpand} 
          className="absolute top-8 right-2 z-50 p-1 bg-zinc-900/90 rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 shadow-sm"
        >
          <ChevronDown size={14} className="rotate-180" />
        </button>
      )}
    </div>
  );
});

export default NodeCard;