import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Mountain, Play, Video, Music, FileText, ImageIcon, Wand2, Download, Trash2, Square, Layers, ChevronDown, Sparkles, Search, RefreshCw, LinkIcon, X, Pencil, Brush, Film, Scissors, MonitorPlay, XCircle, CheckCircle, Crop, Clock } from 'lucide-react';
import { Button, NodeSelect, InputBadge } from './UI.jsx';
import { DrawingCanvas } from './DrawingCanvas.jsx';
import { FrameCropper } from './FrameCropper.jsx';
import { downloadFile, NODE_WIDTHS } from '../constants.js';
import apiClient from '../api/client.js';



// 共用的媒体操作按钮组件
const MediaActionButtons = ({ 
  onDownload, 
  onClear, 
  showDownload = true, 
  isDisabled = false,
  downloadTitle = "下载",
  clearTitle = "清除"
}) => {
  return (
    <div className="flex gap-2">
      {showDownload && (
        <button 
          onClick={isDisabled ? undefined : onDownload} 
          disabled={isDisabled}
          className={`p-1.5 bg-zinc-900/80 rounded-full shadow-sm backdrop-blur-sm transition-colors ${
            isDisabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-zinc-800 text-zinc-300 cursor-pointer'
          }`} 
          title={isDisabled ? "正在生成，请稍候" : downloadTitle}
        >
          <Download size={14} />
        </button>
      )}
      <button 
        onClick={isDisabled ? undefined : onClear} 
        disabled={isDisabled}
        className={`p-1.5 bg-zinc-900/80 rounded-full shadow-sm backdrop-blur-sm transition-colors ${
          isDisabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-zinc-800 text-red-400 cursor-pointer'
        }`} 
        title={isDisabled ? "正在生成，请稍候" : clearTitle}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
};

// 共用的生成状态指示器组件
const GenerationIndicator = ({ text, color = "black" }) => {
  const colorClasses = {
    blue: "border-zinc-700 text-zinc-300",
    green: "border-zinc-600 text-zinc-300",
    purple: "border-zinc-500 text-zinc-300",
    black: "border-zinc-100 text-zinc-100",
  };
  
  const spinnerColor = colorClasses[color] || colorClasses.black;
  
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/50 backdrop-blur-sm z-50">
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
      className="w-full text-sm bg-transparent border border-zinc-800 rounded-md p-2 focus:ring-1 focus:ring-zinc-700 outline-none resize-none pr-8 text-zinc-300 placeholder-zinc-600" 
      placeholder={placeholder} 
      rows={rows} 
      value={value} 
      onChange={onChange} 
      onMouseDown={onMouseDown} 
      onWheel={onWheel} 
    />
    <button onClick={onEnhance} className="absolute right-2 top-2 text-zinc-500 hover:text-zinc-300 transition-colors">
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
  <div className={`flex justify-between items-center ${showBorder ? 'pt-2 border-t border-zinc-800 w-full' : ''}`}>
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

// 共用的时长选择器组件
const DurationSelector = ({ value, onChange, options }) => (
  <NodeSelect 
    value={value} 
    options={options} 
    icon={Clock} 
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
  icon = <Wand2 size={10} className="fill-zinc-900" />
}) => {
  const colorClasses = {
    black: "bg-zinc-100 text-zinc-900 hover:bg-white",
    blue: "bg-zinc-100 text-zinc-900 hover:bg-white",
    green: "bg-zinc-100 text-zinc-900 hover:bg-white",
    purple: "bg-zinc-100 text-zinc-900 hover:bg-white",
  };
  
  const buttonColor = colorClasses[color] || colorClasses.black;
  
  return (
    <button 
      onClick={isDisabled ? undefined : onClick} 
      disabled={isDisabled}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${
        isDisabled ? `cursor-not-allowed ${buttonColor} opacity-90` : 
        `${buttonColor} hover:shadow-lg active:scale-95`
      }`}
    >
      {isDisabled && <RefreshCw size={10} className="animate-spin" />}
      {!isDisabled && icon}
      {text}
    </button>
  );
};

import { indexedDBManager } from '../utils/indexedDB.js';

// 图片节点内容组件
export const ImageContent = ({ node, updateNode, isExpanded, handleGenerate, textInputLabel, generateText, linkedSources }) => {
  // 涂鸦相关状态
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [editingImageSrc, setEditingImageSrc] = useState(null);

  // 分辨率选项 - 根据模型类型提供不同的分辨率选项
  const resolutionOptions = {
    "nano-banana": [
      { value: "720p", label: "720P" }
    ],
    "nano-banana-pro": [
      { value: "1k", label: "1K" },
      { value: "2k", label: "2K" },
      { value: "4k", label: "4K" }
    ]
  };

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
          
          // 上传的图片也保存到历史记录
          indexedDBManager.saveToHistory({
              type: 'image',
              url: reader.result,
              prompt: 'Uploaded Image',
              model: 'upload',
              ratio: `${img.width}:${img.height}`,
              metadata: {
                  source: 'upload',
                  nodeId: node.id
              }
          }).catch(err => console.error('Failed to save uploaded image to history:', err));
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

  // 涂鸦相关处理函数
  const handleDrawingSave = (editedImage) => {
    // 保存到 doodleImage 而不是覆盖 generatedImage，防止底图污染
    updateNode(node.id, { data: { ...node.data, doodleImage: editedImage } });
    setIsDrawingMode(false);
  };

  const handleDrawingCancel = () => {
    setIsDrawingMode(false);
  };

  const startDrawingMode = (useOriginal = false) => {
    if (node.data.generatedImage) {
      // 如果指定使用原图，或者没有涂鸦图，就使用原图
      // 否则（不指定且有涂鸦图），使用涂鸦图
      const src = useOriginal ? node.data.generatedImage : (node.data.doodleImage || node.data.generatedImage);
      setEditingImageSrc(src);
      setIsDrawingMode(true);
    }
  };



  // 带重试机制的API调用函数
  const generateStoryboardWithRetry = async (storyboardPrompt, hasReferenceImage, maxRetries = 3) => {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // 如果有参考图片，使用多模态分析API；否则使用普通文本生成API
        let response;
        if (hasReferenceImage) {
          // 使用多模态分析API，将参考图片传递给AI进行分析
          response = await apiClient.generateTextWithImage(storyboardPrompt, node.data.generatedImage);
        } else {
          // 没有参考图片时使用普通文本生成API
          response = await generateText(storyboardPrompt);
        }
        
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
          
          const jsonData = JSON.parse(cleanResponse);
          
          // 支持多种JSON格式
          if (jsonData && jsonData.keyframes && Array.isArray(jsonData.keyframes)) {
            // 使用新的keyframes格式的数据
            scenes = jsonData.keyframes.map(frame => frame.image_prompt);
          } else if (jsonData && jsonData.keyframe_sequence && Array.isArray(jsonData.keyframe_sequence)) {
            // 使用keyframe_sequence格式的数据
            scenes = jsonData.keyframe_sequence.map(frame => frame.description);
          } else if (jsonData && jsonData.frames && Array.isArray(jsonData.frames)) {
            // 使用frames格式的数据
            scenes = jsonData.frames.map(frame => frame.imagePrompt || frame.description);
          } else {
            throw new Error('Invalid JSON format - no valid array found');
          }
        } catch (error) {
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
        }
        // 检查是否成功获取了有效的分镜描述
        if (scenes.length >= 2) { // 至少需要2个有效的分镜描述
          return { success: true, scenes, response };
        } else {
          throw new Error(`获取的分镜描述数量不足: ${scenes.length}/4`);
        }
      } catch (error) {
        lastError = error;
        console.error(`尝试 ${attempt}/${maxRetries} 失败:`, error);
        
        // 如果不是最后一次尝试，等待一段时间再重试
        if (attempt < maxRetries) {
          // 根据尝试次数增加等待时间
          const waitTime = 1000 * attempt; // 第1次等待1秒，第2次等待2秒
          console.log(`等待 ${waitTime}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    // 所有尝试都失败了
    console.error(`所有 ${maxRetries} 次尝试都失败了，使用默认分镜描述`);
    return { 
      success: false, 
      error: lastError,
      scenes: [] 
    };
  };

  // 带重试机制的单个分镜图片生成函数
  const generateStoryboardImageWithRetry = async (nodeId, prompt, hasReferenceImage, referenceImage, maxRetries = 3) => {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`分镜图片生成尝试 ${attempt}/${maxRetries}, 节点ID: ${nodeId}`);
        
        // 调用API生成分镜图片
        const result = await apiClient.generateImage(prompt, hasReferenceImage ? referenceImage : null);
        
        if (result) {
            // 保存分镜图片到历史记录
            indexedDBManager.saveToHistory({
                type: 'image',
                url: result,
                prompt: prompt,
                model: node.data.model || 'nano-banana',
                ratio: node.data.ratio || "16:9",
                metadata: {
                    source: 'storyboard',
                    nodeId: nodeId
                }
            }).catch(err => console.error('Failed to save storyboard image to history:', err));
        }

        return { success: true, image: result, nodeId };
      } catch (error) {
        lastError = error;
        console.error(`分镜图片生成尝试 ${attempt}/${maxRetries} 失败, 节点ID: ${nodeId}:`, error);
        
        // 如果不是最后一次尝试，等待一段时间再重试
        if (attempt < maxRetries) {
          // 根据尝试次数增加等待时间
          const waitTime = 1000 * attempt; // 第1次等待1秒，第2次等待2秒
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    return { 
      success: false, 
      error: lastError,
      nodeId,
      image: null
    };
  };

  // 分镜模式处理函数
  const handleStoryboard = async () => {
    if (!node.data.prompt) return;

    // 优先使用涂鸦图片，如果没有则使用生成的图片
    const activeImage = node.data.doodleImage || node.data.generatedImage;
    
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
      
      if (activeImage) {
        // 如果有参考图片，使用更专业的电影化分镜提示词
        storyboardPrompt = `你是一位专业的电影导演和视觉艺术家，擅长创作具有电影感的分镜序列。请仔细分析参考图片的视觉元素，并基于基础提示词创作4个连贯的电影化关键帧描述。

基础提示词：${node.data.prompt}

请按照以下专业标准生成分镜描述：

场景分解
- 主体：详细描述所有主要人物/物体的特征、服装、状态
- 环境：分析空间布局、地面材质、背景建筑、天气状况
- 环境与光线：光线方向、色调、氛围关键词、时间感

主题与故事
- 主题：提炼核心情感或概念（如孤寂、沉思、转变等）
- 故事梗概：用一句话概括情节发展
- 情绪弧线：建立→发展→转折→结局，描述情绪如何递进

电影化手法
- 镜头推进策略：从环境到细节的渐进式镜头语言
- 摄像机运动计划：具体运动类型（推近、横移、手持微颤等）及目的
- 镜头与曝光建议：焦段选择、景深控制、快门感、光线色彩处理

关键帧列表（4个核心镜头）
每个关键帧必须包含：
- 构图：画面布局、人物位置、空间关系
- 动作/节拍：具体动作描述及情感表达
- 摄像机：机位、高度、角度、运动方式
- 镜头/景深：焦段选择、焦点控制、景深效果
- 光线与调色：光源方向、光影效果、色调处理、氛围营造

请严格保持参考图片的视觉一致性：
- 所有主体特征、服装、环境元素必须完全一致
- 光照方向和色温必须保持逻辑一致
- 仅允许变化：镜头角度、人物姿态、表情变化、部分遮挡

请使用以下JSON格式输出，方便解析为4个分镜图的提示词：

{
  "title": "分镜主题标题",
  "theme": "核心主题",
  "story_synopsis": "故事梗概",
  "visual_consistency": {
    "main_subjects": "主体描述",
    "color_palette": ["主色调1", "主色调2", "主色调3"],
    "lighting_direction": "光线方向",
    "atmosphere_keywords": ["氛围关键词1", "氛围关键词2", "氛围关键词3"],
    "environment_style": "环境风格"
  },
  "keyframes": [
    {
      "index": 1,
      "duration": "3.0秒",
      "shot_type": "大远景/低角度",
      "composition": "详细的构图描述，包括人物位置、空间关系、引导线",
      "action_beat": "建立阶段的动作/节拍描述",
      "camera_settings": "摄像机机位、高度、角度、运动方式",
      "lens_depth": "焦段选择和景深效果描述",
      "lighting_color": "光源方向、光影效果、色调处理",
      "image_prompt": "用于AI图像生成的专业提示词，包含构图、光影、色彩、氛围等所有细节"
    },
    {
      "index": 2,
      "duration": "2.5秒",
      "shot_type": "特写",
      "composition": "详细的构图描述，包括面部位置、三分法构图",
      "action_beat": "发展阶段的动作/节拍描述，包含微表情变化",
      "camera_settings": "摄像机机位、高度、角度、运动方式",
      "lens_depth": "焦段选择和景深效果描述",
      "lighting_color": "光源方向、光影效果、色调处理",
      "image_prompt": "用于AI图像生成的专业提示词，包含构图、光影、色彩、氛围等所有细节"
    },
    {
      "index": 3,
      "duration": "2.0秒",
      "shot_type": "特写/低角度",
      "composition": "详细的构图描述，包括仰拍角度、线条处理",
      "action_beat": "转折阶段的动作/节拍描述，表现决定性时刻",
      "camera_settings": "摄像机机位、高度、角度、运动方式",
      "lens_depth": "焦段选择和景深效果描述",
      "lighting_color": "光源方向、光影效果、色调处理",
      "image_prompt": "用于AI图像生成的专业提示词，包含构图、光影、色彩、氛围等所有细节"
    },
    {
      "index": 4,
      "duration": "3.0秒",
      "shot_type": "中远景/平视",
      "composition": "详细的构图描述，包括人物位置、空间关系",
      "action_beat": "结局阶段的动作/节拍描述，展现后续发展",
      "camera_settings": "摄像机机位、高度、角度、运动方式",
      "lens_depth": "焦段选择和景深效果描述",
      "lighting_color": "光源方向、光影效果、色调处理",
      "image_prompt": "用于AI图像生成的专业提示词，包含构图、光影、色彩、氛围等所有细节"
    }
  ]
}

每个关键帧的image_prompt必须极为详细，包含主体、环境、光线、构图、氛围等所有视觉要素，确保AI能够生成高质量的电影感图像。`;
      } else {
        // 如果没有参考图片，使用通用的专业电影化分镜提示词
        storyboardPrompt = `你是一位专业的电影导演和视觉艺术家，擅长创作具有电影感的分镜序列。请基于基础提示词创作4个连贯的电影化关键帧描述。

基础提示词：${node.data.prompt}

请按照以下专业标准生成分镜描述：

场景分解
- 主体：详细描述所有主要人物/物体的特征、服装、状态
- 环境：分析空间布局、地面材质、背景建筑、天气状况
- 环境与光线：光线方向、色调、氛围关键词、时间感

主题与故事
- 主题：提炼核心情感或概念（如孤寂、沉思、转变等）
- 故事梗概：用一句话概括情节发展
- 情绪弧线：建立→发展→转折→结局，描述情绪如何递进

电影化手法
- 镜头推进策略：从环境到细节的渐进式镜头语言
- 摄像机运动计划：具体运动类型（推近、横移、手持微颤等）及目的
- 镜头与曝光建议：焦段选择、景深控制、快门感、光线色彩处理

关键帧列表（4个核心镜头）
每个关键帧必须包含：
- 构图：画面布局、人物位置、空间关系
- 动作/节拍：具体动作描述及情感表达
- 摄像机：机位、高度、角度、运动方式
- 镜头/景深：焦段选择、焦点控制、景深效果
- 光线与调色：光源方向、光影效果、色调处理、氛围营造

请确保场景的视觉一致性：
- 人物特征、服装、环境元素在4个关键帧中保持一致
- 光照方向和色温保持逻辑一致
- 镜头变化展现故事的连贯进展

请使用以下JSON格式输出，方便解析为4个分镜图的提示词：

{
  "title": "分镜主题标题",
  "theme": "核心主题",
  "story_synopsis": "故事梗概",
  "visual_consistency": {
    "main_subjects": "主体描述",
    "color_palette": ["主色调1", "主色调2", "主色调3"],
    "lighting_direction": "光线方向",
    "atmosphere_keywords": ["氛围关键词1", "氛围关键词2", "氛围关键词3"],
    "environment_style": "环境风格"
  },
  "keyframes": [
    {
      "index": 1,
      "duration": "3.0秒",
      "shot_type": "大远景/低角度",
      "composition": "详细的构图描述，包括人物位置、空间关系、引导线",
      "action_beat": "建立阶段的动作/节拍描述",
      "camera_settings": "摄像机机位、高度、角度、运动方式",
      "lens_depth": "焦段选择和景深效果描述，推荐24mm广角",
      "lighting_color": "光源方向、光影效果、色调处理",
      "image_prompt": "用于AI图像生成的专业提示词，包含构图、光影、色彩、氛围等所有细节"
    },
    {
      "index": 2,
      "duration": "2.5秒",
      "shot_type": "特写",
      "composition": "详细的构图描述，包括面部位置、三分法构图",
      "action_beat": "发展阶段的动作/节拍描述，包含微表情变化",
      "camera_settings": "摄像机机位、高度、角度、运动方式",
      "lens_depth": "焦段选择和景深效果描述，推荐85mm中长焦",
      "lighting_color": "光源方向、光影效果、色调处理",
      "image_prompt": "用于AI图像生成的专业提示词，包含构图、光影、色彩、氛围等所有细节"
    },
    {
      "index": 3,
      "duration": "2.0秒",
      "shot_type": "特写/低角度",
      "composition": "详细的构图描述，包括仰拍角度、线条处理",
      "action_beat": "转折阶段的动作/节拍描述，表现决定性时刻",
      "camera_settings": "摄像机机位、高度、角度、运动方式",
      "lens_depth": "焦段选择和景深效果描述，推荐50mm标准镜头",
      "lighting_color": "光源方向、光影效果、色调处理",
      "image_prompt": "用于AI图像生成的专业提示词，包含构图、光影、色彩、氛围等所有细节"
    },
    {
      "index": 4,
      "duration": "3.0秒",
      "shot_type": "中远景/平视",
      "composition": "详细的构图描述，包括人物位置、空间关系",
      "action_beat": "结局阶段的动作/节拍描述，展现后续发展",
      "camera_settings": "摄像机机位、高度、角度、运动方式",
      "lens_depth": "焦段选择和景深效果描述，推荐35mm广角",
      "lighting_color": "光源方向、光影效果、色调处理",
      "image_prompt": "用于AI图像生成的专业提示词，包含构图、光影、色彩、氛围等所有细节"
    }
  ]
}

每个关键帧的image_prompt必须极为详细，包含主体、环境、光线、构图、氛围等所有视觉要素，确保AI能够生成高质量的电影感图像。`;
      }
      
      // 使用重试机制生成分镜
      const result = await generateStoryboardWithRetry(storyboardPrompt, !!activeImage);
      
      // 处理结果
      let scenes = result.scenes || [];
      
      // 如果AI返回的分镜描述不足4个，使用更专业的默认分镜描述
      if (scenes.length < 4) {
        const defaultScenes = activeImage ? [
          `${node.data.prompt} - 大远景低角度镜头，人物位于画面下方，展示环境空间，24mm广角，深景深，冷色调，硬朗侧光，电影感构图`,
          `${node.data.prompt} - 面部特写镜头，三分法构图，眼神低垂，85mm中长焦，极浅景深，戏剧性光影，皮肤质感清晰`,
          `${node.data.prompt} - 低角度特写镜头，仰拍人物侧脸，下颌线条紧绷，50mm标准镜头，逆光轮廓光，展现决心时刻`,
          `${node.data.prompt} - 中远景平视镜头，人物背影走向深处，35mm广角，中等景深，光线呼应开场，余韵氛围`
        ] : [
          `${node.data.prompt} - 建立镜头：大远景展现环境与人物关系，低角度构图，冷青色调，硬朗侧光，24mm广角，深景深，孤寂氛围`,
          `${node.data.prompt} - 发展镜头：面部特写，眼神低垂后缓慢闭上，85mm中长焦，极浅景深，戏剧性光影，呼吸声可闻`,
          `${node.data.prompt} - 转折镜头：低角度仰拍，猛然睁眼，50mm标准镜头，逆光轮廓光，展现决心与力量`,
          `${node.data.prompt} - 结局镜头：中远景，人物背影走向远方，35mm广角，中等景深，光线呼应开场，脚步声渐行渐远`
        ];
        
        // 填充不足的场景
        for (let i = scenes.length; i < 4; i++) {
          scenes.push(defaultScenes[i]);
        }
      }

      // 创建分镜节点并生成图片
      if (window.topFlow && window.topFlow.createStoryboardNodes) {
        await window.topFlow.createStoryboardNodes(node, scenes, activeImage);
      }
      
    } catch (error) {
      console.error('分镜生成过程中发生错误:', error);
      
      // 如果生成失败，使用更专业的默认分镜描述创建节点
      const defaultScenes = activeImage ? [
        `${node.data.prompt} - 大远景低角度镜头，人物位于画面下方，展示环境空间，24mm广角，深景深，冷色调，硬朗侧光，电影感构图`,
        `${node.data.prompt} - 面部特写镜头，三分法构图，眼神低垂，85mm中长焦，极浅景深，戏剧性光影，皮肤质感清晰`,
        `${node.data.prompt} - 低角度特写镜头，仰拍人物侧脸，下颌线条紧绷，50mm标准镜头，逆光轮廓光，展现决心时刻`,
        `${node.data.prompt} - 中远景平视镜头，人物背影走向深处，35mm广角，中等景深，光线呼应开场，余韵氛围`
      ] : [
        `${node.data.prompt} - 建立镜头：大远景展现环境与人物关系，低角度构图，冷青色调，硬朗侧光，24mm广角，深景深，孤寂氛围`,
        `${node.data.prompt} - 发展镜头：面部特写，眼神低垂后缓慢闭上，85mm中长焦，极浅景深，戏剧性光影，呼吸声可闻`,
        `${node.data.prompt} - 转折镜头：低角度仰拍，猛然睁眼，50mm标准镜头，逆光轮廓光，展现决心与力量`,
        `${node.data.prompt} - 结局镜头：中远景，人物背影走向远方，35mm广角，中等景深，光线呼应开场，脚步声渐行渐远`
      ];

      if (window.topFlow && window.topFlow.createStoryboardNodes) {
        await window.topFlow.createStoryboardNodes(node, defaultScenes, activeImage);
      }
    } finally {
      // 分镜生成状态由全局状态管理，不需要重置源节点的生成状态
      // 全局状态会在 createStoryboardNodes 中正确重置
    }
  };

  // 网格模式处理函数
  const handleGrid = async () => {
    if (!node.data.prompt) return;

    // 优先使用涂鸦图片，如果没有则使用生成的图片
    const activeImage = node.data.doodleImage || node.data.generatedImage;
    
    // 立即设置源节点的生成状态，提供即时反馈
    updateNode(node.id, { data: { ...node.data, isGenerating: true } });
    
    try {
      // 根据是否有参考图片来构建不同的提示词
      let gridPrompt;
      
      if (activeImage) {
        // 如果有参考图片，要求AI生成JSON格式的关键帧序列，强调视觉一致性
        gridPrompt = `请仔细分析参考图片的视觉风格、构图、色调、人物特征等元素，生成的分镜关键帧需要保持与参考图片的视觉一致性。

参考图片描述：${node.data.prompt}

请生成一个JSON格式的关键帧序列，必须包含4个完整分镜，每个帧包含：
1. index - 帧序号（1-4）
2. shotType - 镜头类型
3. timePoint - 时间点
4. visualDescription - 视觉描述
5. composition - 构图信息
6. continuity - 连续性说明
7. imagePrompt - 图像提示词（需要包含保持与参考图片一致的视觉元素）

重要提示：图像提示词需要包含明确的视觉一致性要求，如"保持与参考图片相同的艺术风格"、"延续参考图片的色调"、"保持人物特征一致"等。

必须包含4个分镜，不能少！请严格按照以下JSON格式返回，只返回JSON数据，不包含其他文字：

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
        gridPrompt = `基于以下场景描述，生成4个连续的漫画分镜头画面描述，用于创建一张标准的4宫格漫画分镜图：

${node.data.prompt}

严格要求：
1. 必须生成4个分镜，不能多不能少
2. 采用漫画分镜的典型构图方式
3. 每个描述控制在30字以内，适合AI图像生成
4. 保持画面连贯性和故事性
5. 每个分镜需要标注时长（秒数），格式："描述内容 (时长：X秒)"
6. 直接返回4个描述，每行一个
7. 确保描述适合生成一张包含4个分镜格的完整图片
8. 如果有角色对话内容，请使用中文显示

漫画分镜顺序（必须是4个）：
- 分镜1：开场镜头，建立场景和氛围 (时长：3-5秒)
- 分镜2：主体动作或中文对话镜头 (时长：4-6秒)
- 分镜3：反应镜头或细节特写 (时长：2-4秒)
- 分镜4：结局或高潮镜头 (时长：3-5秒)

重要强调：
- 必须提供4个分镜，不是3个或5个
- 确保描述适合漫画风格的图像生成，所有对话内容使用中文，每个分镜都包含时长信息
- 每个分镜将对应4宫格中的一个格子，布局为2×2网格`;
      }

      const response = await generateText(gridPrompt);
      
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
        
        // 额外的错误处理：确保cleanResponse是有效的JSON字符串
        if (!cleanResponse || !cleanResponse.trim()) {
          throw new Error('Empty response after cleaning');
        }
        
        // 修复可能不完整的JSON格式
        cleanResponse = cleanResponse
          .replace(/,\s*}/g, '}') // 移除对象末尾的逗号
          .replace(/,\s*]/g, ']') // 移除数组末尾的逗号
          .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":'); // 确保所有键都有引号
        
        jsonData = JSON.parse(cleanResponse);
        
        // 支持多种JSON格式
        if (jsonData && jsonData.frames && Array.isArray(jsonData.frames)) {
          // 使用frames格式的数据
          const validFrames = jsonData.frames.filter(frame => frame && (
            frame.imagePrompt || frame.description || frame.visualDescription
          ));
          
          if (validFrames.length >= 4) {
            scenes = validFrames.map(frame => {
              const prompt = frame.imagePrompt || frame.description || frame.visualDescription;
              const timeInfo = frame.timePoint || frame.duration || '3-5秒';
              const cleanTimeInfo = timeInfo.toString().includes('秒') ? timeInfo : `${timeInfo}秒`;
              return `${prompt} (时长：${cleanTimeInfo})`;
            });
            isJsonFormat = true;
          } else {
            console.warn('frames数组中的有效分镜不足4个:', validFrames.length);
            throw new Error(`Invalid frames count: ${validFrames.length}/4`);
          }
        } else if (jsonData && jsonData.keyframe_sequence && Array.isArray(jsonData.keyframe_sequence)) {
          // 使用keyframe_sequence格式的数据
          const validKeyframes = jsonData.keyframe_sequence.filter(kf => kf && (
            kf.description || kf.image_prompt || kf.prompt
          ));
          
          if (validKeyframes.length >= 4) {
            scenes = validKeyframes.map(keyframe => {
              const prompt = keyframe.description || keyframe.image_prompt || keyframe.prompt;
              const timeInfo = keyframe.timestamp || keyframe.duration || '3-5秒';
              const cleanTimeInfo = timeInfo.toString().includes('秒') ? timeInfo : `${timeInfo}秒`;
              return `${prompt} (时长：${cleanTimeInfo})`;
            });
            isJsonFormat = true;
          } else {
            throw new Error(`Invalid keyframe count: ${validKeyframes.length}/4`);
          }
        } else if (jsonData && jsonData.keyframes && Array.isArray(jsonData.keyframes)) {
          // 使用keyframes格式的数据
          const validKeyframes = jsonData.keyframes.filter(kf => kf && (
            kf.imagePrompt || kf.description || kf.prompt
          ));
          
          if (validKeyframes.length >= 4) {
            scenes = validKeyframes.map(keyframe => {
              const prompt = keyframe.imagePrompt || keyframe.description || keyframe.prompt;
              const timeInfo = keyframe.duration || keyframe.timePoint || '3-5秒';
              const cleanTimeInfo = timeInfo.toString().includes('秒') ? timeInfo : `${timeInfo}秒`;
              return `${prompt} (时长：${cleanTimeInfo})`;
            });
            isJsonFormat = true;
          } else {
            throw new Error(`Invalid keyframe count: ${validKeyframes.length}/4`);
          }
        } else {
          throw new Error('Invalid JSON format - no valid array found');
        }
      } catch (error) {

        // 提取真正有用的描述性文本 - 改进的提取方式，确保能正确提取4个分镜
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
          });
        
        // 特殊处理：如果过滤后少于4行，尝试从JSON字符串中提取imagePrompt
        if (lines.length < 4) {
          // 尝试多种方式提取imagePrompt字段
          const extractPrompts = (pattern) => {
            const matches = response.match(new RegExp(pattern, 'g'));
            if (matches && matches.length >= 4) {
              return matches.map(match => match.replace(/^"imagePrompt":\s*"?|"?$/g, '').trim());
            }
            return null;
          };
          
          // 尝试不同的匹配模式
          const prompts = extractPrompts('"imagePrompt":\\s*"([^"]*)"') ||
                         extractPrompts('"imagePrompt":\\s*\'([^\']*)\'') ||
                         extractPrompts('"imagePrompt":\\s*([^,}]+)');
          
          if (prompts && prompts.length >= 4) {
            scenes = prompts.map(prompt => `${prompt} (时长：3-5秒)`);
          } else {           
            // 智能分割响应文本，确保有4个分镜
            const paragraphs = response.split('\n\n').filter(p => p.trim().length > 0);
            
            if (paragraphs.length >= 4) {
              scenes = paragraphs.slice(0, 4).map(p => `${p.trim()} (时长：3-5秒)`);
            } else {
              // 按句子分割
              const sentences = response.split(/[。！？.!?]/).filter(s => s.trim().length > 10);
              if (sentences.length >= 4) {
                scenes = sentences.slice(0, 4).map(s => `${s.trim()} (时长：3-5秒)`);
              } else {
                // 最后的备用方案：按字符长度均匀分割
                const chunkSize = Math.max(Math.floor(response.length / 4), 20);
                for (let i = 0; i < 4; i++) {
                  const start = i * chunkSize;
                  const end = i === 3 ? response.length : Math.min((i + 1) * chunkSize, response.length);
                  const chunk = response.substring(start, end).trim();
                  if (chunk.length > 0) {
                    scenes.push(`${chunk} (时长：3-5秒)`);
                  }
                }
              }
            }
          }
        } else {
          // 过滤后的行足够，添加时长信息
          scenes = lines.slice(0, 4).map(line => {
            // 如果已经有时长信息，保持不变
            if (line.includes('时长：')) {
              return line;
            }
            // 否则添加默认时长
            return `${line} (时长：3-5秒)`;
          });
        }
      }
      if (scenes.length < 4) {
        // 如果AI返回不足4个场景，使用与漫画风格相关的基本分镜
        const comicScenes = activeImage ? [
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
        await window.topFlow.createGridNodes(node, scenes, activeImage, jsonData);
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
      <div className={`relative w-full bg-zinc-950 border-x border-t border-zinc-800 overflow-hidden transition-all duration-300 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'} group ${isExpanded ? 'rounded-t-lg' : 'rounded-lg border-b'}`} style={{ aspectRatio: currentAspect }}>
        {/* 分镜生成中的源节点状态显示 */}
        {isModeSource && isModeGenerating && currentMode === 'storyboard' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/50 backdrop-blur-sm z-10">
            <div className="w-8 h-8 border-4 border-zinc-100 border-t-transparent rounded-full animate-spin mb-2" />
            <span className="text-xs text-zinc-100 font-bold animate-pulse">生成分镜中...</span>
          </div>
        ) : node.data.isGenerating ? (
          <GenerationIndicator text="Generating..." />
        ) : null}
        
        {/* 正常图片显示 */}
        {node.data.generatedImage ? (
          <>
            <img src={node.data.generatedImage} alt="Gen" className="w-full h-full object-cover select-none" draggable={false} onDragStart={(e) => e.preventDefault()} />
            
            {/* 涂鸦预览 - 悬浮在右上角 (仿照视频节点) */}
            {node.data.doodleImage && (
              <div className="absolute top-4 right-4 w-1/3 max-w-[120px] aspect-square border-2 border-zinc-500 rounded-lg overflow-hidden shadow-2xl z-20 bg-black animate-in fade-in zoom-in duration-300 group/preview">
                <img src={node.data.doodleImage} alt="Doodle" className="w-full h-full object-cover block" />
                
                {/* 关闭按钮 */}
                <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault(); // 阻止默认行为
                      updateNode(node.id, { data: { ...node.data, doodleImage: null } });
                    }}
                    className="absolute top-1 right-1 bg-black/50 text-white p-0.5 rounded-full hover:bg-red-500 transition-colors opacity-0 group-hover/preview:opacity-100 z-30" // 增加 z-index
                    title="清除涂鸦"
                  >
                    <X size={12} />
                </button>

                {/* 编辑按钮 - 覆盖在预览图上 */}
                <div className="absolute inset-0 bg-black/20 hover:bg-black/0 transition-colors flex items-center justify-center opacity-0 hover:opacity-100 gap-2 cursor-pointer"
                     onClick={(e) => {
                       e.stopPropagation();
                       startDrawingMode(false); // 编辑当前的涂鸦
                     }}
                >
                  <div className="bg-white text-black p-1 rounded-full hover:bg-gray-200" title="继续编辑">
                    <Brush size={14} />
                  </div>
                </div>
              </div>
            )}

            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
              <div className="flex gap-2">
                {/* 涂鸦按钮 */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    startDrawingMode(true); // 始终编辑原图，创建新的涂鸦
                  }}
                  className="p-1.5 bg-zinc-900/80 rounded-full shadow-sm backdrop-blur-sm transition-colors hover:bg-zinc-800 text-zinc-300 cursor-pointer"
                  title="编辑原图"
                >
                  <Brush size={14} />
                </button>
                <MediaActionButtons 
                  onDownload={() => handleDownload()}
                  onClear={() => handleClearImage()}
                  downloadTitle="下载图片"
                  clearTitle="清除图片"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <ImageIcon size={48} className="text-zinc-700" />
            <div 
              className="text-xs text-zinc-400 font-medium bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800 cursor-pointer hover:bg-zinc-800 transition-colors shadow-sm"
              onClick={() => !isDisabled && fileRef.current?.click()}
            >
              点击上传图片
            </div>
          </div>
        )}
      </div>
      <div className={`bg-zinc-950 shadow-md border-x border-b border-zinc-800 p-3 flex flex-col gap-3 relative z-10 ${isExpanded ? 'rounded-b-lg opacity-100 max-h-[350px] py-3' : 'opacity-0 max-h-0 py-0 border-none rounded-b-lg'}`} style={{ overflow: 'hidden' }}>
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
          <NodeSelect 
            value={node.data.resolution || "720p"} 
            options={resolutionOptions[node.data.model || "nano-banana"] || resolutionOptions["nano-banana"]} 
            onChange={v => updateNode(node.id, { data: {...node.data, resolution: v} })} 
            className="w-16" 
          />
          <input type="file" ref={fileRef} className="hidden" onChange={handleImageUpload} />
        </BottomActionBar>
      </div>

      {isDrawingMode && createPortal(
        <DrawingCanvas
          isVisible={isDrawingMode}
          onCancel={handleDrawingCancel}
          onSave={handleDrawingSave}
          imageSrc={editingImageSrc}
        />,
        document.body
      )}

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
    <div ref={textContentRef} className="bg-zinc-950 rounded-lg shadow-md border border-zinc-800 overflow-hidden flex flex-col cursor-text relative" onClick={e => e.stopPropagation()} onWheel={e => e.stopPropagation()} style={{ height: `${currentHeight}px`, minHeight: `${minHeight}px` }}>
      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-950 border-b border-zinc-800">
        <div className="text-xs text-zinc-400 font-medium">模型:</div>
        <NodeSelect 
          value={node.data.model || "gemini-2.5"} 
          options={textModelOptions} 
          onChange={v => updateNode(node.id, { data: { ...node.data, model: v } })} 
          className="flex-1" 
        />
      </div>
      
      {/* 角色设置区域 */}
      <div className="px-3 py-2 border-b border-zinc-800 bg-zinc-950">
        <div className="text-xs text-zinc-400 font-medium mb-2">角色设定:</div>
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
      
      <div className="flex-1 p-3 relative group">
        <textarea 
          className="w-full h-full text-sm bg-transparent border-none outline-none resize-none p-0 focus:ring-0 leading-relaxed placeholder-zinc-600 text-zinc-300" 
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
          <div className="absolute bottom-2 left-4 text-xs text-zinc-500 animate-pulse">
            正在生成内容...
          </div>
        )}
        <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={handleAnalysisClick} className="bg-zinc-800 text-zinc-300 px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 hover:bg-zinc-700 disabled:opacity-50" disabled={isAiWorking}>
            {isAnalyzing ? 
              <span className="flex items-center gap-1"><RefreshCw size={10} className="animate-spin"/> 分析中...</span> : 
              <span className="flex items-center gap-1"><Search size={10}/> 生成大纲</span>
            }
          </button>
          <button onClick={handleAIWrite} className="bg-zinc-800 text-zinc-300 px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 hover:bg-zinc-700 disabled:opacity-50" disabled={isAiWorking}>
            {isWriting ? 
              <span className="flex items-center gap-1"><RefreshCw size={10} className="animate-spin"/> 生成中...</span> : 
              <span className="flex items-center gap-1"><Sparkles size={10}/> AI 生成</span>
            }
          </button>
        </div>
      </div>
      <div className="bg-zinc-900 px-3 py-2 border-t border-zinc-800 flex justify-between items-center text-xs text-zinc-500 rounded-b-2xl">
        <span>{(node.data.text?.length || 0) + (node.data.streamingText?.length || 0)} 字符</span>
        <div className="absolute right-0 bottom-0 w-4 h-4 cursor-ns-resize z-10 text-zinc-500 hover:text-zinc-300 flex items-center justify-center transition-colors"
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

