// 分镜图片生成代理
// 用于生成4个相关联的分镜图片

/**
 * 基于上传的图片创建分镜图片节点
 * @param {string} uploadedImage - 上传的图片数据
 * @param {string} basePrompt - 基础提示词
 * @param {number} x - X坐标
 * @param {number} y - Y坐标
 * @param {function} onAddNode - 添加节点的回调函数
 * @param {function} generateText - 文本生成函数
 * @param {object} params - 图片生成参数
 */
export const createStoryboardNodesFromImage = async (uploadedImage, basePrompt, x, y, onAddNode, generateText, params = {}) => {
  // 默认参数
  const defaultParams = {
    model: 'nano-banana',
    ratio: '16:9',
    batchSize: 1
  };
  
  const finalParams = { ...defaultParams, ...params };
  
  // 构建分析提示词
  const analysisPrompt = `
你是一位专业的视频预可视化艺术家，专精于为AI视频生成创作首尾帧驱动的连贯关键帧序列。

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

基础提示词: ${basePrompt}

请按以下格式输出每个关键帧的详细描述：

【KF#/4 | 镜头类型 | 视频时间点】
画面描述：详细的视觉内容，包括所有可见元素的状态
构图参数：视角、景别、焦点主体
连续性说明：与前后帧的视觉连接点
`;

  try {
    // 请求大模型分析图片并生成分镜描述
    const analysisResult = await generateText(analysisPrompt);
    
    // 解析分析结果，提取4个关键帧描述
    const keyFrames = parseStoryboardAnalysis(analysisResult);
    
    // 计算宽高比
    const [w, h] = finalParams.ratio.split(':').map(Number);
    const aspectRatio = w / h;
    
    // 创建4个分镜节点
    keyFrames.forEach((prompt, index) => {
      const offsetX = x + (index % 2) * 320;
      const offsetY = y + Math.floor(index / 2) * 240;
      
      const nodeData = {
        prompt,
        model: finalParams.model,
        ratio: finalParams.ratio,
        aspectRatio,
        batchSize: finalParams.batchSize,
        isStoryboard: true,
        storyboardIndex: index + 1,
        storyboardBasePrompt: basePrompt,
        referenceImage: uploadedImage // 使用上传的图片作为参考
      };
      
      onAddNode('image', offsetX, offsetY, null, nodeData);
    });
    
    return true;
  } catch (error) {
    console.error('分镜分析失败:', error);
    // 如果分析失败，回退到基本分镜生成
    createBasicStoryboardNodes(basePrompt, x, y, onAddNode, finalParams);
    return false;
  }
};

/**
 * 创建基本分镜图片节点（无图片分析）
 * @param {string} basePrompt - 基础提示词
 * @param {number} x - X坐标
 * @param {number} y - Y坐标
 * @param {function} onAddNode - 添加节点的回调函数
 * @param {object} params - 图片生成参数
 */
export const createBasicStoryboardNodes = (basePrompt, x, y, onAddNode, params = {}) => {
  // 默认参数
  const defaultParams = {
    model: 'nano-banana',
    ratio: '16:9',
    batchSize: 1
  };
  
  const finalParams = { ...defaultParams, ...params };
  
  // 生成分镜提示词
  const storyboardPrompts = [
    `场景1 - 开始: ${basePrompt}`,
    `场景2 - 发展: ${basePrompt}`,
    `场景3 - 高潮: ${basePrompt}`,
    `场景4 - 结尾: ${basePrompt}`
  ];
  
  // 计算宽高比
  const [w, h] = finalParams.ratio.split(':').map(Number);
  const aspectRatio = w / h;
  
  // 创建4个分镜节点
  storyboardPrompts.forEach((prompt, index) => {
    const offsetX = x + (index % 2) * 320;
    const offsetY = y + Math.floor(index / 2) * 240;
    
    const nodeData = {
      prompt,
      model: finalParams.model,
      ratio: finalParams.ratio,
      aspectRatio,
      batchSize: finalParams.batchSize,
      isStoryboard: true,
      storyboardIndex: index + 1,
      storyboardBasePrompt: basePrompt
    };
    
    onAddNode('image', offsetX, offsetY, null, nodeData);
  });
};

/**
 * 解析分镜分析结果，提取4个关键帧描述
 * @param {string} analysisResult - 大模型返回的分析结果
 * @returns {Array} 4个关键帧提示词数组
 */
export const parseStoryboardAnalysis = (analysisResult) => {
  // 尝试解析【KF#/4】格式
  const kfMatches = analysisResult.match(/【KF[1-4]\/4[\s\S]*?(?=【KF[1-4]\/4|$)/g);
  
  if (kfMatches && kfMatches.length === 4) {
    // 提取画面描述部分
    const descriptions = kfMatches.map(match => {
      const descMatch = match.match(/画面描述[：:]\s*([\s\S]*?)(?=\n|$)/);
      if (descMatch && descMatch[1]) {
        return descMatch[1].trim();
      }
      
      // 如果没有找到画面描述，则使用整个关键帧描述
      return match.replace(/【[^\]]+】/, '').trim();
    });
    
    return descriptions;
  }
  
  // 如果解析失败，尝试提取段落
  const paragraphs = analysisResult.split('\n\n').filter(p => p.trim().length > 0);
  if (paragraphs.length >= 4) {
    return paragraphs.slice(0, 4).map(p => p.trim());
  }
  
  // 如果仍然失败，返回默认分镜
  return [
    "场景1 - 开始: 视频起始状态",
    "场景2 - 发展: 动作或情绪推进",
    "场景3 - 高潮: 变化或转折点",
    "场景4 - 结尾: 视频结束状态"
  ];
};

/**
 * 生成分镜提示词的辅助函数
 * @param {string} basePrompt - 基础提示词
 * @param {string} style - 风格描述
 * @returns {Array} 4个分镜提示词数组
 */
export const generateStoryboardPrompts = (basePrompt, style = '') => {
  const styleText = style ? ` (${style})` : '';
  
  return [
    `场景1 - 开始: ${basePrompt}${styleText}`,
    `场景2 - 发展: ${basePrompt}${styleText}`,
    `场景3 - 高潮: ${basePrompt}${styleText}`,
    `场景4 - 结尾: ${basePrompt}${styleText}`
  ];
};

/**
 * 创建分镜序列节点的连接关系
 * @param {Array} nodeIds - 节点ID数组
 * @param {function} onConnect - 连接节点的回调函数
 */
export const connectStoryboardNodes = (nodeIds, onConnect) => {
  if (!onConnect || nodeIds.length < 2) return;
  
  // 顺序连接分镜节点
  for (let i = 0; i < nodeIds.length - 1; i++) {
    onConnect(nodeIds[i], 'output', nodeIds[i + 1], 'input');
  }
};

export default {
  createStoryboardNodes: createBasicStoryboardNodes,
  createStoryboardNodesFromImage,
  createBasicStoryboardNodes,
  generateStoryboardPrompts,
  connectStoryboardNodes,
  parseStoryboardAnalysis
};