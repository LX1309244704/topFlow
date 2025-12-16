import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { X, ChevronDown, ImageIcon, Video, Music, FileText, Zap } from 'lucide-react';
import { HandlePoint } from './UI.jsx';
import { ImageContent, TextContent, VideoContent, AudioContent } from './NodeContent.jsx';
import { NODE_WIDTHS } from '../constants.js';
import { indexedDBManager } from '../utils/indexedDB.js';

const NodeCard = React.memo(({ 
  node, 
  updateNode, 
  isSelected, 
  onSelect, 
  onConnectStart, 
  onConnectEnd, 
  linkedSources, 
  imageInputs,
  videoInputs,
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
  const imageInputNodes = imageInputs || linkedSources.imageInputs || [];
  const videoInputNodes = videoInputs || linkedSources.videoInputs || [];
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
        // 支持多张参考图：使用所有连接的图片节点的图片
        // 优先使用涂鸦图片(doodleImage)，如果没有则使用生成的基础图片(generatedImage)
        referenceImages = imageInputNodes.map(n => n.data.doodleImage || n.data.generatedImage).filter(img => img);
        // 向后兼容：如果只有一张参考图，使用单参考图模式
        if (referenceImages.length > 0) referenceImage = referenceImages[0];
        else if (node.data.generatedImage) referenceImage = node.data.doodleImage || node.data.generatedImage;
    } else if (node.type === 'video') {
        // 支持图片节点和视频节点作为输入源
        // 优先使用涂鸦图片(doodleImage)，如果没有则使用生成的基础图片(generatedImage)
        referenceImages = imageInputNodes.map(n => n.data.doodleImage || n.data.generatedImage).filter(img => img);
        
        // 处理视频节点输入：优先使用截取帧，其次使用缓存的尾帧
        if (videoInputNodes.length > 0) {
            for (const videoNode of videoInputNodes) {
                if (videoNode.data.capturedFrame) {
                    referenceImages.push(videoNode.data.capturedFrame);
                } else if (videoNode.data.lastFrame) {
                    referenceImages.push(videoNode.data.lastFrame);
                }
            }
        }
    }
    
    const isRefValid = referenceImage && typeof referenceImage === 'string' && referenceImage.startsWith('data:');
    const areRefsValid = referenceImages.every(img => img && typeof img === 'string' && img.startsWith('data:'));

    if ((node.data.batchSize || 1) > 1) {
      if (onSpawnNodes) onSpawnNodes(node.id, prompt, isRefValid ? referenceImage : null); 
      return;
    }

    if (node.data.isGenerating) return;
    
    const hasReference = (node.type === 'image' && (referenceImage || referenceImages.length > 0)) || (node.type === 'video' && referenceImages.length > 0);
    updateNode(node.id, { data: { ...node.data, isGenerating: true, usingReference: hasReference } });

    try {
      if (node.type === 'image') {
        // 确保比例参数正确传递
        const selectedRatio = node.data.ratio || "4:3";
        const selectedModel = node.data.model || "nano-banana";
        
        let url = null;
        
        try {
            // 支持多张参考图：如果有多个参考图，使用第一张（API当前仅支持单图）
            if (referenceImages.length > 1 && areRefsValid) {
                url = await apiFunctions.generateImageFromRef(prompt, referenceImages[0], selectedModel, selectedRatio);
            } else if (referenceImage && isRefValid) {
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
            // 保存到历史记录
            indexedDBManager.saveToHistory({
                type: 'image',
                url: url,
                prompt: prompt,
                model: selectedModel,
                ratio: selectedRatio,
                metadata: {
                    source: 'node',
                    nodeId: node.id
                }
            }).catch(err => console.error('Failed to save node image to history:', err));

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
        try {
          const videoUrl = await apiFunctions.generateVideo(
            promptFromSource || node.data.prompt,
            node.data.model || 'sora2',
            referenceImages,
            node.data.ratio || '16:9',
            node.data.duration || 10
          );
          
          indexedDBManager.saveToHistory({
            type: 'video',
            url: videoUrl,
            prompt: promptFromSource || node.data.prompt,
            model: node.data.model || 'sora2',
            ratio: node.data.ratio || '16:9',
            metadata: {
              nodeId: node.id
            }
          }).catch(err => console.error('Failed to save video to history:', err));

          updateNode(node.id, { 
            data: { 
              ...node.data, 
              isGenerating: false, 
              generatedVideo: true, 
              videoUrl: videoUrl, 
              prompt: promptFromSource || node.data.prompt 
            } 
          });
        } catch (videoError) {
          console.error('视频生成失败:', videoError);
          updateNode(node.id, { 
            data: { 
              ...node.data, 
              isGenerating: false, 
              generatedVideo: false, 
              videoUrl: null,
              errorMessage: videoError.message || '视频生成失败，请检查提示词是否符合规范',
              prompt: promptFromSource || node.data.prompt 
            } 
          });
        }
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
  }, [node.id, node.data, updateNode, node.type, onSpawnNodes, promptFromSource, imageInputNodes, videoInputNodes, apiFunctions]); 

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
            generateTextWithImage={apiFunctions.generateTextWithImage}
            imageInputs={linkedSources.imageInputs}
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
            linkedSources={linkedSources}
            imageInputs={linkedSources.imageInputs}
            videoInputs={linkedSources.videoInputs}
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
            videoInputs={linkedSources.videoInputs}
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
