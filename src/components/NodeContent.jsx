import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Mountain, Play, Video, Music, FileText, ImageIcon, Wand2, Download, Trash2, Square, Layers, ChevronDown, Sparkles, Search, RefreshCw, LinkIcon, X, Pencil, Brush } from 'lucide-react';
import { Button, NodeSelect, InputBadge } from './UI.jsx';
import { DrawingCanvas } from './DrawingCanvas.jsx';
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
          className={`p-1.5 bg-white/80 rounded-full shadow-sm backdrop-blur-sm transition-colors ${
            isDisabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-white text-gray-700 cursor-pointer'
          }`} 
          title={isDisabled ? "正在生成，请稍候" : downloadTitle}
        >
          <Download size={14} />
        </button>
      )}
      <button 
        onClick={isDisabled ? undefined : onClear} 
        disabled={isDisabled}
        className={`p-1.5 bg-white/80 rounded-full shadow-sm backdrop-blur-sm transition-colors ${
          isDisabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-white text-red-500 cursor-pointer'
        }`} 
        title={isDisabled ? "正在生成，请稍候" : clearTitle}
      >
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
  // 涂鸦相关状态
  const [isDrawingMode, setIsDrawingMode] = useState(false);

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
    updateNode(node.id, { data: { ...node.data, generatedImage: editedImage } });
    setIsDrawingMode(false);
  };

  const handleDrawingCancel = () => {
    setIsDrawingMode(false);
  };

  const startDrawingMode = () => {
    if (node.data.generatedImage) {
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
      const result = await generateStoryboardWithRetry(storyboardPrompt, !!node.data.generatedImage);
      
      // 处理结果
      let scenes = result.scenes || [];
      
      // 如果AI返回的分镜描述不足4个，使用更专业的默认分镜描述
      if (scenes.length < 4) {
        const defaultScenes = node.data.generatedImage ? [
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
        await window.topFlow.createStoryboardNodes(node, scenes, node.data.generatedImage);
      }
      
    } catch (error) {
      console.error('分镜生成过程中发生错误:', error);
      
      // 如果生成失败，使用更专业的默认分镜描述创建节点
      const defaultScenes = node.data.generatedImage ? [
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
              <div className="flex gap-2">
                {/* 涂鸦按钮 */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    startDrawingMode();
                  }}
                  className="p-1.5 bg-white/80 rounded-full shadow-sm backdrop-blur-sm transition-colors hover:bg-white text-gray-700 cursor-pointer"
                  title="涂鸦编辑"
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
            <Mountain size={64} className="text-blue-200/80" />
            <div 
              className="text-xs text-blue-300 font-medium bg-blue-50/50 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors"
              onClick={() => !isDisabled && fileRef.current?.click()}
            >
              点击上传图片
            </div>
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
          <NodeSelect 
            value={node.data.resolution || "720p"} 
            options={resolutionOptions[node.data.model || "nano-banana"] || resolutionOptions["nano-banana"]} 
            onChange={v => updateNode(node.id, { data: {...node.data, resolution: v} })} 
            className="w-16" 
          />
          <input type="file" ref={fileRef} className="hidden" onChange={handleImageUpload} />
        </BottomActionBar>
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

// 视频节点内容组件 - 重新实现，确保上传按钮可见
export const VideoContent = ({ node, updateNode, isExpanded, handleGenerate, textInputLabel, imageInputs, generateText }) => {
  const videoModelOptions = [
    {value:"sora2",label:"Sora 2.0"}, 
    {value:"veo_3_1-fast",label:"veo_3_1-fast"}
  ];
  
  const fileRef = useRef(null);

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('video/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateNode(node.id, { data: { ...node.data, videoUrl: reader.result, uploadedVideo: true } });
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
    updateNode(node.id, { data: { ...node.data, videoUrl: null, generatedVideo: false, uploadedVideo: false } });
  };

  const isDisabled = node.data.isGenerating;
  const imageCount = imageInputs.length;
  let inputStatusText;
  let inputStatusColor;
  
  if (node.data.uploadedVideo) {
    inputStatusText = '已上传视频';
    inputStatusColor = 'text-green-500';
  } else {
    inputStatusText = imageCount === 0 ? '文生视频模式 (T2V)' : imageCount === 1 ? '参考图生视频模式 (I2V)' : `首尾帧生视频模式 (${imageCount} Refs)`;
    inputStatusColor = imageCount === 0 ? 'text-gray-500' : imageCount === 1 ? 'text-orange-500' : 'text-purple-500';
  }

  return (
    <>
      {/* 视频显示区域 - 简化布局 */}
      <div className={`relative w-full bg-[#dbeafe] border overflow-hidden transition-all duration-300 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'} shadow-sm group ${isExpanded ? 'rounded-t-2xl border-blue-200' : 'rounded-2xl border-[#60a5fa] hover:border-blue-600'}`} style={{ aspectRatio: node.data.aspectRatio || 16/9 }}>
        {node.data.isGenerating ? (
          <GenerationIndicator text="AI Processing..." />
        ) : (
          <>
            {/* 有视频时显示视频和操作按钮 */}
            {node.data.videoUrl ? (
              <>
                <video src={node.data.videoUrl} controls className="w-full h-full object-cover" />
                <div className="absolute bottom-2 right-2 z-50 flex gap-2">
                  <button 
                    onClick={() => !node.data.isGenerating && handleDownload()} 
                    disabled={node.data.isGenerating}
                    className={`p-1.5 bg-white/90 rounded-full shadow-lg backdrop-blur-sm transition-all ${
                      node.data.isGenerating ? 'cursor-not-allowed opacity-50' : 'hover:bg-white hover:shadow-xl text-gray-700 cursor-pointer'
                    }`} 
                    title={node.data.isGenerating ? "正在生成，请稍候" : "下载视频"}
                  >
                    <Download size={14} />
                  </button>
                  
                  <button 
                    onClick={() => !node.data.isGenerating && handleClearVideo()} 
                    disabled={node.data.isGenerating}
                    className={`p-1.5 bg-white/90 rounded-full shadow-lg backdrop-blur-sm transition-all ${
                      node.data.isGenerating ? 'cursor-not-allowed opacity-50' : 'hover:bg-white hover:shadow-xl text-red-500 cursor-pointer'
                    }`} 
                    title={node.data.isGenerating ? "正在生成，请稍候" : "清除视频"}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </>
            ) : (
              /* 无视频时显示上传界面 - 使用与图片节点相同的样式 */
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Video size={64} className="text-blue-200/80" />
                <div 
                  className="text-xs text-blue-300 font-medium bg-blue-50/50 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors"
                  onClick={() => !isDisabled && fileRef.current?.click()}
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

      {/* 底部控制区域 */}
      <div className={`bg-white shadow-xl border-x border-b border-gray-200 p-3 flex flex-col gap-3 relative z-10 ${isExpanded ? 'rounded-b-2xl opacity-100 max-h-[350px] py-3' : 'opacity-0 max-h-0 py-0 border-none rounded-b-2xl'}`} style={{ overflow: 'hidden' }}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-xs">
            <Play size={12} className={inputStatusColor} />
            <span className={`font-semibold ${inputStatusColor}`}>{inputStatusText}</span>
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