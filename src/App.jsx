import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, Image as ImageIcon, Zap, ChevronDown, ChevronRight, Minus, Layers, Wand2, X, Mountain, FolderKanban, 
  Type, Video, Music, Play, FileText, Mic, Copy, Square, Sparkles, Link as LinkIcon, LayoutTemplate,
  RefreshCw, Download, Trash2, BookOpenText, Pencil, Key, Save, Search, TestTube, Users, Clock, Map, Film
} from 'lucide-react';
import apiClient from './api/client';
import { createBatchNodes, performAutoLayout } from './utils/workflow';
import { LAYOUT_CONSTANTS } from './constants.js';
import { AudioContent, TextContent, ImageContent, VideoContent } from './components/NodeContent.jsx';
import { textRoleOptions, rolePrompts, getRolePrompt } from './utils/roles';
import { AssetModal, SaveProjectModal, ProjectMenu, HistoryModal } from './components/Modals.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import { CreationMenu, TemplateListModal } from './components/TemplateComponents.jsx';
import SplashScreen from './components/SplashScreen.jsx';
import { indexedDBManager } from './utils/indexedDB';
import { NotificationContainer, useNotification } from './components/Notification.jsx';
import { Button, NodeSelect, HandlePoint, BezierCurve } from './components/UI.jsx';

// 提取视频最后一帧的函数
const extractLastFrameFromVideo = async (videoUrl) => {
  return new Promise((resolve) => {
    try {
      // 创建一个临时的video元素
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous'; // 允许跨域
      video.src = videoUrl;
      
      // 设置静音以避免自动播放被阻止
      video.muted = true;
      video.autoplay = false;
      
      // 当视频元数据加载完成时
      video.addEventListener('loadedmetadata', () => {
        // 跳转到视频的最后一秒（接近结束）
        video.currentTime = Math.max(0, video.duration - 0.1);
        
        // 当视频时间更新时（到达最后一帧）
        video.addEventListener('seeked', () => {
          // 创建一个canvas来绘制视频帧
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // 设置canvas尺寸为视频尺寸
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // 绘制当前视频帧到canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // 将canvas转换为DataURL格式的图片
          const imageDataUrl = canvas.toDataURL('image/png');
          
          // 清理临时元素
          video.remove();
          
          resolve(imageDataUrl);
        }, { once: true });
      });
      
      // 处理加载错误
      video.addEventListener('error', (error) => {
        console.error('视频加载失败:', error);
        video.remove();
        resolve(null);
      });
      
      // 开始加载视频
      video.load();
      
    } catch (error) {
      console.error('提取视频最后一帧失败:', error);
      resolve(null);
    }
  });
};

// --- Global API Key ---
const apiKey = ""; 

// --- Constants & Utils ---
const NODE_WIDTHS = { image: 320, video: 360, audio: 280, text: 320 };

const getNodeWidth = (node) => {
  const baseWidth = NODE_WIDTHS[node.type];
  if (node.data.ratio) {
    if (node.type === 'image') {
      if (node.data.ratio === '16:9' || node.data.ratio === '4:3') {
        return 480; // 图片的16:9和4:3比例统一为480px
      } else if (node.data.ratio === '3:4' || node.data.ratio === '9:16') {
        return baseWidth; // 图片的3:4和9:16比例保持1倍显示
      }
    } else if (node.type === 'video') {
      if (node.data.ratio === '16:9') {
        return 480; // 视频的16:9比例统一为480px
      } else if (node.data.ratio === '9:16') {
        return baseWidth; // 视频的9:16比例保持1倍显示
      }
    }
  }
  return baseWidth;
};

const getNodeHeight = (node) => {
  if (node.type === 'text') return node.data.height || 200; 
  if (node.type === 'audio') return 140; 
  const width = getNodeWidth(node);
  const ratio = node.data.aspectRatio || (node.type === 'video' ? 16/9 : 4/3); 
  return (width / ratio) + 130; 
};

const getHandlePosition = (nodeId, handleType, nodes) => {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return { x: 0, y: 0 };
  const width = getNodeWidth(node);
  let handleY = 80; 
  if (node.type === 'image' || node.type === 'video') {
      const ratio = node.data.aspectRatio || (node.type === 'video' ? 16/9 : 4/3); 
      handleY = (width / ratio) / 2;
  } else if (node.type === 'audio') {
      handleY = 48; 
  } else if (node.type === 'text') {
      handleY = (node.data.height || 200) / 2; 
  }
  return { x: handleType === 'source' ? node.x + width + 12 : node.x - 12, y: node.y + handleY };
};

const downloadFile = (url, filename) => {
  if (!url) return;
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// --- UI Components (refactored to components/UI.jsx) ---

// --- Node Content Components (Defined before NodeCard) ---
// 使用 src/components/NodeContent.jsx 中的组件定义









const NodeCard = React.memo(({ node, updateNode, isSelected, onSelect, onConnectStart, onConnectEnd, linkedSources, onSpawnNodes, onDelete, apiFunctions, onShowAssetModal }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  useEffect(() => { if (!isSelected) setIsExpanded(false); }, [isSelected]);

  const promptInputNode = linkedSources.textInput;
  const imageInputNodes = linkedSources.imageInputs;
  const videoInputNodes = linkedSources.videoInputs;
  const promptFromSource = promptInputNode?.data?.text || node.data.prompt;
  const textInputLabel = useMemo(() => promptInputNode ? `节点 #${promptInputNode.id.toString().slice(-4)}` : null, [promptInputNode]);

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
        
        // 处理视频节点输入：优先使用截取帧，其次使用缓存的尾帧，最后尝试实时提取尾帧
        if (videoInputNodes.length > 0) {
            for (const videoNode of videoInputNodes) {
                if (videoNode.data.capturedFrame) {
                    // 1. 优先使用用户截取的帧
                    referenceImages.push(videoNode.data.capturedFrame);
                } else if (videoNode.data.lastFrame) {
                    // 2. 其次使用缓存的尾帧
                    referenceImages.push(videoNode.data.lastFrame);
                } else if (videoNode.data.videoUrl) {
                    // 3. 最后尝试实时提取视频最后一帧
                    const lastFrameImage = await extractLastFrameFromVideo(videoNode.data.videoUrl);
                    if (lastFrameImage) {
                        referenceImages.push(lastFrameImage);
                    }
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
                // 支持多张参考图：如果有多个参考图，使用多参考图模式
                if (referenceImages.length > 1 && areRefsValid) {
                    console.log(`使用多参考图模式，参考图数量: ${referenceImages.length}`);
                    // 目前API只支持单参考图，这里使用第一张参考图
                    // 未来可以扩展为支持多参考图的API
                    url = await apiFunctions.generateImageFromRef(prompt, referenceImages[0], selectedModel, selectedRatio);
                } else if (referenceImage && isRefValid) {
                    url = await apiFunctions.generateImageFromRef(prompt, referenceImage, selectedModel, selectedRatio);
                } else {
                    url = await apiFunctions.generateImage(prompt, selectedModel, selectedRatio);
                }
            } catch (error) {
                console.error('❌ 图片生成API调用失败:', error);
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
                        source: 'batch',
                        nodeId: node.id
                    }
                }).catch(err => console.error('Failed to save batch image to history:', err));

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
                
                // 保存到历史记录
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
                // 显示错误信息给用户
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
  }, [node.id, node.data, updateNode, node.type, onSpawnNodes, promptFromSource, imageInputNodes, apiFunctions]); 

  const toggleExpand = useCallback((e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }, [isExpanded]);
  const handleMouseDown = useCallback((e) => onSelect(e, node.id), [onSelect, node.id]);
  
  const width = getNodeWidth(node);
  let handleY = 120;
  if (node.type === 'image' || node.type === 'video') {
      const ratio = node.data.aspectRatio || (node.type === 'video' ? 16/9 : 4/3); 
      const previewHeight = width / ratio; 
      handleY = previewHeight / 2;
  } else if (node.type === 'audio') handleY = 48;
  else if (node.type === 'text') handleY = (node.data.height || 200) / 2; 

  const headerIcon = { image: ImageIcon, video: Video, audio: Music, text: FileText }[node.type];
  const headerLabel = { image: "Image", video: "Video", audio: "Audio", text: "Text" }[node.type];
  const headerColor = { image: "text-zinc-100", video: "text-zinc-100", audio: "text-zinc-100", text: "text-zinc-400" }[node.type];

  

  return (
    <div className={`absolute flex flex-col transition-shadow duration-200 ease-out group rounded-2xl ${isSelected ? 'shadow-2xl shadow-zinc-900/50 z-50' : 'shadow-md shadow-zinc-900/20'}`} style={{ left: node.x, top: node.y, width, zIndex: isSelected || isExpanded ? 50 : 10 }} onMouseDown={handleMouseDown}>
      <HandlePoint type="target" top={handleY} onMouseUp={(e) => onConnectEnd(node.id, e)} />
      <HandlePoint type="source" top={handleY} onMouseDown={(e) => onConnectStart(node.id, e)} />
      <button onClick={(e) => { e.stopPropagation(); onDelete(node.id); }} className="absolute -top-2 -right-2 w-6 h-6 bg-zinc-900 rounded-full shadow-md border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-red-500 hover:border-red-900 hover:bg-zinc-800 transition-all opacity-0 group-hover:opacity-100 z-[60]"><X size={12} /></button>
      <div className="flex items-center justify-between px-1 pb-1 cursor-grab active:cursor-grabbing handle select-none opacity-80 hover:opacity-100 transition-opacity">
        <div className={`flex items-center gap-1.5 text-[11px] font-semibold ${headerColor} bg-zinc-900/80 backdrop-blur px-2 py-0.5 rounded-full shadow-sm border border-zinc-800`}>{React.createElement(headerIcon, { size: 12, strokeWidth: 2.5 })}<span>{headerLabel}</span></div>
        {node.type !== 'text' && <div className="text-[10px] text-zinc-600 font-mono">#{node.id.toString().slice(-4)}</div>}
      </div>
      <div onClick={node.type !== 'text' ? (e) => { e.stopPropagation(); setIsExpanded(true); } : undefined}>
        {node.type === 'text' && <TextContent node={node} updateNode={updateNode} generateText={apiFunctions.generateText} generateStreamText={apiFunctions.generateStreamText} generateTextWithImage={apiFunctions.generateTextWithImage} imageInputs={linkedSources.imageInputs} handleAnalyze={(script) => apiFunctions.handleTextNodeAnalysis(script, node.id)} isAnalyzing={node.data.isAnalyzing}/>}
        {node.type === 'image' && <ImageContent node={node} updateNode={updateNode} isExpanded={isExpanded} handleGenerate={handleGenerate} textInputLabel={null} generateText={apiFunctions.generateText}/>}
        {node.type === 'video' && <VideoContent node={node} updateNode={updateNode} isExpanded={isExpanded} handleGenerate={handleGenerate} textInputLabel={null} imageInputs={linkedSources.imageInputs} videoInputs={linkedSources.videoInputs} generateText={apiFunctions.generateText}/>}
        {node.type === 'audio' && <AudioContent node={node} updateNode={updateNode} isExpanded={isExpanded} handleGenerate={handleGenerate} textInputLabel={null} />}
      </div>
      {isExpanded && <button onClick={toggleExpand} className="absolute top-8 right-2 z-50 p-1 bg-zinc-900/90 rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 shadow-sm border border-zinc-800"><ChevronDown size={14} className="rotate-180" /></button>}
    </div>
  );
});

