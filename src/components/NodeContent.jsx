import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Mountain, Play, Video, Music, FileText, ImageIcon, Wand2, Download, Trash2, Square, Layers, ChevronDown, Sparkles, Search, RefreshCw, LinkIcon, Maximize2, X } from 'lucide-react';
import { Button, NodeSelect, InputBadge } from './UI.jsx';
import { downloadFile, NODE_WIDTHS } from '../constants.js';
import apiClient from '../api/client.js';

// 共用的放大弹窗组件
const ZoomModal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  
  return createPortal(
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999]" onClick={onClose}>
      <div className="relative max-w-[90vw] max-h-[90vh] bg-white rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="absolute top-4 right-4 flex justify-between items-center gap-2">
          <div className="text-lg font-bold text-gray-800">{title}</div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-600" />
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

// 共用的媒体操作按钮组件
const MediaActionButtons = ({ 
  onZoom, 
  onDownload, 
  onClear, 
  showDownload = true, 
  isDisabled = false,
  downloadTitle = "下载",
  clearTitle = "清除"
}) => {
  if (isDisabled) return null;
  
  return (
    <div className="flex gap-2">
      <button onClick={onZoom} className="p-1.5 bg-white/80 hover:bg-white text-blue-600 rounded-full shadow-sm backdrop-blur-sm transition-colors" title="放大查看">
        <Maximize2 size={14} />
      </button>
      {showDownload && (
        <button onClick={onDownload} className="p-1.5 bg-white/80 hover:bg-white text-gray-700 rounded-full shadow-sm backdrop-blur-sm transition-colors" title={downloadTitle}>
          <Download size={14} />
        </button>
      )}
      <button onClick={onClear} className="p-1.5 bg-white/80 hover:bg-white text-red-500 rounded-full shadow-sm backdrop-blur-sm transition-colors" title={clearTitle}>
        <Trash2 size={14} />
      </button>
    </div>
  );
};

// 共用的生成状态指示器组件
const GenerationIndicator = ({ text, color = "blue" }) => {
  const colorClasses = {
    blue: "border-blue-500 text-blue-600",
    green: "border-green-500 text-green-600",
    purple: "border-purple-500 text-purple-600",
  };
  
  const spinnerColor = colorClasses[color] || colorClasses.blue;
  
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-blue-50/50 backdrop-blur-sm">
      <div className={`w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mb-2 ${spinnerColor}`} />
      <span className={`text-xs font-bold animate-pulse ${spinnerColor}`}>{text}</span>
    </div>
  );
};

// 共用的输入框组件
const PromptInput = ({ 
  value, 
  onChange, 
  placeholder, 
  onEnhance, 
  rows = 2,
  onMouseDown,
  onWheel
}) => (
  <div className="relative">
    <textarea 
      className="w-full text-sm bg-transparent border border-gray-100 rounded-md p-2 focus:ring-1 focus:ring-blue-200 outline-none resize-none pr-8" 
      placeholder={placeholder} 
      rows={rows} 
      value={value} 
      onChange={onChange} 
      onMouseDown={onMouseDown} 
      onWheel={onWheel} 
    />
    <button onClick={onEnhance} className="absolute right-2 top-2 text-purple-400 hover:text-purple-600 transition-colors">
      <Wand2 size={14} />
    </button>
  </div>
);

// 共用的底部操作栏组件
const BottomActionBar = ({ 
  children, 
  actionButton, 
  showBorder = true 
}) => (
  <div className={`flex justify-between items-center ${showBorder ? 'pt-2 border-t border-gray-50 w-full' : ''}`}>
    <div className="flex gap-1.5">
      {children}
    </div>
    {actionButton}
  </div>
);

// 共用的比例选择器组件
const AspectRatioSelector = ({ value, onChange, options = [
  {value:"16:9",label:"16:9"}, 
  {value:"9:16",label:"9:16"}, 
  {value:"1:1",label:"1:1"}, 
  {value:"4:3",label:"4:3"}, 
  {value:"3:4",label:"3:4"}
] }) => (
  <NodeSelect 
    value={value} 
    options={options} 
    icon={Square} 
    onChange={onChange} 
    className="w-20" 
  />
);

