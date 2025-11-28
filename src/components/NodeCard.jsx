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
    const prompt = promptFromSource;
    let referenceImage = null; 
    let referenceImages = []; 
    
    if (node.type === 'image') {
      if (imageInputNodes.length > 0) referenceImage = imageInputNodes[0].data.generatedImage;
      else if (node.data.generatedImage) referenceImage = node.data.generatedImage;
    } else if (node.type === 'video') {
      referenceImages = imageInputNodes.map(n => n.data.generatedImage).filter(img => img);
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
        let url;
        if (referenceImage && isRefValid) {
          url = await apiFunctions.generateImageFromRef(prompt, referenceImage, node.data.ratio);
        } else {
          url = await apiFunctions.generateImage(prompt, node.data.ratio);
        }
        
        if (url) {
          setTimeout(() => {
            updateNode(node.id, { data: { ...node.data, isGenerating: false, generatedImage: url, usingReference: false } });
          }, 500); 
        } else {
          const ratioStr = node.data.ratio || "4:3";
          const [wRatio, hRatio] = ratioStr.split(':').map(Number);
          const mockWidth = 800;
          const mockHeight = Math.round(mockWidth * hRatio / wRatio); 
          const textContent = prompt ? prompt.split(/\s+/).slice(0, 3).join(' ') : 'Image';
          const mockUrl = `https://placehold.co/${mockWidth}x${mockHeight}/1d4ed8/ffffff?text=${encodeURIComponent(textContent)}`;
          
          updateNode(node.id, { 
            data: { 
              ...node.data, 
              isGenerating: false, 
              generatedImage: mockUrl,
              usingReference: false,
              aspectRatio: wRatio/hRatio 
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
        const audioUrl = await apiFunctions.generateSpeech(promptFromSource);
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
    image: "text-blue-500", 
    video: "text-blue-500", 
    audio: "text-blue-500", 
    text: "text-gray-500" 
  }[node.type];

  return (
    <div className={`absolute flex flex-col transition-shadow duration-200 ease-out group ${isSelected ? 'shadow-2xl z-50' : 'shadow-md'}`} style={{ left: node.x, top: node.y, width, zIndex: isSelected || isExpanded ? 50 : 10 }} onMouseDown={handleMouseDown}>
      <HandlePoint type="target" top={handleY} onMouseUp={(e) => onConnectEnd(node.id, e)} />
      <HandlePoint type="source" top={handleY} onMouseDown={(e) => onConnectStart(node.id, e)} />
      
      <button 
        onClick={(e) => { e.stopPropagation(); onDelete(node.id); }} 
        className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full shadow-md border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 transition-all opacity-0 group-hover:opacity-100 z-[60]"
      >
        <X size={12} />
      </button>
      
      <div className="flex items-center justify-between px-1 pb-1 cursor-grab active:cursor-grabbing handle select-none opacity-80 hover:opacity-100 transition-opacity">
        <div className={`flex items-center gap-1.5 text-[11px] font-semibold ${headerColor} bg-white/80 backdrop-blur px-2 py-0.5 rounded-full shadow-sm border border-gray-100`}>
          {React.createElement(headerIcon, { size: 12, strokeWidth: 2.5 })}<span>{headerLabel}</span>
        </div>
        {node.type !== 'text' && <div className="text-[10px] text-gray-400 font-mono">#{node.id.toString().slice(-4)}</div>}
      </div>
      
      <div onClick={node.type !== 'text' ? (e) => { e.stopPropagation(); setIsExpanded(true); } : undefined}>
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
          className="absolute top-8 right-2 z-50 p-1 bg-white/90 rounded-full hover:bg-white text-gray-400 hover:text-gray-600 shadow-sm"
        >
          <ChevronDown size={14} className="rotate-180" />
        </button>
      )}
    </div>
  );
});

export default NodeCard;