// 导航图组件
const MiniMap = React.memo(({ nodes, offset, scale, canvasSize, onNavigate, visible = true }) => {
    // 确保canvasSize是有效的
    const safeCanvasSize = canvasSize && canvasSize.width > 0 && canvasSize.height > 0 
        ? canvasSize 
        : { width: window.innerWidth, height: window.innerHeight };
    const mapRef = useRef(null);
    const [clickedNodeId, setClickedNodeId] = useState(null);
    const [hoveredNodeId, setHoveredNodeId] = useState(null);
    
    // 计算画布边界和缩放比例
    const getMapTransformations = useCallback(() => {
        if (!nodes || nodes.length === 0) {
            return { scaleFactor: 0.1, viewportRect: null, nodePositions: [] };
        }
        
        // 使用安全的canvasSize
        const currentCanvasSize = safeCanvasSize;
        
        // 找到所有节点的边界
        const nodeBounds = nodes.map(node => {
            const width = getNodeWidth(node);
            const height = getNodeHeight(node);
            return {
                x: node.x,
                y: node.y,
                width,
                height,
                id: node.id,
                type: node.type
            };
        });
        
        const minX = Math.min(...nodeBounds.map(b => b.x));
        const maxX = Math.max(...nodeBounds.map(b => b.x + b.width));
        const minY = Math.min(...nodeBounds.map(b => b.y));
        const maxY = Math.max(...nodeBounds.map(b => b.y + b.height));
        
        const contentWidth = Math.max(maxX - minX, 1000);
        const contentHeight = Math.max(maxY - minY, 800);
        
        // 导航图尺寸
        const mapWidth = 200;
        const mapHeight = 150;
        
        // 计算缩放比例，确保所有内容都能在导航图中显示
        const scaleX = mapWidth / contentWidth;
        const scaleY = mapHeight / contentHeight;
        const scaleFactor = Math.min(scaleX, scaleY, 0.15); // 最大缩放15%
        
        // 计算在导航图中的位置偏移，使内容居中显示
        const contentDisplayWidth = contentWidth * scaleFactor;
        const contentDisplayHeight = contentHeight * scaleFactor;
        const offsetX = Math.max(0, (mapWidth - contentDisplayWidth) / 2);
        const offsetY = Math.max(0, (mapHeight - contentDisplayHeight) / 2);
        
        // 当前视口在导航图中的位置
        const viewportWidth = currentCanvasSize.width / scale;
        const viewportHeight = currentCanvasSize.height / scale;
        
        const viewportRect = {
            x: (offset.x / scale + minX) * scaleFactor + offsetX,
            y: (offset.y / scale + minY) * scaleFactor + offsetY,
            width: (viewportWidth * scaleFactor),
            height: (viewportHeight * scaleFactor)
        };
        
        // 节点在导航图中的位置
        const nodePositions = nodeBounds.map(bound => ({
            id: bound.id,
            type: bound.type,
            x: (bound.x - minX) * scaleFactor + offsetX,
            y: (bound.y - minY) * scaleFactor + offsetY,
            width: bound.width * scaleFactor,
            height: bound.height * scaleFactor
        }));
        
        return { scaleFactor, viewportRect, nodePositions, offsetX, offsetY, contentWidth, contentHeight };
    }, [nodes, offset, scale, safeCanvasSize]);
    
    // 检测点击或悬停的节点
    const detectNodeAtPosition = useCallback((clientX, clientY) => {
        if (!mapRef.current) return null;
        
        const rect = mapRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        
        const transformations = getMapTransformations();
        if (!transformations.viewportRect) return null;
        
        // 改进节点检测：增加容错范围，提高准确性
        let detectedNode = null;
        let closestDistance = Infinity;
        const TOLERANCE = 3; // 像素容错范围
        
        for (const nodePos of transformations.nodePositions) {
            // 检查是否在节点边界内（包含容错范围）
            const isInNode = x >= nodePos.x - TOLERANCE && 
                           x <= nodePos.x + nodePos.width + TOLERANCE &&
                           y >= nodePos.y - TOLERANCE && 
                           y <= nodePos.y + nodePos.height + TOLERANCE;
            
            if (isInNode) {
                // 计算到节点中心的距离，选择最近的节点
                const nodeCenterX = nodePos.x + nodePos.width / 2;
                const nodeCenterY = nodePos.y + nodePos.height / 2;
                const distance = Math.sqrt(Math.pow(x - nodeCenterX, 2) + Math.pow(y - nodeCenterY, 2));
                
                if (distance < closestDistance) {
                    closestDistance = distance;
                    detectedNode = nodePos;
                }
            }
        }
        
        return detectedNode;
    }, [getMapTransformations]);
    
    const handleMapMouseMove = useCallback((e) => {
        const detectedNode = detectNodeAtPosition(e.clientX, e.clientY);
        setHoveredNodeId(detectedNode ? detectedNode.id : null);
    }, [detectNodeAtPosition]);
    
    const handleMapMouseLeave = useCallback(() => {
        setHoveredNodeId(null);
    }, []);
    
    const handleMapClick = useCallback((e) => {
        const clickedNode = detectNodeAtPosition(e.clientX, e.clientY);
        const currentTransformations = getMapTransformations();
        
        if (!currentTransformations.viewportRect) return;
        
        let targetX, targetY;
        
        if (clickedNode) {
            // 简化坐标转换：直接从导航图节点位置反算到画布位置
            const minX = Math.min(...nodes.map(n => n.x));
            const minY = Math.min(...nodes.map(n => n.y));
            
            // 找到对应的原始节点
            const originalNode = nodes.find(n => n.id === clickedNode.id);
            if (!originalNode) return;
            
            // 直接使用原始节点的中心位置
            const nodeCenterX = originalNode.x + getNodeWidth(originalNode) / 2;
            const nodeCenterY = originalNode.y + getNodeHeight(originalNode) / 2;
            
            // 计算目标偏移量，使节点中心位于画布中心
            // 节点通过style={{ left: node.x, top: node.y }}定位
            // 容器通过transform: translate(offset.x, offset.y) scale(scale)变换，transform-origin是top-left
            // 节点中心在屏幕上的位置：(offset.x + (node.x + nodeWidth/2) * scale, offset.y + (node.y + nodeHeight/2) * scale)
            // 要使节点中心位于画布中心：(canvasSize.width/2, canvasSize.height/2)
            // 因此：
            // offset.x + (node.x + nodeWidth/2) * scale = canvasSize.width/2
            // offset.y + (node.y + nodeHeight/2) * scale = canvasSize.height/2
            // 确保节点不会超出屏幕边界
            const nodeWidth = getNodeWidth(originalNode);
            const nodeHeight = getNodeHeight(originalNode);
            
            // 尝试直接使用节点中心位置计算偏移量
            // 方法1：节点中心在屏幕上的位置应该等于画布中心
            // 节点中心在屏幕上的位置：(offset.x + (node.x + nodeWidth/2) * scale, offset.y + (node.y + nodeHeight/2) * scale)
            // 解得：
            // offset.x = canvasSize.width/2 - (node.x + nodeWidth/2) * scale
            // offset.y = canvasSize.height/2 - (node.y + nodeHeight/2) * scale
            const calcX = safeCanvasSize.width / 2 - (originalNode.x + nodeWidth / 2) * scale;
            const calcY = safeCanvasSize.height / 2 - (originalNode.y + nodeHeight / 2) * scale;
            
            // 方法2：尝试使用不同的计算方式，考虑可能的偏移问题
            // 如果节点仍然偏左，可能是我们的计算方式有问题
            // 尝试一种不同的方法：直接计算节点中心应该在的位置，然后反向推导偏移量
            const nodeCenterScreenX = originalNode.x * scale + nodeWidth * scale / 2;
            const nodeCenterScreenY = originalNode.y * scale + nodeHeight * scale / 2;
            
            targetX = safeCanvasSize.width / 2 - nodeCenterScreenX;
            targetY = safeCanvasSize.height / 2 - nodeCenterScreenY;
            
            // 保存两种计算结果用于调试
            const method1Result = {x: calcX, y: calcY};
            const method2Result = {x: targetX, y: targetY};
            
            // 重新计算边界，确保节点在视口内完全可见
            // 考虑到transform的效果，节点左上角在视口中的位置是：(offset.x + node.x * scale, offset.y + node.y * scale)
            // 节点右下角在视口中的位置是：(offset.x + (node.x + nodeWidth) * scale, offset.y + (node.y + nodeHeight) * scale)
            
            // 为了确保节点完全可见，我们需要限制offset的范围
            const minOffsetX = -originalNode.x * scale; // 节点左边缘与视口左边缘对齐
            const maxOffsetX = safeCanvasSize.width - (originalNode.x + nodeWidth) * scale; // 节点右边缘与视口右边缘对齐
            const minOffsetY = -originalNode.y * scale; // 节点上边缘与视口上边缘对齐
            const maxOffsetY = safeCanvasSize.height - (originalNode.y + nodeHeight) * scale; // 节点下边缘与视口下边缘对齐
            
            // 确保目标位置在有效范围内
            targetX = Math.max(minOffsetX, Math.min(maxOffsetX, targetX));
            targetY = Math.max(minOffsetY, Math.min(maxOffsetY, targetY));
            
            // 调试信息
            console.log('导航图点击调试:', {
                clickedNodeId: clickedNode.id,
                originalNodePos: {x: originalNode.x, y: originalNode.y},
                nodeCenter: {x: nodeCenterX, y: nodeCenterY},
                targetOffset: {x: targetX, y: targetY},
                nodeSize: {width: nodeWidth, height: nodeHeight},
                canvasSize: safeCanvasSize,
                originalCanvasSize: canvasSize,
                scale: scale,
                currentOffset: {x: offset.x, y: offset.y},
                boundaries: {minOffsetX, maxOffsetX, minOffsetY, maxOffsetY},
                comparison: {
                    method1: method1Result,
                    method2: method2Result,
                    difference: {
                        x: method2Result.x - method1Result.x,
                        y: method2Result.y - method1Result.y
                    }
                },
                calculation: {
                    method1_calc: {
                        x: `safeCanvasSize.width / 2 - (originalNode.x + nodeWidth/2) * scale = ${safeCanvasSize.width / 2} - (${originalNode.x} + ${nodeWidth/2}) * ${scale}`,
                        y: `safeCanvasSize.height / 2 - (originalNode.y + nodeHeight/2) * scale = ${safeCanvasSize.height / 2} - (${originalNode.y} + ${nodeHeight/2}) * ${scale}`
                    },
                    method2_calc: {
                        x: `safeCanvasSize.width / 2 - nodeCenterScreenX = ${safeCanvasSize.width / 2} - ${nodeCenterScreenX}`,
                        y: `safeCanvasSize.height / 2 - nodeCenterScreenY = ${safeCanvasSize.height / 2} - ${nodeCenterScreenY}`
                    },
                    expectedNodeScreenPos: {
                        x: `targetX + nodeCenterScreenX = ${targetX} + ${nodeCenterScreenX} = ${targetX + nodeCenterScreenX}`,
                        y: `targetY + nodeCenterScreenY = ${targetY} + ${nodeCenterScreenY} = ${targetY + nodeCenterScreenY}`
                    }
                }
            });
            
        } else {
            // 点击空白区域，将点击位置居中
            const rect = mapRef.current.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            
            // 将导航图上的点击位置转换为画布坐标
            const canvasX = (clickX - currentTransformations.offsetX) / currentTransformations.scaleFactor;
            const canvasY = (clickY - currentTransformations.offsetY) / currentTransformations.scaleFactor;
            
            // 使用与节点点击相同的计算逻辑
            targetX = safeCanvasSize.width / 2 - canvasX * scale;
            targetY = safeCanvasSize.height / 2 - canvasY * scale;
        }
        
        // 设置点击的节点ID（如果有）
        setClickedNodeId(clickedNode ? clickedNode.id : null);
        
        // 使用平滑动画导航到目标位置
        onNavigate({ x: targetX, y: targetY }, 500);
        
        // 清除点击状态
        setTimeout(() => setClickedNodeId(null), 300);
    }, [getMapTransformations, scale, canvasSize, onNavigate, nodes]);
    
    const transformations = getMapTransformations();
    
    if (!visible || !transformations.viewportRect) return null;
    
    return (
        <div 
            ref={mapRef}
            className="absolute bottom-24 right-4 z-[100] bg-zinc-900/90 backdrop-blur-sm rounded-lg shadow-lg cursor-pointer hover:bg-zinc-900/95 transition-all duration-200 border border-zinc-800"
            style={{ width: '200px', height: '140px' }}
            onClick={handleMapClick}
            onMouseMove={handleMapMouseMove}
            onMouseLeave={handleMapMouseLeave}
            title="点击节点导航到画布位置"
        >
            <svg width="100%" height="100%" className="rounded-md">
                {/* 简洁背景 */}
                <rect 
                    x={0} 
                    y={0} 
                    width="100%" 
                    height="100%" 
                    fill="#18181b" 
                    rx="6"
                />
                
                {/* 节点 */}
                {transformations.nodePositions.map(node => {
                    const isHovered = hoveredNodeId === node.id;
                    const isClicked = clickedNodeId === node.id;
                    
                    return (
                        <rect
                            key={node.id}
                            x={node.x}
                            y={node.y}
                            width={Math.max(node.width, 2)}
                            height={Math.max(node.height, 2)}
                            fill={{
                                text: '#52525b',
                                image: '#d4d4d8',
                                video: '#a1a1aa',
                                audio: '#71717a'
                            }[node.type] || '#71717a'}
                            rx={2}
                            className={`transition-all duration-150 ${
                                isClicked ? 'opacity-100 scale-105' : 
                                isHovered ? 'opacity-90 scale-102' : 
                                'opacity-80'
                            }`}
                            style={{
                                filter: isClicked ? 'drop-shadow(0 0 4px rgba(255,255,255,0.3))' : 
                                        isHovered ? 'drop-shadow(0 0 2px rgba(255,255,255,0.2))' : 'none'
                            }}
                        />
                    );
                })}
                
                {/* 当前视口框 */}
                <rect
                    x={transformations.viewportRect.x}
                    y={transformations.viewportRect.y}
                    width={transformations.viewportRect.width}
                    height={transformations.viewportRect.height}
                    fill="rgba(255, 255, 255, 0.05)"
                    stroke="#d4d4d8"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                />
            </svg>
            

        </div>
    );
});







const ApiKeyConfigModal = React.memo(({ onClose, currentKey, onSave, onClear }) => {
    const [tempKey, setTempKey] = useState(currentKey);
    const [isLoadingKey, setIsLoadingKey] = useState(false);
    const inputRef = useRef(null);
    useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, []);

    // 打开API Key获取网站
    const handleFetchKey = () => {
        // 创建临时锚点链接并点击
        const link = document.createElement('a');
        link.href = 'https://ai.jmyps.com/';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-zinc-900 rounded-2xl shadow-2xl p-6 w-[400px] max-w-full border border-zinc-800 animate-in fade-in zoom-in-50 duration-200" onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b border-zinc-800 pb-3 mb-4"><h2 className="text-lg font-bold flex items-center gap-2 text-zinc-100"><Key size={20} /> API Key 配置</h2><button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X size={20} /></button></div>
                <p className="text-sm text-zinc-400 mb-4">配置AI服务的API Key。您可以直接输入，或点击下方按钮从服务器获取。</p>
                <div className="mb-6">
                    <label className="block text-sm font-medium text-zinc-300 mb-1">API Key</label>
                    <div className="flex gap-2">
                        <input 
                            ref={inputRef} 
                            type="password" 
                            value={tempKey} 
                            onChange={(e) => setTempKey(e.target.value)} 
                            placeholder="AIzaSy..." 
                            className="flex-1 p-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:ring-zinc-500 focus:border-zinc-500 text-sm text-zinc-100 placeholder:text-zinc-600" 
                        />
                        <a 
                            href="https://ai.jmyps.com/" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm active:scale-95 select-none bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 whitespace-nowrap"
                        >
                            获取Key
                        </a>
                    </div>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-zinc-800">
                    <Button onClick={() => {onClear(); setTempKey(""); onClose();}} variant="secondary" icon={Trash2} className="text-red-400 bg-red-900/20 hover:bg-red-900/30 border-red-900/30">清除 Key</Button>
                    <Button onClick={() => {onSave(tempKey); onClose();}} variant="primary" icon={Save} className="bg-zinc-100 hover:bg-white text-zinc-900">保存 Key</Button>
                </div>
            </div>
        </div>
    );
});