// 共用的批处理大小选择器组件
const BatchSizeSelector = ({ value, onChange, options = [
  {value:1,label:"1x"}, 
  {value:2,label:"2x"}, 
  {value:4,label:"4x"}
] }) => (
  <NodeSelect 
    value={value} 
    options={options} 
    icon={Layers} 
    onChange={v => onChange(parseInt(v))} 
    className="w-16" 
  />
);

// 共用的生成按钮组件
const GenerateButton = ({ 
  onClick, 
  text = "生成", 
  isDisabled = false,
  color = "black",
  icon = <Wand2 size={10} className="fill-white" />
}) => {
  const colorClasses = {
    black: "bg-black text-white hover:bg-gray-800",
    blue: "bg-blue-600 text-white hover:bg-blue-700",
    green: "bg-green-600 text-white hover:bg-green-700",
    purple: "bg-purple-600 text-white hover:bg-purple-700",
  };
  
  const buttonColor = colorClasses[color] || colorClasses.black;
  
  return (
    <button 
      onClick={isDisabled ? undefined : onClick} 
      disabled={isDisabled}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
        isDisabled ? 'cursor-not-allowed opacity-50' : 
        `${buttonColor} hover:shadow-lg active:scale-95`
      }`}
    >
      {icon}
      {text}
    </button>
  );
};

// 图片节点内容组件
export const ImageContent = ({ node, updateNode, isExpanded, handleGenerate, textInputLabel, generateText, linkedSources }) => {
  const modelOptions = [
    { value: "nano-banana", label: "Nano Banana" },
    { value: "nano-banana-pro", label: "Nano Banana Pro" },
  ];

  // 模式选项
  const modeOptions = [
    { value: "generate", label: "生成模式" },
    { value: "storyboard", label: "分镜模式" },
    { value: "grid", label: "网格模式" },
  ];

  const fileRef = useRef(null);
  const [isZoomed, setIsZoomed] = useState(false);

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

  const handleZoom = () => {
    setIsZoomed(true);
  };

  const handleCloseZoom = () => {
    setIsZoomed(false);
  };

  // 分镜模式处理函数
  const handleStoryboard = async () => {
    if (!node.data.prompt) return;
    
    // 立即设置源节点的生成状态，提供即时反馈
    updateNode(node.id, { data: { ...node.data, isGenerating: true } });
    
    // 设置全局分镜生成状态
    if (window.topFlow && window.topFlow.setModeGenerating && window.topFlow.setModeSourceNode && window.topFlow.setCurrentMode) {
      window.topFlow.setModeGenerating(true);
      window.topFlow.setModeSourceNode(node.id);
      window.topFlow.setCurrentMode('storyboard');
    }
    
    try {
      // 根据是否有参考图片来构建不同的提示词
      let storyboardPrompt;
      
      if (node.data.generatedImage) {
        // 如果有参考图片，使用优化的"启承转结"逻辑生成分镜
        storyboardPrompt = `你是一位专业的视频预可视化艺术家，专精于为AI视频生成创作首尾帧驱动的连贯关键帧序列。

请基于提供的图像和基础提示词，生成4个视觉连续的关键帧描述，要求：

严格视觉连续性：
- 所有4个关键帧必须基于同一源图像元素
- 保持相同：人物/物体、服装/外观、环境背景、光照条件、色彩风格
- 仅允许变化：姿势、表情、镜头构图、相机角度、部分遮挡

首尾帧视频生成优化：
- 关键帧#1与关键帧#4应形成自然的动作或状态循环
- 关键帧之间的变化需平滑、线性可预测，便于AI插值

四帧叙事逻辑：
- 关键帧1：初始状态（视频起点）
- 关键帧2：动作发展/情绪推进
- 关键帧3：变化高潮/转折点
- 关键帧4：结束状态（视频终点，可与起点呼应）

基础提示词: ${node.data.prompt}

请按以下格式输出每个关键帧的详细描述：

【KF#/4 | 镜头类型 | 视频时间点】
画面描述：详细的视觉内容，包括所有可见元素的状态
构图参数：视角、景别、焦点主体
连续性说明：与前后帧的视觉连接点

将上面的提示词输出内容使用json格式输出，方便分镜生成解析生成分镜图的提示词`;
      } else {
        // 如果没有参考图片，使用优化的"启承转结"逻辑
        storyboardPrompt = `你是一位专业的视频预可视化艺术家，专精于为AI视频生成创作首尾帧驱动的连贯关键帧序列。

请基于基础提示词，生成4个视觉连续的关键帧描述，要求：

严格视觉连续性：
- 所有4个关键帧必须基于同一场景设定
- 保持一致：人物设定、环境风格、色彩基调、光照条件
- 仅允许变化：姿势动作、表情变化、镜头角度、构图景别

首尾帧视频生成优化：
- 关键帧#1与关键帧#4应形成自然的动作循环
- 关键帧之间的变化需平滑、可预测，便于AI插值

四帧叙事逻辑：
- 关键帧1：启 - 初始状态建立
- 关键帧2：承 - 动作发展推进  
- 关键帧3：转 - 变化高潮转折
- 关键帧4：结 - 结束状态收尾

基础提示词: ${node.data.prompt}

请按以下格式输出每个关键帧的详细描述：

【KF#/4 | 镜头类型 | 视频时间点】
画面描述：详细的视觉内容，包括所有可见元素的状态
构图参数：视角、景别、焦点主体
连续性说明：与前后帧的视觉连接点

将上面的提示词输出内容使用json格式输出，方便分镜生成解析生成分镜图的提示词`;
      }

      console.log('生成分镜提示词，有参考图片:', !!node.data.generatedImage);
      
      // 如果有参考图片，使用多模态分析API；否则使用普通文本生成API
      let response;
      if (node.data.generatedImage) {
        // 使用多模态分析API，将参考图片传递给AI进行分析
        response = await apiClient.generateTextWithImage(storyboardPrompt, node.data.generatedImage);
      } else {
        // 没有参考图片时使用普通文本生成API
        response = await generateText(storyboardPrompt);
      }
      console.log('AI返回的分镜描述:', response);
      
      // 处理返回的分镜描述
      let scenes = [];
      
      // 尝试解析JSON格式（如果AI返回了JSON）
      try {
        let cleanResponse = response;
        
        // 首先尝试提取JSON部分
        const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          cleanResponse = jsonMatch[1].trim();
        } else if (response.includes('{') && response.includes('}')) {
          // 如果没有代码块标记，尝试提取第一个JSON对象
          const jsonStart = response.indexOf('{');
          const jsonEnd = response.lastIndexOf('}') + 1;
          if (jsonStart !== -1 && jsonEnd > jsonStart) {
            cleanResponse = response.substring(jsonStart, jsonEnd);
          }
        }
        
        console.log('尝试解析的JSON内容:', cleanResponse);
        
        const jsonData = JSON.parse(cleanResponse);
        
        // 支持多种JSON格式
        if (jsonData && jsonData.keyframe_sequence && Array.isArray(jsonData.keyframe_sequence)) {
          // 使用keyframe_sequence格式的数据
          scenes = jsonData.keyframe_sequence.map(frame => frame.description);
          console.log('JSON格式分镜数据 (keyframe_sequence):', jsonData.keyframe_sequence);
        } else if (jsonData && jsonData.frames && Array.isArray(jsonData.frames)) {
          // 使用frames格式的数据
          scenes = jsonData.frames.map(frame => frame.imagePrompt || frame.description);
          console.log('JSON格式分镜数据 (frames):', jsonData.frames);
        } else {
          throw new Error('Invalid JSON format - no valid array found');
        }
      } catch (error) {
        // 如果不是JSON格式，使用智能文本处理方式
        console.log('JSON解析失败，使用智能文本处理方式:', error.message);
        
        // 提取真正有用的描述性文本
        const lines = response.split('\n')
          .map(s => s.trim())
          .filter(s => {
            // 过滤掉：空行、代码块标记、JSON结构标记、描述性标题
            return s.length > 0 && 
                   !s.includes('```') && 
                   !s.includes('{') && 
                   !s.includes('}') &&
                   !s.includes('镜头') && 
                   !s.includes('要求') && 
                   !s.includes('分镜') &&
                   !s.includes('关键帧') &&
                   !s.includes('描述') &&
                   !s.includes('JSON格式') &&
                   !s.includes('专业') &&
                   !s.includes('基于');
          })
          .slice(0, 4);
        
        scenes = lines;
        console.log('智能处理后的分镜描述:', scenes);
      }

      console.log('处理后的分镜描述:', scenes);

      // 如果AI返回的分镜描述不足4个，使用默认分镜描述
      if (scenes.length < 4) {
        const defaultScenes = node.data.generatedImage ? [
          `${node.data.prompt} - 保持原图构图和主体`,
          `${node.data.prompt} - 调整视角和角度`,
          `${node.data.prompt} - 改变距离和焦点`,
          `${node.data.prompt} - 展示细节和结果`
        ] : [
          `${node.data.prompt} - 远景全景`,
          `${node.data.prompt} - 中景构图`,
          `${node.data.prompt} - 近景特写`,
          `${node.data.prompt} - 细节展示`
        ];
        
        // 填充不足的场景
        for (let i = scenes.length; i < 4; i++) {
          scenes.push(defaultScenes[i]);
        }
      }

      // 创建分镜节点并生成图片
      if (window.topFlow && window.topFlow.createStoryboardNodes) {
        console.log('开始创建分镜节点，使用优化后的提示词');
        await window.topFlow.createStoryboardNodes(node, scenes, node.data.generatedImage);
      }
      
    } catch (error) {
      console.error('分镜提示词生成失败:', error);
      
      // 如果生成失败，使用默认分镜描述创建节点
      const defaultScenes = node.data.generatedImage ? [
        `${node.data.prompt} - 保持原图构图和主体`,
        `${node.data.prompt} - 调整视角和角度`,
        `${node.data.prompt} - 改变距离和焦点`,
        `${node.data.prompt} - 展示细节和结果`
      ] : [
        `${node.data.prompt} - 远景全景`,
        `${node.data.prompt} - 中景构图`,
        `${node.data.prompt} - 近景特写`,
        `${node.data.prompt} - 细节展示`
      ];

      if (window.topFlow && window.topFlow.createStoryboardNodes) {
        console.log('使用默认分镜描述创建节点');
        await window.topFlow.createStoryboardNodes(node, defaultScenes, node.data.generatedImage);
      }
    } finally {
      // 分镜生成状态由全局状态管理，不需要重置源节点的生成状态
      // 全局状态会在 createStoryboardNodes 中正确重置
    }
  };

  // 网格模式处理函数
  const handleGrid = async () => {
    if (!node.data.prompt) return;
    
    // 立即设置源节点的生成状态，提供即时反馈
    updateNode(node.id, { data: { ...node.data, isGenerating: true } });
    
    try {
      // 根据是否有参考图片来构建不同的提示词
      let gridPrompt;
      
      if (node.data.generatedImage) {
        // 如果有参考图片，要求AI生成JSON格式的关键帧序列，强调视觉一致性
        gridPrompt = `请仔细分析参考图片的视觉风格、构图、色调、人物特征等元素，生成的分镜关键帧需要保持与参考图片的视觉一致性。

参考图片描述：${node.data.prompt}

请生成一个JSON格式的关键帧序列，每个帧包含：
1. index - 帧序号
2. shotType - 镜头类型
3. timePoint - 时间点
4. visualDescription - 视觉描述
5. composition - 构图信息
6. continuity - 连续性说明
7. imagePrompt - 图像提示词（需要包含保持与参考图片一致的视觉元素）

重要提示：图像提示词需要包含明确的视觉一致性要求，如"保持与参考图片相同的艺术风格"、"延续参考图片的色调"、"保持人物特征一致"等。

请严格按照以下JSON格式返回，只返回JSON数据，不包含其他文字：

{
  "frames": [
    {
      "index": 1,
      "shotType": "开场镜头",
      "timePoint": "0-3秒",
      "visualDescription": "视觉描述内容",
      "composition": "构图信息",
      "continuity": "连续性说明",
      "imagePrompt": "图像提示词，包含视觉一致性要求"
    },
    {
      "index": 2,
      "shotType": "动作镜头",
      "timePoint": "3-6秒",
      "visualDescription": "视觉描述内容",
      "composition": "构图信息",
      "continuity": "连续性说明",
      "imagePrompt": "图像提示词，包含视觉一致性要求"
    },
    {
      "index": 3,
      "shotType": "反应镜头",
      "timePoint": "6-9秒",
      "visualDescription": "视觉描述内容",
      "composition": "构图信息",
      "continuity": "连续性说明",
      "imagePrompt": "图像提示词，包含视觉一致性要求"
    },
    {
      "index": 4,
      "shotType": "结局镜头",
      "timePoint": "9-12秒",
      "visualDescription": "视觉描述内容",
      "composition": "构图信息",
      "continuity": "连续性说明",
      "imagePrompt": "图像提示词，包含视觉一致性要求"
    }
  ]
}`;
      } else {
        // 如果没有参考图片，生成4宫格漫画分镜描述
        gridPrompt = `基于以下场景描述，生成4个连续的漫画分镜头画面描述，用于创建一张完整的4宫格漫画分镜图：

${node.data.prompt}

要求：
1. 采用漫画分镜的典型构图方式
2. 每个描述控制在30字以内，适合AI图像生成
3. 保持画面连贯性和故事性
4. 每个分镜需要标注时长（秒数），格式："描述内容 (时长：X秒)"
5. 直接返回4个描述，每行一个
6. 确保描述适合生成一张包含4个分镜格的完整图片
7. 如果有角色对话内容，请使用中文显示

漫画分镜顺序：
- 镜头1：开场镜头，建立场景和氛围 (时长：3-5秒)
- 镜头2：主体动作或中文对话镜头 (时长：4-6秒)
- 镜头3：反应镜头或细节特写 (时长：2-4秒)
- 镜头4：结局或高潮镜头 (时长：3-5秒)

请确保描述适合漫画风格的图像生成，所有对话内容使用中文，每个分镜都包含时长信息：`;
      }

      console.log('开始生成4宫格漫画分镜描述，有参考图片:', !!node.data.generatedImage);
      const response = await generateText(gridPrompt);
      console.log('AI返回的网格分镜描述:', response);
      
      // 处理返回的数据 - 尝试解析JSON格式
      let scenes = [];
      let jsonData = null;
      let isJsonFormat = false;
      
      try {
        let cleanResponse = response;
        
        // 首先尝试提取JSON部分
        const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          cleanResponse = jsonMatch[1].trim();
        } else if (response.includes('{') && response.includes('}')) {
          // 如果没有代码块标记，尝试提取第一个JSON对象
          const jsonStart = response.indexOf('{');
          const jsonEnd = response.lastIndexOf('}') + 1;
          if (jsonStart !== -1 && jsonEnd > jsonStart) {
            cleanResponse = response.substring(jsonStart, jsonEnd);
          }
        }
        
        console.log('尝试解析的网格JSON内容:', cleanResponse);
        
        jsonData = JSON.parse(cleanResponse);
        
        // 支持多种JSON格式
        if (jsonData && jsonData.frames && Array.isArray(jsonData.frames)) {
          // 使用frames格式的数据
          scenes = jsonData.frames.map(frame => `${frame.imagePrompt || frame.description} (时长：${frame.timePoint || '3-5秒'})`);
          console.log('JSON格式网格分镜数据 (frames):', jsonData.frames);
          isJsonFormat = true;
        } else if (jsonData && jsonData.keyframe_sequence && Array.isArray(jsonData.keyframe_sequence)) {
          // 使用keyframe_sequence格式的数据
          scenes = jsonData.keyframe_sequence.map(frame => `${frame.description} (时长：${frame.timestamp || '3-5秒'})`);
          console.log('JSON格式网格分镜数据 (keyframe_sequence):', jsonData.keyframe_sequence);
          isJsonFormat = true;
        } else {
          throw new Error('Invalid JSON format - no valid array found');
        }
      } catch (error) {
        // 如果不是JSON格式，使用智能文本处理方式
        console.log('网格JSON解析失败，使用智能文本处理方式:', error.message);
        
        // 提取真正有用的描述性文本
        const lines = response.split('\n')
          .map(s => s.trim())
          .filter(s => {
            // 过滤掉：空行、代码块标记、JSON结构标记、描述性标题
            return s.length > 0 && 
                   !s.includes('```') && 
                   !s.includes('{') && 
                   !s.includes('}') &&
                   !s.includes('镜头') && 
                   !s.includes('要求') && 
                   !s.includes('分镜') &&
                   !s.includes('关键帧') &&
                   !s.includes('描述') &&
                   !s.includes('JSON格式') &&
                   !s.includes('专业') &&
                   !s.includes('基于') &&
                   !s.includes('漫画分镜顺序');
          })
          .slice(0, 4);
        
        scenes = lines;
        console.log('智能处理后的网格分镜描述:', scenes);
      }

      console.log('处理后的网格分镜描述:', scenes);

      if (scenes.length < 4) {
        // 如果AI返回不足4个场景，使用与漫画风格相关的基本分镜
        const comicScenes = node.data.generatedImage ? [
          `${node.data.prompt} - 漫画开场镜头，建立场景`,
          `${node.data.prompt} - 漫画动作镜头，主体表演`,
          `${node.data.prompt} - 漫画反应镜头，细节特写`,
          `${node.data.prompt} - 漫画结局镜头，高潮收尾`
        ] : [
          `${node.data.prompt} - 漫画风格开场镜头`,
          `${node.data.prompt} - 漫画风格动作镜头`,
          `${node.data.prompt} - 漫画风格反应镜头`,
          `${node.data.prompt} - 漫画风格结局镜头`
        ];
        
        // 填充不足的场景
        for (let i = scenes.length; i < 4; i++) {
          scenes.push(comicScenes[i]);
        }
      }

      // 创建网格节点
      if (window.topFlow && window.topFlow.createGridNodes) {
        console.log('开始创建4宫格漫画分镜图，场景数量:', scenes.length);
        await window.topFlow.createGridNodes(node, scenes, node.data.generatedImage, jsonData);
      }
      
    } catch (error) {
      console.error('4宫格漫画分镜图生成失败:', error);
    } finally {
      // 网格生成状态由全局状态管理，不需要重置源节点的生成状态
      // 全局状态会在 createGridNodes 中正确重置
    }
  };

  const currentAspect = node.data.aspectRatio || 4/3;
  
  // 检查是否处于模式生成状态
  const isModeGenerating = window.topFlow && window.topFlow.isModeGenerating && window.topFlow.isModeGenerating();
  const isModeSource = window.topFlow && window.topFlow.getModeSourceNode && window.topFlow.getModeSourceNode() === node.id;
  const currentMode = window.topFlow && window.topFlow.getCurrentMode ? window.topFlow.getCurrentMode() : 'generate';
  const nodeMode = node.data.mode || 'generate';
  
  // 禁用点击的状态 - 移除源节点的模式生成状态检查，只保留节点自身的生成状态
  const isDisabled = node.data.isGenerating;

  // 统一处理函数
  const handleModeAction = (e) => {
    // 确保事件对象存在
    const event = e || { stopPropagation: () => {} };
    const mode = node.data.mode || "generate";
    
    // 立即设置生成状态，确保用户立即看到反馈
    updateNode(node.id, { data: { ...node.data, isGenerating: true } });
    
    switch (mode) {
      case "storyboard":
        handleStoryboard();
        break;
      case "grid":
        handleGrid();
        break;
      default:
        handleGenerate(event);
        break;
    }
  };

  // 获取按钮文本和图标
  const getButtonConfig = () => {
    const mode = node.data.mode || "generate";
    const isGenerating = node.data.isGenerating || (isModeSource && isModeGenerating);
    
    // 根据模式和生成状态返回不同的配置
    if (isGenerating) {
      switch (currentMode) {
        case "storyboard":
          return { text: "分镜中", icon: "storyboard", color: "purple" };
        case "grid":
          return { text: "网格中", icon: "grid", color: "green" };
        default:
          return { text: "生成中", icon: "generate", color: "blue" };
      }
    } else {
      switch (mode) {
        case "storyboard":
          return { text: "分镜", icon: "storyboard", color: "default" };
        case "grid":
          return { text: "网格", icon: "grid", color: "default" };
        default:
          return { text: "生成", icon: "generate", color: "default" };
      }
    }
  };

  // 获取图标组件
  const getButtonIcon = (iconType) => {
    switch (iconType) {
      case "storyboard":
        return <Video size={10} className="fill-white" />;
      case "grid":
        return <Layers size={10} className="fill-white" />;
      default:
        return <Wand2 size={10} className="fill-white" />;
    }
  };

  // 获取按钮颜色
  const getButtonColor = () => {
    const mode = node.data.mode || "generate";
    const isGenerating = node.data.isGenerating || (isModeSource && isModeGenerating);
    
    if (isGenerating) {
      switch (currentMode) {
        case "storyboard":
          return "purple";
        case "grid":
          return "green";
        default:
          return "black";
      }
    } else {
      switch (mode) {
        case "storyboard":
          return "purple";
        case "grid":
          return "green";
        default:
          return "black";
      }
    }
  };

  return (
    <>
      <div className={`relative w-full bg-[#dbeafe] border overflow-hidden transition-all duration-300 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'} shadow-sm group ${isExpanded ? 'rounded-t-2xl border-blue-200' : 'rounded-2xl border-[#60a5fa] hover:border-blue-600'}`} style={{ aspectRatio: currentAspect }}>
        {/* 分镜生成中的源节点状态显示 */}
        {isModeSource && isModeGenerating && currentMode === 'storyboard' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-purple-50/50 backdrop-blur-sm z-10">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-2" />
            <span className="text-xs text-purple-600 font-bold animate-pulse">生成分镜中...</span>
          </div>
        ) : node.data.isGenerating ? (
          <GenerationIndicator text="Generating..." />
        ) : null}
        
        {/* 正常图片显示 */}
        {node.data.generatedImage ? (
          <>
            <img src={node.data.generatedImage} alt="Gen" className="w-full h-full object-cover select-none" draggable={false} onDragStart={(e) => e.preventDefault()} />
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
              <MediaActionButtons 
                onZoom={() => handleZoom()}
                onDownload={() => handleDownload()}
                onClear={() => handleClearImage()}
                downloadTitle="下载图片"
                clearTitle="清除图片"
              />
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
        
        <PromptInput 
          value={node.data.prompt || ''} 
          onChange={e => updateNode(node.id, { data: { ...node.data, prompt: e.target.value } })} 
          placeholder="描述画面..." 
          onEnhance={handleEnhance}
          onMouseDown={e => e.stopPropagation()} 
          onWheel={e => e.stopPropagation()}
        />
        <div className="flex items-center gap-2 mt-1">
          <NodeSelect value={node.data.model || "nano-banana"} options={modelOptions} onChange={v => updateNode(node.id, { data: {...node.data, model: v} })} className="flex-1" />
          <NodeSelect value={node.data.mode || "generate"} options={modeOptions} onChange={v => updateNode(node.id, { data: {...node.data, mode: v} })} className="w-32" />
        </div>
        <BottomActionBar
          actionButton={
            <GenerateButton 
              onClick={isDisabled ? undefined : handleModeAction} 
              isDisabled={isDisabled}
              text={getButtonConfig().text}
              color={getButtonColor()}
              icon={getButtonIcon(getButtonConfig().icon)}
            />
          }
        >
          <AspectRatioSelector 
            value={node.data.ratio || "4:3"} 
            onChange={v => { 
              const [w, h] = v.split(':').map(Number); 
              updateNode(node.id, { 
                data: {...node.data, ratio: v, aspectRatio: w/h} 
              }); 
            }}
          />
          <BatchSizeSelector 
            value={node.data.batchSize || 1} 
            onChange={v => updateNode(node.id, { 
              data: {...node.data, batchSize: v} 
            })}
          />
          <button 
            onClick={() => !isDisabled && fileRef.current?.click()} 
            disabled={isDisabled}
            className={`p-1.5 ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'} rounded text-gray-400`}
          >
            <ImageIcon size={14}/>
          </button>
          <input type="file" ref={fileRef} className="hidden" onChange={handleImageUpload} />
        </BottomActionBar>
      </div>

      <ZoomModal isOpen={isZoomed} onClose={handleCloseZoom} title="图片预览">
        <img src={node.data.generatedImage} alt="放大图片" className="w-full h-auto max-h-[80vh] object-contain" />
      </ZoomModal>
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
  
  const [isZoomed, setIsZoomed] = useState(false);
  
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

  const handleZoom = () => {
    setIsZoomed(true);
  };

  const handleCloseZoom = () => {
    setIsZoomed(false);
  };

  const imageCount = imageInputs.length;
  let inputStatusText = imageCount === 0 ? '文生视频模式 (T2V)' : imageCount === 1 ? '参考图生视频模式 (I2V)' : `首尾帧生视频模式 (${imageCount} Refs)`;
  let inputStatusColor = imageCount === 0 ? 'text-gray-500' : imageCount === 1 ? 'text-orange-500' : 'text-purple-500';

  return (
    <>
      <div className={`relative w-full bg-[#dbeafe] border overflow-hidden transition-all duration-300 cursor-pointer shadow-sm group ${isExpanded ? 'rounded-t-2xl border-blue-200' : 'rounded-2xl border-[#60a5fa] hover:border-blue-600'}`} style={{ aspectRatio: node.data.aspectRatio || 16/9 }}>
        {node.data.isGenerating ? (
          <GenerationIndicator text="AI Processing..." />
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
              <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <MediaActionButtons 
                  onZoom={() => handleZoom()}
                  onDownload={() => handleDownload()}
                  onClear={() => handleClearVideo()}
                  showDownload={!!node.data.videoUrl}
                  downloadTitle="下载视频"
                  clearTitle="清除视频"
                />
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
        
        <PromptInput 
          value={node.data.prompt} 
          onChange={e => updateNode(node.id, { data: { ...node.data, prompt: e.target.value } })} 
          placeholder="视频描述..." 
          onEnhance={handleEnhance}
          onMouseDown={e => e.stopPropagation()} 
          onWheel={e => e.stopPropagation()}
        />
        
        <div className="flex items-center gap-2 mt-1">
          <NodeSelect value={node.data.model || "svd"} options={videoModelOptions} onChange={v => updateNode(node.id, {data:{...node.data, model: v}})} className="flex-1" />
        </div>
        
        <BottomActionBar
          actionButton={
            <GenerateButton 
              onClick={handleGenerate} 
              text="生成"
              icon={<Wand2 size={10} className="fill-white" />}
            />
          }
        >
          <AspectRatioSelector 
            value={node.data.ratio || "16:9"} 
            onChange={v => updateNode(node.id, { data: {...node.data, ratio: v} })}
            options={[
              {value:"16:9",label:"16:9"}, 
              {value:"9:16",label:"9:16"}, 
              {value:"1:1",label:"1:1"}
            ]}
          />
          <BatchSizeSelector 
            value={node.data.batchSize || 1} 
            onChange={v => updateNode(node.id, { data: {...node.data, batchSize: v} })}
            options={[
              {value:1,label:"1x"}, 
              {value:2,label:"2x"}
            ]}
          />
        </BottomActionBar>
      </div>

      <ZoomModal isOpen={isZoomed} onClose={handleCloseZoom} title="图片预览">
        <img src={node.data.generatedImage} alt="放大图片" className="w-full h-auto max-h-[80vh] object-contain" />
      </ZoomModal>
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

      <ZoomModal isOpen={isZoomed} onClose={handleCloseZoom} title="图片预览">
        <img src={node.data.generatedImage} alt="放大图片" className="w-full h-auto max-h-[80vh] object-contain" />
      </ZoomModal>
    </>
  );
};