// 视频节点内容组件 - 重新实现，确保上传按钮可见
export const VideoContent = ({ node, updateNode, isExpanded, handleGenerate, textInputLabel, imageInputs, videoInputs, generateText, linkedSources }) => {
  const videoModelOptions = [
    {value:"sora2",label:"Sora 2.0"}, 
    {value:"veo_3_1-fast",label:"veo_3_1-fast"}
  ];
  
  // 视频模型限制配置
  const getModelConstraints = (model) => {
    switch(model) {
      case "sora2": return { maxImages: 1, label: "参考图模式" };
      case "veo_3_1-fast": return { maxImages: 2, label: "首尾帧模式" };
      default: return { maxImages: 0, label: "不支持参考图" };
    }
  };

  // 视频时长选项
  const durationOptions = React.useMemo(() => {
    const model = node.data.model || "sora2";
    if (model === "veo_3_1-fast") {
      return [{ value: 8, label: "8s" }];
    }
    // Sora2 and others
     return [
       { value: 10, label: "10s" },
       { value: 15, label: "15s" }
     ];
   }, [node.data.model]);

  // 确保时长值有效
  useEffect(() => {
    const validValues = durationOptions.map(o => o.value);
    if (!node.data.duration || !validValues.includes(node.data.duration)) {
       updateNode(node.id, { data: { ...node.data, duration: durationOptions[0].value } });
    }
  }, [node.data.model, durationOptions, node.data.duration, node.id, updateNode]);

  const fileRef = useRef(null);
  const videoRef = useRef(null);
  const [showSceneDirector, setShowSceneDirector] = useState(false);
  const [capturedFrame, setCapturedFrame] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [previewPos, setPreviewPos] = useState({ x: 0, y: 0 });
  const [showPreview, setShowPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // 获取所有参考图片
  const referenceImages = React.useMemo(() => {
    const images = [];
    
    // 1. 检查是否有视频输入节点带有 capturedFrame 或 lastFrame
    const videoInputNodes = videoInputs || linkedSources?.videoInputs || [];
    videoInputNodes.forEach(n => {
      // 优先使用截取的帧，如果没有则使用尾帧
      // 只有当 capturedFrame 明确存在时才使用它
      // 如果 capturedFrame 被删除了（为 null），则自动回退到 lastFrame
      let frameToUse = null;
      let isAuto = false;

      if (n.data.capturedFrame) {
        frameToUse = n.data.capturedFrame;
      } else if (n.data.lastFrame) {
        frameToUse = n.data.lastFrame;
        isAuto = true;
      }
      
      if (frameToUse && typeof frameToUse === 'string' && frameToUse.startsWith('data:')) {
        images.push({
          id: n.id,
          src: frameToUse,
          type: 'video-frame',
          isAutoLastFrame: isAuto // 标记是否为自动提取的尾帧
        });
      }
    });
    
    // 2. 检查是否有图片输入节点
    if (imageInputs && imageInputs.length > 0) {
      imageInputs.forEach(n => {
        // 优先使用涂鸦图片，如果没有则使用生成的基础图片
        const imageToUse = n.data.doodleImage || n.data.generatedImage;
        if (imageToUse) {
           images.push({
            id: n.id,
            src: imageToUse,
            type: 'image',
            isDoodle: !!n.data.doodleImage
          });
        }
      });
    }
    
    return images;
  }, [linkedSources, imageInputs]);

  // 如果没有本地 capturedFrame，但 node.data 中有（可能是从 persistence 恢复的），则恢复它
  useEffect(() => {
    if (!capturedFrame && node.data.capturedFrame) {
      setCapturedFrame(node.data.capturedFrame);
    }
  }, [node.data.capturedFrame]);

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('video/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateNode(node.id, { data: { ...node.data, videoUrl: reader.result, uploadedVideo: true } });
        // 重置 input value，允许重复上传同一个文件
        if (fileRef.current) {
          fileRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    }
  };

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
    updateNode(node.id, { 
      data: { 
        ...node.data, 
        videoUrl: null, 
        generatedVideo: false, 
        uploadedVideo: false,
        capturedFrame: null,
        lastFrame: null,
        aspectRatio: 16/9 // 重置为默认比例
      } 
    });
    setCapturedFrame(null);
    setShowSceneDirector(false);
    setShowCropper(false);
  };

  // Scene Director Handlers
  const toggleSceneDirector = () => {
    if (showSceneDirector) {
      setShowSceneDirector(false);
      setCapturedFrame(null);
      setShowCropper(false);
    } else {
      setShowSceneDirector(true);
      if (videoRef.current) {
        videoRef.current.pause();
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const { videoWidth, videoHeight, duration } = videoRef.current;
      setDuration(duration);
      
      // Calculate aspect ratio variables
      let aspectRatio = 16/9;
      let ratioLabel = "16:9";

      if (videoWidth && videoHeight) {
        aspectRatio = videoWidth / videoHeight;
        
        // 根据视频比例自动选择最接近的预设选项
        if (Math.abs(aspectRatio - 16/9) < 0.1) ratioLabel = "16:9";
        else if (Math.abs(aspectRatio - 9/16) < 0.1) ratioLabel = "9:16";
        else if (Math.abs(aspectRatio - 1) < 0.1) ratioLabel = "1:1";
        else if (Math.abs(aspectRatio - 4/3) < 0.1) ratioLabel = "4:3";
        else if (Math.abs(aspectRatio - 3/4) < 0.1) ratioLabel = "3:4";
        
        // 强制更新节点数据，即使比例看起来没变，也要确保UI刷新
        // 使用一个随机的时间戳或者强制覆盖来触发React的更新机制
        updateNode(node.id, { 
          data: { 
            ...node.data, 
            aspectRatio: aspectRatio,
            ratio: ratioLabel, // 同步更新下拉菜单的值
            _forceUpdate: Date.now() // 添加一个强制更新字段
          } 
        });
      }

      // Extract last frame for reference if not already present
      if (!node.data.lastFrame && duration > 0) {
        // Create a temporary video element to extract the last frame
        const tempVideo = document.createElement('video');
        tempVideo.src = node.data.videoUrl;
        tempVideo.crossOrigin = 'anonymous';
        tempVideo.muted = true;
        tempVideo.currentTime = duration; // Seek to end
        
        tempVideo.onseeked = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = videoWidth || 640;
            canvas.height = videoHeight || 360;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
            const lastFrameData = canvas.toDataURL('image/png');
            
            // Important: Include the calculated aspect ratio and ratio label
            // to prevent them from being overwritten by stale node.data
            updateNode(node.id, { 
              data: { 
                ...node.data, 
                aspectRatio: aspectRatio,
                ratio: ratioLabel,
                lastFrame: lastFrameData,
                _forceUpdate: Date.now()
              } 
            });
          } catch (err) {
            console.error('Error extracting last frame:', err);
          } finally {
            // Cleanup
            tempVideo.removeAttribute('src');
            tempVideo.load();
          }
        };
        
        // Trigger loading if needed
        if (tempVideo.readyState < 2) {
            tempVideo.load();
        }
      }
    }
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const captureCurrentFrame = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      setCapturedFrame(dataUrl);
      setShowCropper(true); // Open Cropper immediately
      videoRef.current.pause();
    }
  };

  const handleCropConfirm = (croppedImage) => {
    // 设置最终图片
    setCapturedFrame(croppedImage);
    
    // 保存到节点数据中，以便后续连接使用
    updateNode(node.id, { 
      data: { 
        ...node.data, 
        capturedFrame: croppedImage 
      } 
    });
    
    // 关闭裁剪和时间轴模块，但保留截图显示
    setShowCropper(false);
    setShowSceneDirector(false);
    
    // 提示
    // alert("局部分镜已截取，请在右上角确认使用。");
  };

  const handleUseCapturedFrame = () => {
    // 确认使用当前截取的帧（可能是已经裁剪过的）
    alert("局部分镜功能：已确认使用此分镜。");
    
    // 关闭预览和截取状态
    setCapturedFrame(null);
    // 可选：如果希望使用后直接退出局部分镜模式，可以取消注释下面这行
    // setShowSceneDirector(false);
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const isDisabled = node.data.isGenerating;
  const currentModel = node.data.model || "sora2";
  const { maxImages } = getModelConstraints(currentModel);
  const activeReferenceImages = referenceImages.slice(0, maxImages);
  
  let inputStatusText;
  let inputStatusColor;
  
  if (node.data.uploadedVideo) {
    inputStatusText = '已上传视频';
    inputStatusColor = 'text-zinc-600';
  } else {
    if (activeReferenceImages.length === 0) {
      inputStatusText = '文生视频模式 (T2V)';
      inputStatusColor = 'text-gray-500';
    } else {
      if (currentModel === 'sora2') {
        inputStatusText = '参考图生视频模式 (I2V)';
      } else if (currentModel === 'veo_3_1-fast') {
        inputStatusText = activeReferenceImages.length === 1 ? '首帧生视频模式' : '首尾帧生视频模式';
      } else {
        inputStatusText = '未知模式';
      }
      
      // 添加忽略警告
      if (referenceImages.length > maxImages) {
        inputStatusText += ` (忽略后${referenceImages.length - maxImages}张)`;
      }
      
      inputStatusColor = activeReferenceImages.length === 1 ? 'text-zinc-500' : 'text-zinc-900';
    }
  }

  return (
    <>
      {/* 视频显示区域 - 简化布局 */}
      <div className={`relative w-full bg-zinc-950 border-x border-t border-zinc-800 overflow-hidden transition-all duration-300 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'} group ${isExpanded ? 'rounded-t-lg' : 'rounded-lg border-b'}`} style={{ aspectRatio: node.data.aspectRatio || 16/9 }}>
        {node.data.isGenerating ? (
          <GenerationIndicator text="AI Processing..." />
        ) : (
          <>
            {/* 有视频时显示视频和操作按钮 */}
            {node.data.videoUrl ? (
              <>
                <video 
                  key={node.data.videoUrl} // Force re-render when URL changes to ensure crossOrigin is applied correctly
                  ref={videoRef}
                  src={node.data.videoUrl} 
                  controls={!showSceneDirector} // 启用Scene Director时隐藏原生控件
                  className="w-full h-full object-cover" 
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  crossOrigin="anonymous"
                />
                
                {/* 截取的帧预览 - 悬浮在右上角 */}
                {capturedFrame && !showCropper && (
                  <div className="absolute top-4 right-4 w-32 h-auto border-2 border-zinc-500 rounded-lg overflow-hidden shadow-2xl z-50 bg-black animate-in fade-in zoom-in duration-300 group/preview">
                    <img src={capturedFrame} alt="Captured" className="w-full h-auto block" />
                    
                    {/* 关闭按钮 - 常驻右上角 */}
                    <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault(); // 阻止默认行为
                          setCapturedFrame(null);
                          // 同时更新节点数据，清除保存的capturedFrame
                          updateNode(node.id, { 
                            data: { 
                              ...node.data, 
                              capturedFrame: null 
                            } 
                          });
                        }}
                        className="absolute top-1 right-1 bg-black/50 text-white p-0.5 rounded-full hover:bg-red-500 transition-colors opacity-0 group-hover/preview:opacity-100 z-30" // 增加 z-index
                        title="关闭"
                      >
                        <X size={12} />
                    </button>

                    <div className="absolute inset-0 bg-black/20 hover:bg-black/0 transition-colors flex items-center justify-center opacity-0 hover:opacity-100 gap-2">
                      <button 
                        onClick={() => setShowCropper(true)}
                        className="bg-white text-black p-1 rounded-full hover:bg-gray-200"
                        title="重新裁剪"
                      >
                        <Crop size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Scene Director Timeline - 底部滑出 */}
                {showSceneDirector && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md p-3 z-40 animate-in slide-in-from-bottom duration-300 border-t border-white/10">
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-white/80 text-[10px] font-mono mb-1">
                        <span>Scene Director Timeline</span>
                        <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause()}
                          className="text-white hover:text-zinc-300 transition-colors"
                        >
                          {videoRef.current && !videoRef.current.paused ? <div className="w-3 h-3 bg-white rounded-sm" /> : <Play size={14} fill="currentColor" />}
                        </button>
                        
                        <input
                          type="range"
                          min="0"
                          max={duration || 100}
                          value={currentTime}
                          onChange={handleSeek}
                          className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-125"
                        />
                        
                        <button 
                          onClick={captureCurrentFrame}
                          className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-white px-2 py-1 rounded text-xs transition-colors"
                        >
                          <Scissors size={12} />
                          <span>截取</span>
                        </button>
                        
                        <button 
                          onClick={toggleSceneDirector}
                          className="text-white/50 hover:text-white transition-colors ml-2"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 常规操作按钮 - 当Scene Director激活时隐藏 */}
                {!showSceneDirector && (
                  <div className="absolute bottom-2 right-2 z-50 flex gap-2">
                    {/* Scene Director 按钮 */}
                    <button 
                      onClick={toggleSceneDirector}
                      disabled={node.data.isGenerating}
                      className={`p-1.5 bg-zinc-900/90 rounded-full shadow-lg backdrop-blur-sm transition-all ${
                        node.data.isGenerating ? 'cursor-not-allowed opacity-50' : 'hover:bg-zinc-800 hover:shadow-xl text-zinc-100 cursor-pointer'
                      }`} 
                      title="局部分镜 (Scene Director)"
                    >
                      <Film size={14} />
                    </button>

                    <button 
                      onClick={() => !node.data.isGenerating && handleDownload()} 
                      disabled={node.data.isGenerating}
                      className={`p-1.5 bg-zinc-900/90 rounded-full shadow-lg backdrop-blur-sm transition-all ${
                        node.data.isGenerating ? 'cursor-not-allowed opacity-50' : 'hover:bg-zinc-800 hover:shadow-xl text-zinc-300 cursor-pointer'
                      }`} 
                      title={node.data.isGenerating ? "正在生成，请稍候" : "下载视频"}
                    >
                      <Download size={14} />
                    </button>
                    
                    <button 
                      onClick={() => !node.data.isGenerating && handleClearVideo()} 
                      disabled={node.data.isGenerating}
                      className={`p-1.5 bg-zinc-900/90 rounded-full shadow-lg backdrop-blur-sm transition-all ${
                        node.data.isGenerating ? 'cursor-not-allowed opacity-50' : 'hover:bg-zinc-800 hover:shadow-xl text-red-400 cursor-pointer'
                      }`} 
                      title={node.data.isGenerating ? "正在生成，请稍候" : "清除视频"}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* 无视频时显示上传界面 - 使用与图片节点相同的样式 */
              <div 
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-20"
              >
                <Video size={64} className="text-zinc-700" />
                <div 
                  className="text-xs text-zinc-400 font-medium bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800 cursor-pointer hover:bg-zinc-800 transition-colors shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isDisabled) {
                      fileRef.current?.click();
                    }
                  }}
                >
                  点击上传视频
                </div>
              </div>
            )}
            {/* 文件输入元素 */}
            <input type="file" ref={fileRef} className="hidden" accept="video/*,video/mp4,video/quicktime,video/x-msvideo,video/x-matroska" onChange={handleVideoUpload} />
          </>
        )}
      </div>

      {/* Frame Cropper Portal */}
      {showCropper && capturedFrame && createPortal(
        <FrameCropper
          imageSrc={capturedFrame}
          onConfirm={handleCropConfirm}
          onCancel={() => setShowCropper(false)}
        />,
        document.body
      )}

      {/* 底部控制区域 */}
      <div className={`bg-zinc-950 shadow-md border-x border-b border-zinc-800 p-3 flex flex-col gap-3 relative z-10 ${isExpanded ? 'rounded-b-lg opacity-100 max-h-[350px] py-3' : 'opacity-0 max-h-0 py-0 border-none rounded-b-lg'}`} style={{ overflow: 'hidden' }}>
        {/* 参考图片预览 - 移到顶部 */}
        {referenceImages.length > 0 && (
          <div className="flex flex-col gap-2 pb-2 border-b border-zinc-800">
            <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
              References ({activeReferenceImages.length}/{referenceImages.length})
            </span>
            <div className="flex flex-wrap gap-2">
              {referenceImages.map((img, index) => {
                const isIgnored = index >= maxImages;
                return (
                  <div 
                    key={`${img.id}-${index}`}
                    className={`relative cursor-pointer transition-all ${isIgnored ? 'opacity-40 grayscale hover:opacity-100 hover:grayscale-0' : 'hover:scale-105'}`}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setPreviewPos({ x: rect.left, y: rect.top - 8 });
                      setPreviewImage(img.src);
                      setShowPreview(true);
                    }}
                    onMouseLeave={() => {
                      setShowPreview(false);
                      setPreviewImage(null);
                    }}
                  >
                    <div className={`h-8 w-auto min-w-[32px] max-w-[60px] bg-zinc-900 rounded overflow-hidden ${isIgnored ? 'opacity-50' : 'shadow-sm'}`}>
                      <img 
                        src={img.src} 
                        alt={`Reference ${index + 1}`} 
                        className="h-full w-full object-cover"
                      />
                    </div>
                    {/* Video Frame Indicator */}
                    {img.type === 'video-frame' && (
                       <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full border border-zinc-950 ${isIgnored ? 'bg-zinc-600' : (img.isAutoLastFrame ? 'bg-zinc-500' : 'bg-zinc-100')}`} title={img.isAutoLastFrame ? "Video Last Frame" : "Video Captured Frame"} />
                    )}
                    {/* Ignored Indicator */}
                    {isIgnored && (
                       <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                         <div className="bg-black/50 text-white text-[8px] px-1 rounded">忽略</div>
                       </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-xs">
            <Play size={12} className={inputStatusColor === 'text-zinc-900' ? 'text-zinc-300' : (inputStatusColor === 'text-zinc-600' ? 'text-zinc-400' : 'text-zinc-500')} />
            <span className={`font-semibold ${inputStatusColor === 'text-zinc-900' ? 'text-zinc-300' : (inputStatusColor === 'text-zinc-600' ? 'text-zinc-400' : 'text-zinc-500')}`}>{inputStatusText}</span>
          </div>
          {textInputLabel && <InputBadge text={textInputLabel} type="text" />}
        </div>
        
        <PromptInput 
          value={node.data.prompt || ''} 
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
            onChange={v => {
              const [w, h] = v.split(':').map(Number);
              updateNode(node.id, { 
                data: {
                  ...node.data, 
                  ratio: v,
                  aspectRatio: w/h
                } 
              });
            }}
            options={[
              {value:"16:9",label:"16:9"}, 
              {value:"9:16",label:"9:16"},
              {value:"4:3",label:"4:3"},
              {value:"3:4",label:"3:4"},
              {value:"1:1",label:"1:1"}
            ]}
          />
          <DurationSelector 
            value={node.data.duration || durationOptions[0].value}
            options={durationOptions}
            onChange={v => updateNode(node.id, { data: { ...node.data, duration: v } })}
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

      {/* Reference Image Portal Preview */}
      {showPreview && previewImage && createPortal(
        <div 
          className="fixed z-[9999] pointer-events-none animate-in fade-in zoom-in duration-200"
          style={{ 
            left: previewPos.x, 
            top: previewPos.y,
            transform: 'translateY(-100%)',
            maxWidth: 'min(80vw, 600px)',
            maxHeight: 'min(80vh, 600px)'
          }}
        >
          <img 
            src={previewImage} 
            alt="Reference Large" 
            className="w-auto h-auto rounded shadow-2xl object-contain"
            style={{ maxHeight: 'inherit', maxWidth: 'inherit' }}
          />
        </div>,
        document.body
      )}
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
      return { text: `语音合成 (${voiceOption?.label || voice})`, color: 'text-zinc-400' };
    } else {
      const style = node.data.style || 'pop';
      const styleOption = styleOptions.find(s => s.value === style);
      return { text: `歌曲生成 (${styleOption?.label || style})`, color: 'text-zinc-400' };
    }
  };
  
  const modeStatus = getModeStatus();
  
  return (
    <>
      <div className={`relative w-full h-24 bg-zinc-950 border-x border-t border-zinc-800 overflow-hidden transition-all duration-300 cursor-pointer ${isExpanded ? 'rounded-t-lg' : 'rounded-lg border-b'}`}>
        {node.data.isGenerating ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/50 backdrop-blur-sm">
            <div className="w-6 h-6 border-2 border-zinc-100 border-t-transparent rounded-full animate-spin mb-1" />
            <span className="text-[10px] text-zinc-300 font-mono animate-pulse">
              {audioMode === 'song' ? '生成歌曲中...' : '合成语音中...'}
            </span>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-between px-6 group">
            {node.data.audioUrl ? (
              <audio controls src={node.data.audioUrl} className="w-full h-8" />
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 shadow-sm border border-zinc-800">
                  {audioMode === 'song' ? (
                    <Music size={16} />
                  ) : (
                    <Play size={16} fill="currentColor" className="ml-0.5" />
                  )}
                </div>
                <div className="flex items-center gap-1 h-8 opacity-60">
                  {[...Array(15)].map((_,i) => <div key={i} className="w-1 bg-zinc-700 rounded-full" style={{ height: `${Math.random() * 100}%` }}></div>)}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      
      <div className={`bg-zinc-950 shadow-sm border-x border-b border-zinc-800 p-3 flex flex-col gap-3 relative z-10 ${isExpanded ? 'rounded-b-lg opacity-100 max-h-[400px] py-3' : 'opacity-0 max-h-0 py-0 border-none rounded-b-lg'}`} style={{ overflow: 'hidden' }}>
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
        <div className="flex gap-2 p-1 bg-zinc-900 rounded-lg border border-zinc-800">
          <button
            onClick={() => toggleAudioMode('speech')}
            className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-colors ${
              audioMode === 'speech' 
                ? 'bg-zinc-800 text-zinc-100 shadow-sm' 
                : 'text-zinc-400 hover:text-zinc-300'
            }`}
          >
            语音生成
          </button>
          <button
            onClick={() => toggleAudioMode('song')}
            className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-colors ${
              audioMode === 'song' 
                ? 'bg-zinc-800 text-zinc-100 shadow-sm' 
                : 'text-zinc-400 hover:text-zinc-300'
            }`}
          >
            歌曲生成
          </button>
        </div>
        
        {/* 文本/歌词输入区域 - 可调整高度 */}
        <div ref={textAreaRef} className="relative border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/50" style={{ height: `${currentTextHeight}px` }}>
          <textarea 
            className="w-full h-full text-sm bg-transparent p-2 focus:ring-1 focus:ring-zinc-700 outline-none resize-none border-none text-zinc-100 placeholder-zinc-600" 
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
            className="absolute right-0 bottom-0 w-4 h-4 cursor-ns-resize z-10 text-zinc-600 hover:text-zinc-400 flex items-center justify-center transition-colors"
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
        
        <div className="flex justify-between items-center pt-2 border-t border-zinc-900">
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
          <GenerateButton 
            onClick={handleGenerate} 
            text={audioMode === 'song' ? '生成歌曲' : '生成音频'}
            icon={<Wand2 size={10} className="fill-zinc-900" />}
          />
        </div>
      </div>



    </>
  );
};