const SynopsisDisplayModal = React.memo(({ onClose, synopsisData }) => {
    const safeData = synopsisData || { synopsis: "", characters: [], key_scenes: [] };
    const safeStringify = (val) => (typeof val === 'string' || typeof val === 'number' ? val : JSON.stringify(val));
    
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-zinc-900 rounded-2xl shadow-2xl p-6 w-[500px] max-w-full h-auto max-h-[90vh] overflow-y-auto border border-zinc-800 animate-in fade-in zoom-in-50 duration-200" onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b border-zinc-800 pb-3 mb-4"><h2 className="text-lg font-bold flex items-center gap-2 text-zinc-100"><BookOpenText size={20} /> AI 剧本分析结果</h2><button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X size={20} /></button></div>
                <div className="space-y-6">
                    <div><h3 className="text-sm font-semibold text-zinc-300 mb-1 flex items-center gap-1"><FileText size={14}/> 剧本提纲/概要</h3><p className="text-sm text-zinc-200 bg-zinc-950 p-3 rounded-lg border border-zinc-800 whitespace-pre-wrap">{safeStringify(safeData.synopsis)}</p></div>
                    <div><h3 className="text-sm font-semibold text-zinc-300 mb-1 flex items-center gap-1"><Type size={14}/> 主要角色</h3><ul className="list-disc list-inside space-y-1 text-sm text-zinc-200 ml-4">{(Array.isArray(safeData.characters) ? safeData.characters : []).map((char, index) => <li key={index} className="truncate">{safeStringify(char)}</li>)}</ul></div>
                    <div><h3 className="text-sm font-semibold text-zinc-300 mb-1 flex items-center gap-1"><Video size={14}/> 关键场景</h3><ul className="list-decimal list-inside space-y-1 text-sm text-zinc-200 ml-4">{(Array.isArray(safeData.key_scenes) ? safeData.key_scenes : []).map((scene, index) => <li key={index} className="truncate">{safeStringify(scene)}</li>)}</ul></div>
                </div>
                <div className="pt-4 mt-4 border-t border-zinc-800 text-xs text-zinc-500 text-right">数据由 Gemini API 提供分析</div>
            </div>
        </div>
    );
});





// --- 6. 主应用 (Canvas) ---

const ApiTest = React.lazy(() => import('./components/ApiTest'));

export default function InfiniteCanvasApp() {
  const [showSplash, setShowSplash] = useState(true);
  // 通知系统
  const { notifications, removeNotification, success, error, info } = useNotification();
  
  // State
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  
  // Helper moved up to ensure it's defined before use in any callback
  const screenToCanvas = useCallback((sx, sy) => ({ x: (sx - offset.x) / scale, y: (sy - offset.y) / scale }), [offset, scale]);

  const [selectedIds, setSelectedIds] = useState(new Set()); 
  const [connecting, setConnecting] = useState(null); 
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [dragState, setDragState] = useState(null); 
  const [menu, setMenu] = useState(null); 
  const containerRef = useRef(null);

  // IndexedDB
  const DB_NAME = 'TapNowCloneDB';
  const STORE_NAME = 'projects';
  const PROJECT_KEY = 'currentProject';
  const initialProjectState = useMemo(() => ({ episodes: [{ id: 1, name: "第一集：雨夜追逐" }, { id: 2, name: "第二集：失落的线索" }], currentEpisodeId: 1, workflows: { 1: { nodes: [{ id: 1, type: 'image', x: 400, y: 150, data: { prompt: "赛博朋克风格的街道...", model: "nano-banana", ratio: "4:3", batchSize: 1, aspectRatio: 4/3 } }, { id: 2, type: 'text', x: 800, y: 150, data: { text: "场景 1: 雨夜\n\n一辆黑色的车飞驰而过...", isWriting: false, isAnalyzing: false, height: 200 } }], edges: [] }, 2: { nodes: [], edges: [] } } }), []);

  const [project, setProject] = useState(initialProjectState);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSavedTime, setLastSavedTime] = useState(null); // 记录最后保存时间
  const [isProjectLoading, setIsProjectLoading] = useState(false); // 项目加载状态
  // 从localStorage加载API Key
  const [userApiKey, setUserApiKeyState] = useState(() => {
    return localStorage.getItem('topflow_api_key') || "";
  });

  // 自定义setUserApiKey函数，同时更新状态和localStorage
  const setUserApiKey = useCallback((key) => {
    setUserApiKeyState(key);
    if (key) {
      localStorage.setItem('topflow_api_key', key);
    } else {
      localStorage.removeItem('topflow_api_key');
    }
  }, []);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false); 
  const [projectMenuPos, setProjectMenuPos] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyModalPos, setHistoryModalPos] = useState(null);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [assetModalPos, setAssetModalPos] = useState(null);
  const [synopsisData, setSynopsisData] = useState(null);
  const [showTemplateList, setShowTemplateList] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [showApiTest, setShowApiTest] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(true); // 导航图显示状态
  const [canvasSize, setCanvasSize] = useState({ width: window.innerWidth, height: window.innerHeight }); // 画布尺寸，初始值设为窗口大小

  // 导航到指定位置（支持平滑动画）
  const navigateToPosition = useCallback((newOffset, duration = 400) => {
    const startOffset = { ...offset };
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 使用缓动函数实现平滑动画
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      
      const currentX = startOffset.x + (newOffset.x - startOffset.x) * easeOutQuart;
      const currentY = startOffset.y + (newOffset.y - startOffset.y) * easeOutQuart;
      
      setOffset({ x: currentX, y: currentY });
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [offset]);

  // 更新画布尺寸
  const updateCanvasSize = useCallback(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setCanvasSize({ width, height });
    }
  }, []);

  // 组件挂载时初始化画布尺寸
  useEffect(() => {
    updateCanvasSize();
    
    // 监听窗口大小变化
    const handleResize = () => {
      updateCanvasSize();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateCanvasSize]);

  // API Key验证函数
  const validateApiKey = useCallback((key) => {
    console.log('🔑 验证API Key:', key ? key.substring(0, 10) + '...' : '空');
    
    if (!key || key.trim() === '') {
      console.log('❌ API Key为空');
      return { isValid: false, reason: 'API Key不能为空' };
    }
    
    // 简化验证逻辑，只检查基本格式
    if (key.length < 5) {
      console.log('❌ API Key长度太短');
      return { isValid: false, reason: 'API Key格式不正确，长度太短' };
    }
    
    // 放宽格式检查，只要有内容就认为可能有效
    if (key.trim().length === 0) {
      console.log('❌ API Key为纯空白字符');
      return { isValid: false, reason: 'API Key不能为空白字符' };
    }
    
    console.log('✅ API Key验证通过');
    return { isValid: true, reason: '' };
  }, []);

  // 检查是否需要显示API Key配置模态框
  const checkApiKeyBeforeGenerate = useCallback(() => {
    console.log('🔍 开始检查API Key...');
    console.log('🔑 当前userApiKey:', userApiKey ? '有值' : '空');
    
    const validation = validateApiKey(userApiKey);
    if (!validation.isValid) {
      console.log('⚠️ API Key无效，显示配置模态框');
      setShowApiKeyModal(true);
      return false;
    }
    
    console.log('✅ API Key检查通过，允许生成');
    return true;
  }, [userApiKey, validateApiKey]);
  const [showSaveProjectModal, setShowSaveProjectModal] = useState(false);
  // showAssetModal moved up
  const [savedProjects, setSavedProjects] = useState([]);

  // 组件挂载时恢复自动保存的项目
  useEffect(() => {
    const restoreAutoSave = async () => {
      try {
        // 初始化 IndexedDB
        await indexedDBManager.init();
        
        // 优先尝试从 IndexedDB 恢复
        const savedWorkflow = await indexedDBManager.getAutoSavedWorkflow();
        if (savedWorkflow && savedWorkflow.nodes && savedWorkflow.edges) {
          // 恢复自动保存的项目
          setProject(prev => ({
            ...prev,
            workflows: {
              ...prev.workflows,
              [prev.currentEpisodeId]: {
                nodes: savedWorkflow.nodes || [],
                edges: savedWorkflow.edges || []
              }
            }
          }));
          setLastSavedTime(savedWorkflow.timestamp);
          console.log('✅ 自动保存的项目已恢复 (IndexedDB)');
        } else {
          // 如果 IndexedDB 没有数据，尝试从 localStorage 恢复（兼容性）
          try {
            const autoSaveData = localStorage.getItem('topflow_auto_save');
            if (autoSaveData) {
              const savedProject = JSON.parse(autoSaveData);
              if (savedProject.nodes && savedProject.edges) {
                // 恢复自动保存的项目
                setProject(prev => ({
                  ...prev,
                  workflows: {
                    ...prev.workflows,
                    [prev.currentEpisodeId]: {
                      nodes: savedProject.nodes || [],
                      edges: savedProject.edges || []
                    }
                  }
                }));
                setLastSavedTime(savedProject.timestamp);
                console.log('✅ 自动保存的项目已恢复 (localStorage)');
                
                // 将 localStorage 的数据迁移到 IndexedDB
                try {
                  await indexedDBManager.autoSaveWorkflow({
                    nodes: savedProject.nodes || [],
                    edges: savedProject.edges || []
                  });
                  console.log('✅ 数据已从 localStorage 迁移到 IndexedDB');
                } catch (migrationError) {
                  console.warn('数据迁移失败:', migrationError);
                }
              }
            }
          } catch (localStorageError) {
            console.error('从 localStorage 恢复失败:', localStorageError);
          }
        }
      } catch (error) {
        console.error('恢复自动保存项目失败:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    restoreAutoSave();
  }, []);

  // API - 使用新的三方API客户端
  const generateText = useCallback(async (prompt) => { 
    try { 
      const response = await apiClient.generateText(prompt); 
      return response; 
    } catch (e) { 
      // 如果是API Key缺失错误，显示API Key配置模态框
      if (e.code === 'API_KEY_MISSING') {
        setShowApiKeyModal(true);
      }
      return "Error: " + e.message; 
    } 
  }, [setShowApiKeyModal, setNetworkError]);

  const generateStructuredSynopsis = useCallback(async (script, model = "gemini-2.5-pro", rolePrompt = "") => { 
    try { 
      const result = await apiClient.generateStructuredSynopsis(script, model, rolePrompt); 
      return result; 
    } catch (e) { 
      // 如果是API Key缺失错误，显示API Key配置模态框
      if (e.code === 'API_KEY_MISSING') {
        setShowApiKeyModal(true);
      }
      return { synopsis: `Error: ${e.message}`, characters: [], key_scenes: [] }; 
    } 
  }, [setShowApiKeyModal, setNetworkError]);

  const generateImage = useCallback(async (prompt, model = 'nano-banana', ratio = '4:3') => { 
      try { 
          const imageData = await apiClient.generateImage(prompt, model, ratio); 
          return imageData; 
      } catch (error) { 
          console.error("Image generation error:", error); 
          // 如果是API Key缺失错误，显示API Key配置模态框
          if (error.code === 'API_KEY_MISSING') {
            setShowApiKeyModal(true);
          }
          return null; 
      } 
  }, [setShowApiKeyModal, setNetworkError]);

  const generateImageFromRef = useCallback(async (prompt, refImg, model = 'nano-banana', ratio = '4:3') => { 
      if (!refImg) return null; 
      try { 
          const imageData = await apiClient.generateImageFromRef(prompt, refImg, model, ratio); 
          return imageData; 
      } catch (error) { 
          console.error("Image editing error:", error); 
          // 如果是API Key缺失错误，显示API Key配置模态框
          if (error.code === 'API_KEY_MISSING') {
            setShowApiKeyModal(true);
          }
          return null; 
      } 
  }, [setShowApiKeyModal, setNetworkError]);

  const generateSpeech = useCallback(async (text) => { 
      try { 
          const audioData = await apiClient.generateSpeech(text); 
          return audioData; 
      } catch (error) { 
          console.error("Speech generation error:", error); 
          // 如果是API Key缺失错误，显示API Key配置模态框
          if (error.code === 'API_KEY_MISSING') {
            setShowApiKeyModal(true);
          }
          return null; 
      } 
  }, [setShowApiKeyModal, setNetworkError]);

  const generateVideo = useCallback(async (prompt, model, images, aspectRatio, duration) => { 
      try { 
          const videoData = await apiClient.generateVideo(prompt, model, images, aspectRatio, duration); 
          return videoData; 
      } catch (error) { 
          console.error("Video generation error:", error); 
          
          // 根据错误类型显示友好的用户提示
          if (error.code === 'API_KEY_MISSING') {
            // API Key缺失错误
            setShowApiKeyModal(true);
            error('请配置API Key后才能使用Sora2视频生成功能', 'API Key未配置');
          } else if (error.code === 'TIMEOUT_ERROR') {
            // 超时错误
            error(error.solution || '视频生成超时，请稍后重试或尝试简化提示词', '视频生成超时');
          } else if (error.isNetworkError || error.message.includes('网络连接失败') || error.message.includes('Failed to fetch')) {
            // 网络错误
            console.warn('🌐 检测到网络连接问题');
            setNetworkError(true);
            setTimeout(() => setNetworkError(false), 3000);
            error('网络连接失败，请检查网络连接后重试', '网络错误');
          } else if (error.message && error.message.includes('内容政策')) {
            // 内容政策违规
            error('您输入的提示词可能违反了内容政策，请尝试修改提示词或避免使用敏感内容。', '内容政策违规');
          } else if (error.message && error.message.includes('服务器错误') || error.message.includes('500')) {
            // 服务器错误
            error('Sora2视频生成服务暂时不可用，请稍后重试', '服务器错误');
          } else {
            // 其他错误
            const errorMessage = error.message || '未知错误';
            error(`视频生成失败: ${errorMessage}。请检查提示词内容或稍后重试。`, '生成失败');
          }
          
          return null; 
      } 
  }, [setShowApiKeyModal, setNetworkError, error]);

  // Workflow Helpers
  const currentEpisodeId = project.currentEpisodeId;
  const activeWorkflow = project.workflows[currentEpisodeId] || { nodes: [], edges: [] };
  const nodes = activeWorkflow.nodes;
  const edges = activeWorkflow.edges;

  const handleUpdateWorkflow = useCallback((nodeUpdater, edgeUpdater) => {
      setProject(prev => {
          const wf = prev.workflows[prev.currentEpisodeId] || { nodes: [], edges: [] };
          const newState = { ...prev, workflows: { ...prev.workflows, [prev.currentEpisodeId]: { nodes: nodeUpdater ? nodeUpdater(wf.nodes) : wf.nodes, edges: edgeUpdater ? edgeUpdater(wf.edges) : wf.edges } } };
          
          return newState;
      });
  }, []);
  const handleUpdateWorkflowFixed = handleUpdateWorkflow;

  // 创建分镜节点的全局函数
  const createStoryboardNodes = useCallback(async (sourceNode, scenes, referenceImage) => {
    // 设置全局分镜生成状态，确保源节点显示正确的状态
    setModeGeneratingState(true);
    setModeSourceNodeId(sourceNode.id);
    setCurrentMode('storyboard');
    
    const newNodes = [];
    const newEdges = [];
    const baseX = sourceNode.x + 400;
    const baseY = sourceNode.y;
    const verticalSpacing = 180;

    // 计算节点宽度和水平间距
    const nodeRatio = sourceNode.data.ratio || "16:9";
    let nodeWidth = 320; // 默认宽度
    if (nodeRatio === "16:9" || nodeRatio === "4:3") {
      nodeWidth = 480; // 16:9和4:3比例的宽度
    }
    const horizontalSpacing = nodeWidth + 80; // 节点宽度 + 间距
    
    // 创建4个分镜节点，初始显示生成状态
    scenes.forEach((scene, index) => {
      const newNodeId = Date.now() + index;
      newNodes.push({
        id: newNodeId,
        type: 'image',
        x: baseX + (index % 2) * horizontalSpacing,
        y: baseY + Math.floor(index / 2) * verticalSpacing,
        data: {
          prompt: scene,
          model: sourceNode.data.model || "nano-banana",
          ratio: sourceNode.data.ratio || "16:9",
          batchSize: 1,
          aspectRatio: sourceNode.data.aspectRatio || 16/9,
          isGenerating: true, // 初始显示生成状态，在分镜节点中显示加载
          usingReference: !!referenceImage, // 标记是否使用参考图片
          hidden: true // 初始隐藏图片，等生成成功后再显示
        }
      });

      // 创建从源节点到分镜节点的连线
      newEdges.push({
        id: `edge-${sourceNode.id}-${newNodeId}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        source: sourceNode.id,
        target: newNodeId
      });
    });

    // 批量添加节点和边
    handleUpdateWorkflowFixed(
      prevNodes => [...prevNodes, ...newNodes],
      prevEdges => [...prevEdges, ...newEdges]
    );

    // 使用批量生成的方式生成分镜图片
    let successCount = 0;
    let failureCount = 0;
    
    // 并发生成所有分镜图片，每个分镜图片都有重试机制
    const generatePromises = newNodes.map(async (node) => {
      let imageUrl = null;
      let success = false;
      let lastError = null;
      const maxRetries = 3;
      
      // 优先使用传入的referenceImage，如果没有则使用sourceNode的图片
      const refImage = referenceImage || sourceNode.data.generatedImage;
      
      // 重试机制
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          if (refImage) {
            console.log(`分镜生成尝试 ${attempt}/${maxRetries} (节点 ${node.id}): 使用参考图 + 提示词 "${node.data.prompt}"`);
            // 使用参考图生成分镜
            imageUrl = await generateImageFromRef(
              node.data.prompt,              // 分镜提示词
              refImage,                      // 参考图片
              node.data.model,               // 模型参数
              node.data.ratio                // 比例参数
            );
          } else {
            console.log(`分镜生成尝试 ${attempt}/${maxRetries} (节点 ${node.id}): 仅使用提示词 "${node.data.prompt}"`);
            // 没有参考图片时使用普通生成
            imageUrl = await generateImage(
              node.data.prompt,
              node.data.model,
              node.data.ratio
            );
          }
          
          // 成功生成，跳出重试循环
          success = true;
          break;
        } catch (error) {
          lastError = error;
          console.error(`分镜图片生成尝试 ${attempt}/${maxRetries} 失败 (节点 ${node.id}):`, error);
          
          // 如果不是最后一次尝试，等待一段时间再重试
          if (attempt < maxRetries) {
            // 对于429错误（速率限制），需要更长的等待时间
            const isRateLimitError = error.message && error.message.includes('429');
            let waitTime;
            
            if (isRateLimitError) {
              // 速率限制错误，使用指数退避策略，等待更长时间
              waitTime = Math.min(5000 * Math.pow(2, attempt - 1), 30000); // 5秒, 10秒, 20秒，最多30秒
              console.log(`分镜图片生成遇到速率限制，等待 ${waitTime}ms 后重试 (节点 ${node.id})...`);
            } else {
              // 其他错误，使用常规等待时间
              waitTime = 1000 * attempt; // 第1次等待1秒，第2次等待2秒
              console.log(`分镜图片生成等待 ${waitTime}ms 后重试 (节点 ${node.id})...`);
            }
            
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }

      // 处理生成结果
      if (success && imageUrl) {
        // 保存到历史记录
        indexedDBManager.saveToHistory({
            type: 'image',
            url: imageUrl,
            prompt: node.data.prompt,
            model: node.data.model || 'nano-banana',
            ratio: node.data.ratio,
            metadata: {
                source: 'storyboard',
                nodeId: node.id
            }
        }).catch(err => console.error('Failed to save storyboard image to history:', err));

        // 更新节点状态 - 成功生成后显示图片
        handleUpdateWorkflowFixed(
          prevNodes => prevNodes.map(n => 
            n.id === node.id 
              ? { 
                  ...n, 
                  data: { 
                    ...n.data, 
                    generatedImage: imageUrl,
                    isGenerating: false,
                    hidden: false // 生成成功后显示图片
                  } 
                } 
              : n
          ),
          null
        );
        successCount++;
        return { nodeId: node.id, success: true, imageUrl };
      } else {
        console.error(`分镜图片所有 ${maxRetries} 次尝试都失败了 (节点 ${node.id}):`, lastError);
        // 所有重试都失败了，使用占位图片
        const textContent = node.data.prompt ? node.data.prompt.split(/\s+/).slice(0, 3).join(' ') : '分镜';
        const encodedText = encodeURIComponent(textContent + ` (分镜 ${node.id.toString().slice(-4)})`);
        const mockW = 800;
        const mockH = Math.round(mockW / (node.data.aspectRatio || 16/9));
        const mockUrl = `https://placehold.co/${mockW}x${mockH}/e74c3c/ffffff?text=${encodedText}`;
        
        handleUpdateWorkflowFixed(
          prevNodes => prevNodes.map(n => 
            n.id === node.id 
              ? { 
                  ...n, 
                  data: { 
                    ...n.data, 
                    generatedImage: mockUrl,
                    isGenerating: false 
                  } 
                } 
              : n
          ),
          null
        );
        failureCount++;
        return { nodeId: node.id, success: false, error: lastError?.message || '未知错误' };
      }
    });

    // 等待所有分镜生成完成
    const results = await Promise.allSettled(generatePromises);
    
    // 所有分镜生成完成后，重置全局模式状态和源节点的生成状态
    console.log(`分镜生成完成: ${successCount} 成功, ${failureCount} 失败`);
    console.log('分镜生成结果:', results);
    setModeGeneratingState(false);
    setModeSourceNodeId(null);
    setCurrentMode('generate');
    
    // 重置源节点的生成状态
    handleUpdateWorkflowFixed(
      prevNodes => prevNodes.map(n => 
        n.id === sourceNode.id 
          ? { 
              ...n, 
              data: { 
                ...n.data, 
                isGenerating: false 
              } 
            } 
          : n
      ),
      null
    );
  }, [handleUpdateWorkflowFixed, generateImage, generateImageFromRef]);

  // 更新分镜节点提示词的函数
  const updateStoryboardPrompts = useCallback((sourceNodeId, scenes) => {
    // 找到所有从源节点连接的分镜节点
    const storyboardNodes = nodes.filter(node => 
      edges.some(edge => edge.source === sourceNodeId && edge.target === node.id)
    );
    
    // 按创建顺序排序（假设ID越大的节点创建越晚）
    const sortedNodes = [...storyboardNodes].sort((a, b) => a.id - b.id);
    
    // 更新前4个分镜节点的提示词
    sortedNodes.slice(0, 4).forEach((node, index) => {
      if (scenes[index]) {
        handleUpdateWorkflowFixed(
          prevNodes => prevNodes.map(n => 
            n.id === node.id 
              ? { 
                  ...n, 
                  data: { 
                    ...n.data, 
                    prompt: scenes[index] 
                  } 
                } 
              : n
          ),
          null
        );
      }
    });
  }, [nodes, edges, handleUpdateWorkflowFixed]);

  // 创建网格节点的全局函数
  const createGridNodes = useCallback(async (sourceNode, details, referenceImage = null, jsonData = null) => {
    // 无论源节点是否有图片，都设置全局生成状态，确保网格按钮显示"网格中"
    setModeGeneratingState(true);
    setModeSourceNodeId(sourceNode.id);
    setCurrentMode('grid');
    
    // 只创建一个节点，用于显示包含4个分镜的单张图片
    const newNodeId = Date.now();
    const baseX = sourceNode.x + 400;
    const baseY = sourceNode.y;
    
    // 处理分镜描述，提取秒数信息
    let processedDetails = [];
    
    if (jsonData) {
      // 尝试多种JSON格式
      if (jsonData.frames && Array.isArray(jsonData.frames)) {
        // 使用frames格式的数据
        processedDetails = jsonData.frames.map(frame => {
          const description = frame.imagePrompt || frame.description || frame.visualDescription || '';
          let duration = 3; // 默认3秒
          
          // 尝试从timePoint提取秒数
          if (frame.timePoint) {
            const timeMatch = frame.timePoint.match(/([0-9]+)秒/);
            if (timeMatch) {
              duration = parseInt(timeMatch[1]);
            } else {
              const rangeMatch = frame.timePoint.match(/([0-9]+)-([0-9]+)秒/);
              if (rangeMatch) {
                duration = parseInt(rangeMatch[2]);
              }
            }
          } else if (frame.duration) {
            duration = parseInt(frame.duration) || 3;
          }
          
          return {
            description: description,
            duration: duration,
            shotType: frame.shotType || '',
            visualDescription: frame.visualDescription || description,
            composition: frame.composition || '',
            continuity: frame.continuity || ''
          };
        });
      } else if (jsonData.keyframe_sequence && Array.isArray(jsonData.keyframe_sequence)) {
        // 使用keyframe_sequence格式的数据
        processedDetails = jsonData.keyframe_sequence.map(keyframe => {
          const description = keyframe.description || keyframe.image_prompt || keyframe.prompt || '';
          let duration = 3; // 默认3秒
          
          // 尝试从timestamp提取秒数
          if (keyframe.timestamp) {
            const timeMatch = keyframe.timestamp.match(/([0-9]+)秒/);
            if (timeMatch) {
              duration = parseInt(timeMatch[1]);
            } else {
              const rangeMatch = keyframe.timestamp.match(/([0-9]+)-([0-9]+)秒/);
              if (rangeMatch) {
                duration = parseInt(rangeMatch[2]);
              }
            }
          } else if (keyframe.duration) {
            duration = parseInt(keyframe.duration) || 3;
          }
          
          return {
            description: description,
            duration: duration,
            shotType: keyframe.shot_type || keyframe.shotType || '',
            visualDescription: keyframe.visual_description || description,
            composition: keyframe.composition || '',
            continuity: keyframe.continuity || ''
          };
        });
      } else if (jsonData.keyframes && Array.isArray(jsonData.keyframes)) {
        // 使用keyframes格式的数据
        processedDetails = jsonData.keyframes.map(keyframe => {
          const description = keyframe.imagePrompt || keyframe.description || keyframe.prompt || '';
          let duration = 3; // 默认3秒
          
          // 尝试从duration或timePoint提取秒数
          if (keyframe.duration) {
            const timeMatch = keyframe.duration.match(/([0-9]+)秒/);
            if (timeMatch) {
              duration = parseInt(timeMatch[1]);
            } else {
              duration = parseInt(keyframe.duration) || 3;
            }
          } else if (keyframe.timePoint) {
            const timeMatch = keyframe.timePoint.match(/([0-9]+)秒/);
            if (timeMatch) {
              duration = parseInt(timeMatch[1]);
            } else {
              const rangeMatch = keyframe.timePoint.match(/([0-9]+)-([0-9]+)秒/);
              if (rangeMatch) {
                duration = parseInt(rangeMatch[2]);
              }
            }
          }
          
          return {
            description: description,
            duration: duration,
            shotType: keyframe.shotType || '',
            visualDescription: keyframe.visualDescription || description,
            composition: keyframe.composition || '',
            continuity: keyframe.continuity || ''
          };
        });
      }
    }
    
    // 如果没有成功从JSON中提取数据，使用文本格式数据
    if (processedDetails.length === 0) {
      processedDetails = details.map(scene => {
        // 提取秒数信息，格式："描述内容 (时长：X秒)"
        const timeMatch = scene.match(/\(时长：([0-9]+)秒\)/);
        const time = timeMatch ? parseInt(timeMatch[1]) : 3; // 默认3秒
        
        // 移除秒数信息，保留纯描述内容
        const cleanScene = scene.replace(/\(时长：[0-9]+秒\)/g, '').trim();
        
        return {
          description: cleanScene,
          duration: time
        };
      });
    }
    
    // 确保至少有4个分镜
    if (processedDetails.length < 4) {
      console.warn(`处理后的分镜数量不足4个 (${processedDetails.length})，使用默认分镜填充`);
      const defaultDescriptions = [
        `${referenceImage ? '基于参考图' : ''} 开场镜头，建立场景和氛围`,
        `${referenceImage ? '基于参考图' : ''} 动作镜头，主体表演或中文对话`,
        `${referenceImage ? '基于参考图' : ''} 反应镜头，细节特写或情绪表现`,
        `${referenceImage ? '基于参考图' : ''} 结局镜头，高潮收尾或场景结束`
      ];
      
      // 填充到4个分镜
      for (let i = processedDetails.length; i < 4; i++) {
        processedDetails.push({
          description: defaultDescriptions[i],
          duration: 3,
          shotType: '',
          visualDescription: '',
          composition: '',
          continuity: ''
        });
      }
    }
    
    // 构建4宫格漫画分镜的提示词
    const comicScenes = processedDetails.map(d => d.description).join('，');
    const refImage = referenceImage || sourceNode.data.generatedImage;
    
    // 创建单个网格节点，用于显示4宫格漫画分镜图
    const newNode = {
      id: newNodeId,
      type: 'image',
      x: baseX,
      y: baseY,
      data: {
        prompt: `${sourceNode.data.prompt} - 4宫格漫画分镜`,
        model: sourceNode.data.model || "nano-banana",
        ratio: sourceNode.data.ratio || "16:9", // 使用源图的比例参数
        batchSize: 1,
        aspectRatio: sourceNode.data.aspectRatio || 16/9, // 使用源图的宽高比
        isGenerating: true, // 初始显示生成状态，在网格节点中显示加载
        mode: 'grid', // 标记为网格模式
        gridDetails: processedDetails.map(d => d.description), // 保存4个分镜的描述信息
        gridDurations: processedDetails.map(d => d.duration), // 保存每个分镜的秒数
        comicLabels: ["开场镜头", "动作镜头", "反应镜头", "结局镜头"], // 漫画分镜标签
        isSingleGridImage: true, // 标记为单张分镜图
        hidden: true, // 初始隐藏图片，等生成成功后再显示
        // 为Sora2视频生成准备的完整提示词
        sora2Prompts: processedDetails.map((detail, index) => ({
          description: detail.description,
          duration: detail.duration,
          prompt: `${detail.description} - 时长：${detail.duration}秒`
        })),
        // JSON格式的关键帧数据
        keyframeData: jsonData || {
          frames: processedDetails.map((detail, index) => ({
            index: index + 1,
            shotType: detail.shotType || ["开场镜头", "动作镜头", "反应镜头", "结局镜头"][index],
            timePoint: `0-${detail.duration}秒`,
            visualDescription: detail.visualDescription || detail.description,
            composition: detail.composition || "标准构图",
            continuity: detail.continuity || "与前一帧保持视觉连贯性",
            imagePrompt: detail.description
          }))
        }
      }
    };

    // 创建从源节点到网格节点的连线
    const newEdge = {
      id: `edge-${sourceNode.id}-${newNodeId}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      source: sourceNode.id,
      target: newNodeId
    };

    // 添加节点和边
    handleUpdateWorkflowFixed(
      prevNodes => [...prevNodes, newNode],
      prevEdges => [...prevEdges, newEdge]
    );

    // 带重试机制的4宫格漫画分镜图生成
    let imageUrl = null;
    let success = false;
    let lastError = null;
    const maxRetries = 3;
    
    // 准备提示词
    let gridPrompt;
    if (refImage) {
      console.log(`生成4宫格漫画分镜图: 使用参考图 + 分镜描述`);
      // 使用参考图生成4宫格漫画分镜图 - 图片不显示秒数
      gridPrompt = `请严格按照参考图片生成一张标准4宫格漫画分镜图，确保生成的图片与参考图在风格、人物、场景等方面完全一致：

分镜内容（4个分镜）：
分镜1：${processedDetails[0].description}
分镜2：${processedDetails[1].description}
分镜3：${processedDetails[2].description}
分镜4：${processedDetails[3].description}

严格要求：
1. 必须生成一张包含4个分镜格的图片，不多不少
2. 4个分镜格必须大小相等，排列成2×2的网格布局
3. 生成的4宫格图片必须与参考图的画风、色彩、人物造型完全一致
4. 人物形象、服装、发型等所有细节要与参考图保持一致
5. 每个分镜格分别展现上述4个分镜内容之一
6. 不要在任何位置显示数字或文本标记
7. 保持整体视觉连贯性

特别强调：
- 必须是标准的2×2四宫格布局，不是3格或其他布局
- 重点参考原图的绘画风格、色彩搭配、人物特征
- 确保4个分镜的人物角色完全相同
- 每个分镜格的内容必须清晰可辨，与上述分镜内容一一对应`;
    } else {
      console.log(`生成4宫格漫画分镜图: 仅使用分镜描述`);
      // 没有参考图片时直接生成4宫格漫画分镜图 - 图片不显示秒数
      gridPrompt = `请基于以下4个分镜描述生成一张标准4宫格漫画分镜图，确保4个分镜在艺术风格、人物造型和视觉风格上保持一致：

分镜内容（4个分镜）：
分镜1：${processedDetails[0].description}
分镜2：${processedDetails[1].description}
分镜3：${processedDetails[2].description}
分镜4：${processedDetails[3].description}

严格要求：
1. 必须生成一张包含4个分镜格的图片，不多不少
2. 4个分镜格必须大小相等，排列成标准的2×2网格布局
3. 保持统一的漫画风格、色彩和人物造型
4. 确保4个分镜在视觉上连贯统一
5. 图片中不要显示任何文本或数字

特别强调：
- 必须是标准的2×2四宫格布局，不是3格或其他布局
- 所有4个分镜中的人物角色必须完全相同，包括外貌特征、服装、发型等
- 人物表情、姿势可以变化，但人物形象必须保持一致
- 确保4个分镜的人物形象和场景风格完全统一
- 每个分镜格的内容必须清晰可辨，与上述分镜内容一一对应`;
    }
    
    // 重试机制
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`4宫格漫画分镜图生成尝试 ${attempt}/${maxRetries}`);
        
        if (refImage) {
          imageUrl = await generateImageFromRef(
            gridPrompt,
            refImage,
            newNode.data.model,
            newNode.data.ratio
          );
        } else {
          imageUrl = await generateImage(
            gridPrompt,
            newNode.data.model,
            newNode.data.ratio
          );
        }
        
        // 成功生成，跳出重试循环
        success = true;
        break;
      } catch (error) {
        lastError = error;
        console.error(`4宫格漫画分镜图生成尝试 ${attempt}/${maxRetries} 失败:`, error);
        
        // 如果不是最后一次尝试，等待一段时间再重试
        if (attempt < maxRetries) {
          // 对于429错误（速率限制），需要更长的等待时间
          const isRateLimitError = error.message && error.message.includes('429');
          let waitTime;
          
          if (isRateLimitError) {
            // 速率限制错误，使用指数退避策略，等待更长时间
            waitTime = Math.min(5000 * Math.pow(2, attempt - 1), 30000); // 5秒, 10秒, 20秒，最多30秒
            console.log(`4宫格漫画分镜图生成遇到速率限制，等待 ${waitTime}ms 后重试...`);
          } else {
            // 其他错误，使用常规等待时间
            waitTime = 1000 * attempt; // 第1次等待1秒，第2次等待2秒
            console.log(`4宫格漫画分镜图生成等待 ${waitTime}ms 后重试...`);
          }
          
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    // 处理生成结果
    if (success && imageUrl) {
      // 保存到历史记录
      indexedDBManager.saveToHistory({
          type: 'image',
          url: imageUrl,
          prompt: gridPrompt, // 使用完整的gridPrompt
          model: newNode.data.model || 'nano-banana',
          ratio: newNode.data.ratio,
          metadata: {
              source: 'grid',
              nodeId: newNodeId,
              gridDetails: processedDetails
          }
      }).catch(err => console.error('Failed to save grid image to history:', err));

      // 更新节点状态 - 生成成功后显示图片
      handleUpdateWorkflowFixed(
        prevNodes => prevNodes.map(n => 
          n.id === newNodeId 
            ? { 
                ...n, 
                data: { 
                  ...n.data, 
                  generatedImage: imageUrl,
                  isGenerating: false,
                  hidden: false // 生成成功后显示图片
                } 
              } 
            : n
        ),
        null
      );
      
      console.log('4宫格漫画分镜图生成完成');
    } else {
      console.error(`4宫格漫画分镜图所有 ${maxRetries} 次尝试都失败了:`, lastError);
      
      // 所有重试都失败了，使用占位图片
      const mockUrl = `https://placehold.co/800x450/e74c3c/ffffff?text=${encodeURIComponent('4宫格漫画生成失败')}`;
      
      handleUpdateWorkflowFixed(
        prevNodes => prevNodes.map(n => 
          n.id === newNodeId 
            ? { 
                ...n, 
                data: { 
                  ...n.data, 
                  generatedImage: mockUrl,
                  isGenerating: false 
                } 
              } 
            : n
        ),
        null
      );
    }
    
    // 生成完成后，重置全局模式状态和源节点的生成状态
    setModeGeneratingState(false);
    setModeSourceNodeId(null);
    setCurrentMode('generate');
    
    // 重置源节点的生成状态
    handleUpdateWorkflowFixed(
      prevNodes => prevNodes.map(n => 
        n.id === sourceNode.id 
          ? { 
              ...n, 
              data: { 
                ...n.data, 
                isGenerating: false 
              } 
            } 
          : n
      ),
      null
    );
  }, [handleUpdateWorkflowFixed, generateImage, generateImageFromRef]);

  // API Consumers requiring state update
  const handleTextNodeAnalysis = useCallback(async (script, nodeId, model = "gemini-2.5", rolePrompt = "") => {
    handleUpdateWorkflowFixed(prevNodes => prevNodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, isAnalyzing: true } } : n));
    const result = await generateStructuredSynopsis(script, model, rolePrompt);
    setSynopsisData(result);
    handleUpdateWorkflowFixed(prevNodes => prevNodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, isAnalyzing: false } } : n));
  }, [generateStructuredSynopsis, handleUpdateWorkflowFixed]); 

  // 首先导入generateStreamText
  const generateStreamText = useCallback(async (prompt, onChunk, model) => { 
    try { 
      const response = await apiClient.generateStreamText(prompt, onChunk, model); 
      return response; 
    } catch (e) { 
      console.error('流式文本生成错误:', e);
      // 如果是API Key缺失错误，显示API Key配置模态框
      if (e.code === 'API_KEY_MISSING') {
        setShowApiKeyModal(true);
      }
      return '生成失败'; 
    } 
  }, [setShowApiKeyModal, setNetworkError]);

  const apiFunctions = useMemo(() => ({ userApiKey, generateText, generateStreamText, generateTextWithImage: apiClient.generateTextWithImage, generateImage, generateImageFromRef, generateSpeech, generateVideo, generateStructuredSynopsis, setSynopsisData, handleTextNodeAnalysis, checkApiKeyBeforeGenerate }), [userApiKey, generateText, generateStreamText, generateImage, generateImageFromRef, generateSpeech, generateVideo, generateStructuredSynopsis, handleTextNodeAnalysis, checkApiKeyBeforeGenerate]);
  
  // Helper functions for handlers
  const updateNode = useCallback((id, newData) => handleUpdateWorkflowFixed(ns => ns.map(n => n.id === id ? { ...n, ...newData } : n)), [handleUpdateWorkflowFixed]);
  const deleteNode = useCallback((id) => { handleUpdateWorkflowFixed(ns => ns.filter(n => n.id !== id), es => es.filter(e => e.source !== id && e.target !== id)); setSelectedIds(prev => { const s = new Set(prev); s.delete(id); return s; }); }, [handleUpdateWorkflowFixed]);
  const handleAddEpisode = useCallback(() => { const id = Date.now(); setProject(p => ({ ...p, episodes: [...p.episodes, { id, name: `新剧集 ${p.episodes.length + 1}` }], workflows: { ...p.workflows, [id]: { nodes: [], edges: [] } } })); }, []);
  const handleDeleteEpisode = useCallback((id) => { setProject(p => { const w = { ...p.workflows }; delete w[id]; const eps = p.episodes.filter(e => e.id !== id); return { ...p, episodes: eps, workflows: w, currentEpisodeId: p.currentEpisodeId === id ? (eps[0]?.id || null) : p.currentEpisodeId }; }); setSelectedIds(new Set()); }, []);

  const autoLayoutAllNodes = useCallback(() => {
    handleUpdateWorkflowFixed(
      prevNodes => performAutoLayout(prevNodes, edges),
      es => es
    );
  }, [edges, handleUpdateWorkflowFixed]);
  const handleUpdateEpisodeName = useCallback((id, name) => setProject(p => ({ ...p, episodes: p.episodes.map(e => e.id === id ? { ...e, name } : e) })), []);
  const handleSwitchEpisode = useCallback((id) => { if (id !== currentEpisodeId) { setProject(p => ({ ...p, currentEpisodeId: id })); setSelectedIds(new Set()); setMenu(null); } }, [currentEpisodeId]);
  
  // --- Add Node Function ---
  // Defined BEFORE handleSelectTemplate to ensure scope availability
  const addNode = useCallback((type, x, y, sourceId) => {
    const pos = x && y ? { x, y } : { x: (window.innerWidth/2 - offset.x)/scale - 160, y: (window.innerHeight/2 - offset.y)/scale - 100 };
    let initialData = { prompt: "", isGenerating: false };
    if (type === 'image') initialData = { ...initialData, model: "nano-banana", ratio: "4:3", batchSize: 1, aspectRatio: 4/3 };
    else if (type === 'video') initialData = { ...initialData, model: "sora2", ratio: "16:9", batchSize: 1, aspectRatio: 16/9 };
    else if (type === 'text') initialData = { text: "", isAnalyzing: false, isWriting: false, height: 200 }; 
    
    const newNode = { id: Date.now(), type, x: pos.x, y: pos.y, data: initialData };
    
    handleUpdateWorkflowFixed(
        prevNodes => [...prevNodes, newNode],
        prevEdges => sourceId ? [...prevEdges, { id: `edge-${sourceId}-${newNode.id}-${Date.now()}`, source: sourceId, target: newNode.id }] : prevEdges
    );
  }, [offset, scale, handleUpdateWorkflowFixed]);

  // Template selection handler
  const handleSelectTemplate = useCallback((templateId) => {
    // 这里可以添加根据模板ID创建相应节点结构的逻辑
    // 例如：根据模板创建预设的节点和连接
    setShowTemplateList(false);
    
    // 示例：为不同的模板创建不同的节点结构
    switch (templateId) {
      case 'story':
        // 故事创作模板：文本节点 + 图片节点
        addNode('text', 400, 200);
        addNode('image', 800, 200);
        break;
      case 'script':
        // 剧本模板：多个文本节点
        addNode('text', 400, 200);
        addNode('text', 400, 450);
        addNode('text', 400, 700);
        break;
      case 'adventure':
        // 冒险故事模板：文本 + 图片 + 音频
        addNode('text', 400, 200);
        addNode('image', 800, 200);
        addNode('audio', 400, 500);
        break;
      default:
        // 默认：只创建一个文本节点
        addNode('text', 400, 200);
    }
  }, [addNode]);

  // IndexDB存储功能
  const openIndexDB = useCallback(() => {
    return new Promise((resolve, reject) => {
      // 首先动态获取当前数据库版本
      const versionRequest = indexedDB.open('TopFlowDB');
      versionRequest.onsuccess = () => {
        const db = versionRequest.result;
        const currentVersion = db.version || 1;
        db.close();
        
        // 使用正确的版本号打开数据库
        const request = indexedDB.open('TopFlowDB', currentVersion);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('projects')) {
            const store = db.createObjectStore('projects', { keyPath: 'id' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };
      };
      
      versionRequest.onerror = () => {
        // 如果数据库不存在，使用版本1创建
        const request = indexedDB.open('TopFlowDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('projects')) {
            const store = db.createObjectStore('projects', { keyPath: 'id' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };
      };
    });
  }, []);

  // 保存项目到IndexDB
  const saveProjectToDB = useCallback(async (projectData) => {
    try {
      const db = await openIndexDB();
      const transaction = db.transaction(['projects'], 'readwrite');
      const store = transaction.objectStore('projects');
      await store.put(projectData);
      return true;
    } catch (error) {
      console.error('保存项目失败:', error);
      return false;
    }
  }, [openIndexDB]);

  // 从IndexDB加载项目列表
  const loadProjectsFromDB = useCallback(async () => {
    try {
      const db = await openIndexDB();
      const transaction = db.transaction(['projects'], 'readonly');
      const store = transaction.objectStore('projects');
      const request = store.getAll();
      
      return new Promise((resolve) => {
        request.onsuccess = () => {
          const projects = request.result.sort((a, b) => b.timestamp - a.timestamp);
          resolve(projects);
        };
        request.onerror = () => resolve([]);
      });
    } catch (error) {
      console.error('加载项目失败:', error);
      return [];
    }
  }, [openIndexDB]);

  // 从IndexDB删除项目
  const deleteProjectFromDB = useCallback(async (projectId) => {
    try {
      const db = await openIndexDB();
      const transaction = db.transaction(['projects'], 'readwrite');
      const store = transaction.objectStore('projects');
      await store.delete(projectId);
      return true;
    } catch (error) {
      console.error('删除项目失败:', error);
      return false;
    }
  }, [openIndexDB]);

  // 保存项目的处理函数
  const handleSaveProject = useCallback(async (projectData) => {
    try {
      const saveResult = await saveProjectToDB(projectData);
      if (saveResult) {
        // 更新本地状态
        setSavedProjects(prev => [projectData, ...prev]);
        success(`项目"${projectData.title}"已成功保存到本地存储`);
      } else {
        error('保存项目失败，请检查存储空间后重试');
      }
    } catch (error) {
      console.error('保存项目出错:', error);
      error('保存项目时发生错误，请检查网络连接或存储权限');
    }
  }, [saveProjectToDB, success, error]);

  // 加载项目的处理函数
  const handleLoadProject = useCallback(async (projectData) => {
    setIsProjectLoading(true);
    setShowAssetModal(false);
    
    // 模拟加载延迟，显示加载动画
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // 设置项目数据到当前工作流
    setProject(prev => ({
      ...prev,
      workflows: {
        ...prev.workflows,
        [prev.currentEpisodeId]: {
          nodes: projectData.nodes || [],
          edges: projectData.edges || []
        }
      }
    }));
    
    setIsProjectLoading(false);
  }, []);

  // 删除项目的处理函数
  const handleDeleteProject = useCallback(async (projectId) => {
    try {
      const deleteResult = await deleteProjectFromDB(projectId);
      if (deleteResult) {
        // 更新本地状态
        setSavedProjects(prev => prev.filter(project => project.id !== projectId));
        success('项目已成功删除');
      } else {
        error('删除项目失败，请检查存储权限后重试');
      }
    } catch (error) {
      console.error('删除项目出错:', error);
      error('删除项目时发生错误，请检查存储权限');
    }
  }, [deleteProjectFromDB, success, error]);

  // 组件挂载时加载项目列表
  useEffect(() => {
    const loadProjects = async () => {
      const projects = await loadProjectsFromDB();
      setSavedProjects(projects);
    };
    loadProjects();
  }, [loadProjectsFromDB]);
  
  // --- Spawn Nodes ---
  // Defined BEFORE addNode to ensure scope availability
  const handleSpawnNodes = useCallback(async (sourceId, prompt, refImg) => {
    const srcNode = nodes.find(n => n.id === sourceId);
    if (!srcNode) return;
    
    // 检查API Key是否有效
    if (!apiFunctions.checkApiKeyBeforeGenerate) {
      console.warn('API Key检查函数未找到，跳过验证');
    } else if (!apiFunctions.checkApiKeyBeforeGenerate()) {
      console.log('API Key验证失败，停止批量生成操作');
      return;
    }
    
    // 立即设置源节点的生成状态，提供即时反馈
    handleUpdateWorkflowFixed(
      prevNodes => prevNodes.map(n => 
        n.id === sourceId 
          ? { 
              ...n, 
              data: { 
                ...n.data, 
                isGenerating: true 
              } 
            } 
          : n
      ),
      null
    );
    
    // 使用优化后的createBatchNodes函数
    const { newNodes, newEdges } = createBatchNodes(srcNode, srcNode.data.batchSize || 1, nodes, edges);
    
    handleUpdateWorkflow(ns => [...ns, ...newNodes], es => [...es, ...newEdges]);
    
        newNodes.forEach(async (n) => {
        if (n.type === 'image') {
            let url;
            
            if (refImg) {
                url = await apiFunctions.generateImageFromRef(n.data.prompt, refImg, n.data.model || 'nano-banana', n.data.ratio);
            } else {
                url = await apiFunctions.generateImage(n.data.prompt, n.data.model || 'nano-banana', n.data.ratio);
            } 
            
            handleUpdateWorkflowFixed(ns => ns.map(curr => {
                if (curr.id === n.id) {
                    // Fix: Ensure default placeholder is used if API fails, using prompt text
                    const textContent = n.data.prompt ? n.data.prompt.split(/\s+/).slice(0, 3).join(' ') : 'Batch';
                    const encodedText = encodeURIComponent(textContent + ` (ID ${n.id.toString().slice(-4)})`);
                    // Fix: Calculate dynamic mock dimensions based on aspect ratio
                    const mockW = 800;
                    const mockH = Math.round(mockW / n.data.aspectRatio);
                    const mockUrl = `https://placehold.co/${mockW}x${mockH}/1d4ed8/ffffff?text=${encodedText}`;
                    
                    if (url) {
                        // 保存到历史记录
                        indexedDBManager.saveToHistory({
                            type: 'image',
                            url: url,
                            prompt: n.data.prompt,
                            model: n.data.model || 'nano-banana',
                            ratio: n.data.ratio,
                            metadata: {
                                source: 'spawn',
                                nodeId: n.id
                            }
                        }).catch(err => console.error('Failed to save spawn image to history:', err));
                    }

                    return { ...curr, data: { ...curr.data, isGenerating: false, generatedImage: url || mockUrl } };
                }
                return curr;
            }));
        }
    });
    
    // 等待所有批量生成任务完成后，重置源节点的生成状态
    Promise.allSettled(newNodes.filter(n => n.type === 'image').map(n => 
      apiFunctions.generateImage(n.data.prompt, n.data.model || 'nano-banana', n.data.ratio)
    )).then(() => {
      handleUpdateWorkflowFixed(
        prevNodes => prevNodes.map(n => 
          n.id === sourceId 
            ? { 
                ...n, 
                data: { 
                  ...n.data, 
                  isGenerating: false 
                } 
              } 
            : n
        ),
        null
      );
    });
  }, [nodes, edges, handleUpdateWorkflowFixed, apiFunctions]);

  const handleAutoLayout = useCallback(() => {
    if (!nodes.length) return;
    const adj = {};
    const inDegree = {};
    const outDegree = {};
    
    // 初始化
    nodes.forEach(n => { 
      adj[n.id] = []; 
      inDegree[n.id] = 0; 
      outDegree[n.id] = 0;
    });
    
    // 构建邻接表和度数表
    edges.forEach(e => {
        if (adj[e.source]) {
          adj[e.source].push(e.target);
          outDegree[e.source]++;
        }
        if (inDegree[e.target] !== undefined) inDegree[e.target]++;
    });
    
    // 分离有连线和无连线的节点
    const connectedNodes = []; // 有连线的节点
    const isolatedNodes = [];  // 无连线的节点
    
    nodes.forEach(n => {
      if (inDegree[n.id] > 0 || outDegree[n.id] > 0) {
        connectedNodes.push(n);
      } else {
        isolatedNodes.push(n);
      }
    });
    
    // 对有连线的节点进行拓扑排序
    const levels = [];
    if (connectedNodes.length > 0) {
      const queue = connectedNodes.filter(n => inDegree[n.id] === 0).map(n => ({ id: n.id, level: 0 }));
      if (queue.length === 0 && connectedNodes.length > 0) queue.push({ id: connectedNodes[0].id, level: 0 });
      
      const visited = new Set();
      while (queue.length > 0) {
          const { id, level } = queue.shift();
          if (visited.has(id)) continue;
          visited.add(id);
          if (!levels[level]) levels[level] = [];
          levels[level].push(id);
          if (adj[id]) adj[id].forEach(targetId => { 
            if (!visited.has(targetId)) queue.push({ id: targetId, level: level + 1 }); 
          });
      }
      
      // 处理循环依赖的情况
      connectedNodes.forEach(n => { 
        if (!visited.has(n.id)) { 
          if (!levels[0]) levels[0] = []; 
          levels[0].push(n.id); 
          visited.add(n.id); 
        } 
      });
    }
    
    handleUpdateWorkflowFixed(prevNodes => {
        const newNodes = [...prevNodes];
        const GRID_W = 480, START_X = 100, START_Y = 100, VERTICAL_SPACING = 80, HORIZONTAL_SPACING = 30;
        
        // 从左到右排列，每行最多4个，添加水平间隔
        let currentX = START_X;
        let currentY = START_Y;
        let currentRowCount = 0;
        let maxRowHeight = 0;
        
        // 先排列有连线的节点（按拓扑排序层级）
        if (levels.length > 0) {
          levels.forEach((levelNodes, levelIndex) => {
            levelNodes.forEach((nodeId) => {
                const nodeIndex = newNodes.findIndex(n => n.id === nodeId);
                if (nodeIndex === -1) return;
                const node = newNodes[nodeIndex];
                const nodeHeight = getNodeHeight(node);
                const nodeWidth = getNodeWidth(node);
                
                // 根据节点宽度自动换行
                if (currentX + nodeWidth > canvasSize.width - 100) {
                    currentX = START_X;
                    currentY += maxRowHeight + VERTICAL_SPACING;
                    currentRowCount = 0;
                    maxRowHeight = 0;
                }
                
                node.x = currentX;
                node.y = currentY;
                
                // 计算下一个节点的位置，考虑节点实际宽度和水平间距
                currentX += nodeWidth + HORIZONTAL_SPACING;
                currentRowCount++;
                maxRowHeight = Math.max(maxRowHeight, nodeHeight);
            });
            
            // 层级之间换行
            if (levelIndex < levels.length - 1) {
                currentX = START_X;
                currentY += maxRowHeight + VERTICAL_SPACING;
                currentRowCount = 0;
                maxRowHeight = 0;
            }
          });
        }
        
        // 再排列无连线的节点
        if (isolatedNodes.length > 0) {
            // 从有连线节点下方开始
            if (levels.length > 0) {
                currentX = START_X;
                currentY += maxRowHeight + VERTICAL_SPACING;
                currentRowCount = 0;
                maxRowHeight = 0;
            }
            
            isolatedNodes.forEach((node) => {
                const nodeIndex = newNodes.findIndex(n => n.id === node.id);
                if (nodeIndex === -1) return;
                const nodeData = newNodes[nodeIndex];
                const nodeHeight = getNodeHeight(nodeData);
                const nodeWidth = getNodeWidth(nodeData);
                
                // 根据节点宽度自动换行
                if (currentX + nodeWidth > canvasSize.width - 100) {
                    currentX = START_X;
                    currentY += maxRowHeight + VERTICAL_SPACING;
                    currentRowCount = 0;
                    maxRowHeight = 0;
                }
                
                nodeData.x = currentX;
                nodeData.y = currentY;
                
                // 计算下一个节点的位置，考虑节点实际宽度和水平间距
                currentX += nodeWidth + HORIZONTAL_SPACING;
                currentRowCount++;
                maxRowHeight = Math.max(maxRowHeight, nodeHeight);
            });
        }
        
        return newNodes;
    }, es => es);
  }, [nodes, edges, handleUpdateWorkflowFixed]);

  // --- Connection Handlers ---
  const onConnectStart = useCallback((nodeId, e) => { e.stopPropagation(); setConnecting({ nodeId }); setMousePos(getHandlePosition(nodeId, 'source', nodes)); setMenu(null); }, [nodes]);
  const onConnectEnd = useCallback((targetId, e) => { 
    e.stopPropagation(); 
    if (connecting && connecting.nodeId !== targetId) { 
      // 检查是否已经存在相同的连接
      const existingEdge = edges.find(edge => 
        edge.source === connecting.nodeId && edge.target === targetId
      );
      
      // 如果已经存在相同的连接，则不创建新连接
      if (!existingEdge) {
        // 生成唯一的边ID，使用时间戳确保唯一性
        const uniqueEdgeId = `edge-${connecting.nodeId}-${targetId}-${Date.now()}`;
        handleUpdateWorkflow(null, es => [...es, { id: uniqueEdgeId, source: connecting.nodeId, target: targetId }]); 
        const sourceNode = (nodes || []).find(n => n.id === connecting.nodeId);
        const targetNode = (nodes || []).find(n => n.id === targetId);
        if (sourceNode?.type === 'image' && targetNode?.type === 'text') {
          const reverseRolePrompt = [
            "你是一位资深提示词工程师，负责将图片内容反推为适用于AI图像生成的高质量中文提示词。",
            "请根据参考图片提炼：主体、风格、构图、镜头、光线、色彩、环境与氛围、材质与细节、摄影参数。",
            "输出两部分：",
            "1) 英文关键词行（逗号分隔，便于模型识别，如 ultra-detailed, cinematic lighting, 35mm, shallow depth of field, rim light, etc.）。",
            "2) 中文详细提示词（完整描述画面元素，可直接用于生成）。"
          ].join("\n");
          handleUpdateWorkflowFixed(
            prevNodes => prevNodes.map(n => 
              n.id === targetId 
                ? { 
                    ...n, 
                    data: { 
                      ...n.data, 
                      selectedRole: n.data.selectedRole || "", 
                      rolePrompt: (n.data.selectedRole && n.data.selectedRole !== '') ? (n.data.rolePrompt || '') : reverseRolePrompt, 
                      reversePromptMode: true 
                    } 
                  } 
                : n
            ),
            es => es
          );
        }
      } else {
        // 可选：显示提示信息告知用户连接已存在
        console.log('连接已存在，不创建重复连接');
      }
    } 
    setConnecting(null); 
  }, [connecting, handleUpdateWorkflow, handleUpdateWorkflowFixed, edges, nodes]);
  const removeEdge = useCallback((id) => { handleUpdateWorkflow(ns => ns, es => es.filter(e => e.id !== id)); }, [handleUpdateWorkflow]);

  // --- Mouse Handlers ---
  const handleMouseDown = useCallback((e) => {
     if ((e.button === 0 && !e.shiftKey) || e.button === 1) {
         setDragState({ type: 'canvas', startX: e.clientX, startY: e.clientY, initialOffset: { ...offset } });
         setSelectedIds(new Set()); setMenu(null);
     } else if (e.button === 0 && e.shiftKey) {
         setDragState({ type: 'select', startX: e.clientX, startY: e.clientY, currentX: e.clientX, currentY: e.clientY });
         setMenu(null);
     }
  }, [offset]);
  
  const handleMouseMove = useCallback((e) => {
     const cPos = screenToCanvas(e.clientX, e.clientY);
     if (connecting) setMousePos(cPos);
     if (!dragState) return;
     if (dragState.type === 'canvas') {
         setOffset({ x: dragState.initialOffset.x + (e.clientX - dragState.startX), y: dragState.initialOffset.y + (e.clientY - dragState.startY) });
     } else if (dragState.type === 'node') {
         const dx = (e.clientX - dragState.startX) / scale;
         const dy = (e.clientY - dragState.startY) / scale;
         handleUpdateWorkflowFixed(ns => ns.map(n => dragState.initialNodes[n.id] ? { ...n, x: dragState.initialNodes[n.id].x + dx, y: dragState.initialNodes[n.id].y + dy } : n));
     } else if (dragState.type === 'select') {
         setDragState(prev => ({ ...prev, currentX: e.clientX, currentY: e.clientY }));
     }
  }, [connecting, dragState, scale, screenToCanvas, handleUpdateWorkflowFixed]);

  const handleMouseUp = useCallback((e) => {
      if (dragState?.type === 'select') {
          const r = { x: Math.min(dragState.startX, dragState.currentX), y: Math.min(dragState.startY, dragState.currentY), w: Math.abs(dragState.currentX - dragState.startX), h: Math.abs(dragState.currentY - dragState.startY) };
          const cR = { x: (r.x - offset.x) / scale, y: (r.y - offset.y) / scale, w: r.w / scale, h: r.h / scale };
          const s = new Set();
          nodes.forEach(n => { if (n.x < cR.x + cR.w && n.x + NODE_WIDTHS[n.type] > cR.x && n.y < cR.y + cR.h && n.y + getNodeHeight(n) > cR.y) s.add(n.id); });
          setSelectedIds(s);
      } else if (connecting) {
          // Check if mouse is dropped on a node (snapping)
          // Use current event position for accuracy instead of potentially lagged state
          const currentPos = screenToCanvas(e.clientX, e.clientY);
          let targetNodeId = null;
          for (const n of nodes) {
              const w = getNodeWidth(n);
              const h = getNodeHeight(n);
              
              if (currentPos.x >= n.x && currentPos.x <= n.x + w &&
                  currentPos.y >= n.y && currentPos.y <= n.y + h) {
                  targetNodeId = n.id;
                  break;
              }
          }

          if (targetNodeId && targetNodeId !== connecting.nodeId) {
             // Mock event with stopPropagation to satisfy onConnectEnd
             onConnectEnd(targetNodeId, { stopPropagation: () => {} });
             return;
          }

          // 使用当前鼠标位置作为菜单弹出位置
          setMenu({ x: currentPos.x, y: currentPos.y, sourceId: connecting.nodeId });
          setConnecting(null);
      }
      setDragState(null);
  }, [dragState, offset, scale, nodes, connecting, mousePos, onConnectEnd]);

  const handleWheel = useCallback((e) => {
    // 如果按住Ctrl键，执行缩放
    if (e.ctrlKey) {
        // 依赖全局useEffect来阻止浏览器默认缩放行为
        const zoomSensitivity = 0.002;
        const delta = -e.deltaY * zoomSensitivity;
        const newScale = Math.min(Math.max(0.1, scale + delta), 5);
        
        if (newScale !== scale && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const newOffsetX = mouseX - (mouseX - offset.x) * (newScale / scale);
            const newOffsetY = mouseY - (mouseY - offset.y) * (newScale / scale);
            
            setScale(newScale);
            setOffset({ x: newOffsetX, y: newOffsetY });
        }
    } else {
        // 否则执行平移
        setOffset(prev => ({
            x: prev.x - e.deltaX,
            y: prev.y - e.deltaY
        }));
    }
  }, [scale, offset]);

  const handleCanvasDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleCanvasDrop = useCallback((e) => {
    e.preventDefault();
    let raw = e.dataTransfer.getData('application/x-topflow-history');
    if (!raw) raw = e.dataTransfer.getData('text/plain');
    if (!raw) return;
    let payload;
    try { payload = JSON.parse(raw); } catch { return; }
    const cPos = screenToCanvas(e.clientX, e.clientY);
    const type = payload.type === 'video' ? 'video' : 'image';
    const newId = Date.now();
    let aspectRatio = null;
    if (payload.ratio && typeof payload.ratio === 'string' && payload.ratio.includes(':')) {
      const parts = payload.ratio.split(':').map(Number);
      if (parts[0] > 0 && parts[1] > 0) aspectRatio = parts[0] / parts[1];
    }
    let data = { isGenerating: false };
    if (type === 'image') {
      data = { ...data, model: "nano-banana", ratio: "4:3", generatedImage: payload.url, aspectRatio: aspectRatio || 4/3 };
    } else {
      data = { ...data, model: "sora2", ratio: "16:9", generatedVideo: true, videoUrl: payload.url, aspectRatio: aspectRatio || 16/9 };
    }
    const newNode = { id: newId, type, x: cPos.x - 160, y: cPos.y - 100, data };
    handleUpdateWorkflowFixed(prevNodes => [...prevNodes, newNode], es => es);
  }, [screenToCanvas, handleUpdateWorkflowFixed]);

  const addNodeFromHistory = useCallback((clientX, clientY, payload) => {
    if (!payload || !payload.url) return;
    const cPos = screenToCanvas(clientX, clientY);
    const type = payload.type === 'video' ? 'video' : 'image';
    const newId = Date.now();
    let aspectRatio = null;
    if (payload.ratio && typeof payload.ratio === 'string' && payload.ratio.includes(':')) {
      const parts = payload.ratio.split(':').map(Number);
      if (parts[0] > 0 && parts[1] > 0) aspectRatio = parts[0] / parts[1];
    }
    let data = { isGenerating: false };
    if (type === 'image') {
      data = { ...data, model: "nano-banana", ratio: "4:3", generatedImage: payload.url, aspectRatio: aspectRatio || 4/3 };
    } else {
      data = { ...data, model: "sora2", ratio: "16:9", generatedVideo: true, videoUrl: payload.url, aspectRatio: aspectRatio || 16/9 };
    }
    const newNode = { id: newId, type, x: cPos.x - 160, y: cPos.y - 100, data };
    handleUpdateWorkflowFixed(prevNodes => [...prevNodes, newNode], es => es);
  }, [screenToCanvas, handleUpdateWorkflowFixed]);

  const onNodeSelect = useCallback((e, id) => {
      e.stopPropagation();
      if (['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      
      // 检查是否点击在连接手柄上
      const target = e.target;
      if (target.closest('.absolute.w-6.h-6.flex.items-center.justify-center.cursor-crosshair')) return;
      
      let newSet;
      if (e.shiftKey) {
          // Shift + 点击：在现有选择中添加/移除节点
          newSet = new Set(selectedIds);
          if (newSet.has(id)) {
              newSet.delete(id);
          } else {
              newSet.add(id);
          }
      } else {
          // 普通点击：如果点击的节点已经在选中集合中，保持现有选择
          if (selectedIds.has(id)) {
              newSet = new Set(selectedIds);
          } else {
              newSet = new Set([id]);
          }
      }
      
      setSelectedIds(newSet); 
      setMenu(null);
      
      // 只在有选中节点时设置拖拽状态
      if (newSet.size > 0) {
          const initialNodes = {};
          nodes.forEach(n => { 
              if (newSet.has(n.id)) {
                  initialNodes[n.id] = { x: n.x, y: n.y }; 
              }
          });
          setDragState({ 
              type: 'node', 
              startX: e.clientX, 
              startY: e.clientY, 
              initialNodes 
          });
      }
  }, [selectedIds, nodes]);


  
  const handleKeyDown = useCallback((e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    // 阻止浏览器的默认缩放行为 (Ctrl+加号/减号)
    if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=')) {
      e.preventDefault();
      return;
    }
    
    // Ctrl+S 保存项目
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      setShowSaveProjectModal(true);
      return;
    }
    
    // Ctrl+C 复制选中节点并在旁边创建副本
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      if (selectedIds.size > 0) {
        e.preventDefault();
        const idsToCopy = Array.from(selectedIds);
        const gap = (LAYOUT_CONSTANTS?.MAGNETIC_GAP ?? 0);
        const newNodesToAdd = [];
        idsToCopy.forEach(id => {
          const src = (nodes || []).find(n => n.id === id);
          if (!src) return;
          const width = NODE_WIDTHS[src.type] || 320;
          const newId = Date.now() + Math.floor(Math.random() * 1000);
          const cloneData = JSON.parse(JSON.stringify(src.data));
          const newNode = { 
            id: newId, 
            type: src.type, 
            x: src.x + width + gap, 
            y: src.y, 
            data: cloneData 
          };
          newNodesToAdd.push(newNode);
        });
        if (newNodesToAdd.length > 0) {
          handleUpdateWorkflowFixed(
            prevNodes => [...prevNodes, ...newNodesToAdd],
            es => es
          );
        }
      }
      return;
    }
    
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedIds.size > 0) {
        e.preventDefault(); 
        const idsToDelete = Array.from(selectedIds);
        handleUpdateWorkflowFixed(
            prevNodes => prevNodes.filter(n => !idsToDelete.includes(n.id)),
            prevEdges => prevEdges.filter(e => !idsToDelete.includes(e.source) && !idsToDelete.includes(e.target))
        );
        setSelectedIds(new Set()); 
      }
    }
  }, [selectedIds, handleUpdateWorkflowFixed, setShowSaveProjectModal, nodes]);

  // 模式生成状态管理
  const [modeGenerating, setModeGeneratingState] = useState(false);
  const [modeSourceNodeId, setModeSourceNodeId] = useState(null);
  const [currentMode, setCurrentMode] = useState('generate'); // generate, storyboard, grid

  // 将函数暴露到全局
  useEffect(() => {
    window.topFlow = {
      createStoryboardNodes,
      createGridNodes,
      updateStoryboardPrompts,
      setModeGenerating: setModeGeneratingState,
      setModeSourceNode: setModeSourceNodeId,
      setCurrentMode: setCurrentMode,
      isModeGenerating: () => modeGenerating,
      getModeSourceNode: () => modeSourceNodeId,
      getCurrentMode: () => currentMode,
      addNodeFromHistory,
      autoLayoutAllNodes
    };
  }, [createStoryboardNodes, createGridNodes, updateStoryboardPrompts, modeGenerating, modeSourceNodeId, currentMode, addNodeFromHistory, autoLayoutAllNodes]);

  useEffect(() => { window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown); }, [handleKeyDown]);

  // 全局阻止浏览器默认缩放行为
  useEffect(() => {
    const handleWheel = (e) => {
      // 如果在画布区域内，并且按住Ctrl键，阻止浏览器默认缩放
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };
    
    // 捕获阶段阻止，确保在浏览器处理之前拦截
    window.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    
    return () => {
      window.removeEventListener('wheel', handleWheel, { capture: true });
    };
  }, []);

  if (isLoading) return <div className="flex items-center justify-center h-screen w-full bg-black text-zinc-400">Loading...</div>;

  return (
    <div className="flex flex-col h-screen w-full bg-black overflow-hidden font-sans text-zinc-100 selection:bg-zinc-800">
      {/* 启动页面 */}
      {showSplash && <SplashScreen onEnter={() => setShowSplash(false)} />}
      
      {/* 通知系统容器 */}
      <NotificationContainer notifications={notifications} removeNotification={removeNotification} />
      
      <Sidebar 
        onAdd={addNode} 
        onShowProjectMenu={(e) => {
          if (e && e.currentTarget) {
            const rect = e.currentTarget.getBoundingClientRect();
            // Position to the right of the button (rect.right + margin)
            // Align with top of the button (rect.top)
            setProjectMenuPos({ x: rect.right + 12, y: rect.top });
          } else {
            // Fallback
            setProjectMenuPos(null);
          }
          setShowProjectMenu(true);
        }} 
        onShowTemplateList={() => setShowTemplateList(true)} 
        onShowAssetModal={(e) => {
          if (e && e.currentTarget) {
            const rect = e.currentTarget.getBoundingClientRect();
            // Align with button top, position to the right
            setAssetModalPos({ x: rect.right + 12, y: rect.top });
          } else {
            setAssetModalPos(null);
          }
          setShowAssetModal(true);
        }} 
        onShowHistory={(e) => {
          if (e && e.currentTarget) {
            const rect = e.currentTarget.getBoundingClientRect();
            // Align with button top, position to the right
            setHistoryModalPos({ x: rect.right + 12, y: rect.top });
          } else {
            setHistoryModalPos(null);
          }
          setShowHistoryModal(true);
        }}
        onAutoLayout={autoLayoutAllNodes}
      /> 
      {showProjectMenu && <ProjectMenu onClose={() => setShowProjectMenu(false)} episodes={project.episodes} currentEpisodeId={currentEpisodeId} onUpdateName={handleUpdateEpisodeName} onAddEpisode={handleAddEpisode} onDeleteEpisode={handleDeleteEpisode} onSelectEpisode={handleSwitchEpisode} position={projectMenuPos} />}
      {showApiKeyModal && <ApiKeyConfigModal onClose={() => setShowApiKeyModal(false)} currentKey={userApiKey} onSave={setUserApiKey} onClear={() => setUserApiKey("")} />}
      {showHistoryModal && <HistoryModal onClose={() => setShowHistoryModal(false)} position={historyModalPos} />}
      {synopsisData && <SynopsisDisplayModal onClose={() => setSynopsisData(null)} synopsisData={synopsisData} />}
      {showTemplateList && <TemplateListModal onClose={() => setShowTemplateList(false)} onSelectTemplate={handleSelectTemplate} />}
      {showSaveProjectModal && <SaveProjectModal onClose={() => setShowSaveProjectModal(false)} onSave={handleSaveProject} projectData={{ nodes, edges }} />}
      {showAssetModal && <AssetModal onClose={() => setShowAssetModal(false)} projects={savedProjects} onLoadProject={handleLoadProject} onDeleteProject={handleDeleteProject} position={assetModalPos} />}
      
      {/* 项目加载动画 */}
      {isProjectLoading && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-500">
          <div className="bg-zinc-900/95 backdrop-blur-xl rounded-2xl shadow-xl p-10 w-96 max-w-full border border-zinc-800 animate-in zoom-in-50 duration-500">
            <div className="flex flex-col items-center gap-6">
              {/* 加载图标 */}
              <div className="relative">
                <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center shadow-lg border border-zinc-800">
                  <FolderKanban size={24} className="text-white" />
                </div>
              </div>
              
              {/* 加载动画 */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-white mb-2">加载项目中</h3>
                  <p className="text-sm text-zinc-400">正在加载项目数据，请稍候...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 网络错误通知 */}
      {networkError && (
        <div className="fixed top-4 right-4 z-[150] bg-orange-900/20 border border-orange-900/50 text-orange-400 p-4 rounded-lg shadow-lg max-w-md animate-in fade-in slide-in-from-right-2 duration-300">
          <div className="flex">
            <div className="py-1">
              <svg className="fill-current h-6 w-6 text-orange-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z"/>
              </svg>
            </div>
            <div>
              <p className="font-bold">网络连接问题</p>
              <p className="text-sm">检测到网络连接问题，正在使用备用内容。请检查您的网络连接。</p>
            </div>
          </div>
        </div>
      )}
      
      {showApiTest && (
        <div className="absolute inset-0 z-[180] bg-black/50 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-zinc-900 rounded-xl shadow-2xl p-4 w-[90%] max-w-5xl max-h-[90vh] overflow-auto animate-in zoom-in-50 duration-200 border border-zinc-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                <TestTube size={24} className="text-zinc-100" />
                API 功能测试
              </h2>
              <button onClick={() => setShowApiTest(false)} className="text-zinc-500 hover:text-zinc-300">
                <X size={24} />
              </button>
            </div>
            <React.Suspense fallback={<div className="flex justify-center p-8"><div className="w-8 h-8 border-4 border-zinc-100 border-t-transparent rounded-full animate-spin"></div></div>}>
              <ApiTest />
            </React.Suspense>
          </div>
        </div>
      )}
      
      <div ref={containerRef} className="flex-1 w-full h-full relative bg-black cursor-default overflow-hidden" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onWheel={handleWheel} onDragOver={handleCanvasDragOver} onDrop={handleCanvasDrop} tabIndex={0}>
         <div className="absolute inset-0 pointer-events-none w-full h-full" style={{ backgroundPosition: `${offset.x}px ${offset.y}px`, backgroundSize: `${20 * scale}px ${20 * scale}px`, backgroundImage: 'radial-gradient(#27272a 1.5px, transparent 1.5px)', opacity: 1 }} />
         <div className="absolute inset-0 origin-top-left will-change-transform" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}>
            <svg className="absolute inset-0 overflow-visible pointer-events-none w-full h-full" style={{ zIndex: 0 }}>
               {(edges || []).map(e => <BezierCurve key={e.id} start={getHandlePosition(e.source, 'source', nodes)} end={getHandlePosition(e.target, 'target', nodes)} onDoubleClick={(ev) => { ev.stopPropagation(); removeEdge(e.id); }} />)}
               {connecting && <BezierCurve start={getHandlePosition(connecting.nodeId, 'source', nodes)} end={mousePos} stroke="#52525b" strokeWidth={4} strokeDasharray="5,5" />}
               {menu && <BezierCurve start={getHandlePosition(menu.sourceId, 'source', nodes)} end={{ x: menu.x, y: menu.y }} stroke="#52525b" strokeDasharray="4,4" strokeWidth={2} />}
            </svg>
            {(nodes || []).map(n => {
                // 去重处理，确保每个源节点只被计算一次
                const sourceNodes = (edges||[]).filter(e => e.target === n.id).map(e => nodes.find(src => src.id == e.source)).filter(Boolean);
                const uniqueSourceIds = new Set();
                const uniqueSourceNodes = sourceNodes.filter(node => {
                    if (uniqueSourceIds.has(node.id)) return false;
                    uniqueSourceIds.add(node.id);
                    return true;
                });
                
                const linked = { 
                    textInput: uniqueSourceNodes.find(src => src?.type === 'text'), 
                    imageInputs: uniqueSourceNodes.filter(src => src?.type === 'image'),
                    videoInputs: uniqueSourceNodes.filter(src => src?.type === 'video')
                };
                return <NodeCard key={n.id} node={n} updateNode={updateNode} isSelected={selectedIds.has(n.id)} onSelect={onNodeSelect} onConnectStart={onConnectStart} onConnectEnd={onConnectEnd} onSpawnNodes={handleSpawnNodes} onDelete={deleteNode} linkedSources={linked} imageInputs={linked.imageInputs} videoInputs={linked.videoInputs} apiFunctions={apiFunctions} onShowAssetModal={() => setShowAssetModal(true)} />;
            })}
            {menu && <CreationMenu x={menu.x} y={menu.y} onSelect={(t) => { addNode(t, menu.x + 50, menu.y, menu.sourceId); setMenu(null); }} onClose={() => setMenu(null)} />}
         </div>
         {dragState?.type === 'select' && <div style={{ position: 'fixed', left: Math.min(dragState.startX, dragState.currentX), top: Math.min(dragState.startY, dragState.currentY), width: Math.abs(dragState.currentX - dragState.startX), height: Math.abs(dragState.currentY - dragState.startY), backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid #52525b', zIndex: 9999, pointerEvents: 'none' }} />}
        <div className="absolute bottom-6 left-4 z-[100] pointer-events-auto flex flex-col gap-2">
         <Button variant="secondary" icon={Key} onClick={() => setShowApiKeyModal(true)} className={`shadow-lg border-zinc-800 transition-colors ${userApiKey ? 'bg-zinc-900 text-zinc-400 hover:text-zinc-100' : 'bg-red-900/20 text-red-400'}`} title="配置 API Key">API Key</Button>
         
         {/* 画布缩放控制 */}
         <div className="bg-zinc-900 rounded-lg shadow-lg border border-zinc-800 p-2 flex items-center gap-2">
           <button 
             onClick={() => setScale(s => Math.max(0.1, s - 0.1))}
             className="w-8 h-8 flex items-center justify-center rounded hover:bg-zinc-800 transition-colors text-zinc-400"
             title="缩小"
           >
             <Minus size={16} />
           </button>
           <button 
             onClick={() => setScale(1)}
             className="text-sm font-medium text-zinc-300 min-w-[40px] text-center px-2 py-1 rounded hover:bg-zinc-800 transition-colors"
             title="重置到100%"
           >
             {Math.round(scale * 100)}%
           </button>
           <button 
             onClick={() => setScale(s => Math.min(3, s + 0.1))}
             className="w-8 h-8 flex items-center justify-center rounded hover:bg-zinc-800 transition-colors text-zinc-400"
             title="放大"
           >
             <Plus size={16} />
           </button>
         </div>
        </div>
         <div className="absolute bottom-6 right-4 z-[100] pointer-events-auto flex gap-2">
           <Button 
            variant="secondary" 
            icon={Map} 
            onClick={() => setShowMiniMap(!showMiniMap)}
            className={`shadow-lg border-zinc-800 transition-colors ${showMiniMap ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-900'}`}
            title="显示/隐藏导航图"
          >
            导航图
          </Button>
          <Button variant="secondary" icon={LayoutTemplate} onClick={handleAutoLayout} className="bg-zinc-900 shadow-lg border-zinc-800">自动整理</Button>
        </div>
        
        {/* 右上角保存项目按钮 */}
        <div className="absolute top-6 right-4 z-[100] pointer-events-auto">
          <Button 
            variant="secondary" 
            icon={Save} 
            onClick={() => setShowSaveProjectModal(true)} 
            className="bg-zinc-900 shadow-lg border-zinc-800 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
            title="保存当前项目"
          >
            保存项目
          </Button>
         </div>
         
         {/* 画布底部快捷提示 */}
         <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 z-[100] pointer-events-none text-xs text-zinc-500">
           双击连线删除 • Shift+框选移动 • Ctrl+滚轮缩放
         </div>
         
         {/* 导航图 */}
         <MiniMap 
           nodes={nodes} 
           offset={offset} 
           scale={scale} 
           canvasSize={canvasSize}
           onNavigate={navigateToPosition}
           visible={showMiniMap}
         />
      </div>
    </div>
  );
}
