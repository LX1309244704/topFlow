// Gemini AI 服务接口 (文本生成、图像生成、剧本分析)
const API_BASE_URL = 'https://ai.jmyps.com';

/**
 * 从localStorage获取API Key
 * @returns {Promise<string>} API Key
 */
const getApiKey = async () => {
  // 只从localStorage获取API Key
  const localApiKey = localStorage.getItem('topflow_api_key');
  if (localApiKey) {
    return localApiKey;
  }
  
  // 如果本地没有API Key，返回空字符串
  console.warn('⚠️ 未配置API Key');
  return '';
};

/**
 * 基础API请求函数
 * @param {string} endpoint - API端点路径
 * @param {Object} data - 请求数据
 * @param {string} method - HTTP方法，默认为POST
 * @param {Object} headers - 额外的请求头
 * @returns {Promise} API响应
 */
const apiRequest = async (endpoint, data, method = 'POST', headers = {}) => {
  try {
    // 自动获取API Key
    const apiKey = await getApiKey();
    
    // 如果API Key为空，抛出特殊的错误类型
    if (!apiKey) {
      const error = new Error('API Key未配置，请点击左下角"API Key"按钮进行配置');
      error.code = 'API_KEY_MISSING';
      throw error;
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...headers
      },
      body: method !== 'GET' ? JSON.stringify(data) : undefined
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('🚫 Gemini API响应错误:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      throw new Error(`API请求失败: ${response.status} - ${errorData.message || '未知错误'}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Gemini API请求错误:', error);
    throw error;
  }
};

/**
 * 带重试机制的API请求函数
 * @param {string} endpoint - API端点路径
 * @param {Object} data - 请求数据
 * @param {string} method - HTTP方法，默认为POST
 * @param {number} retries - 重试次数，默认为3
 * @param {Object} headers - 额外的请求头
 * @returns {Promise} API响应
 */
const apiRequestWithRetry = async (endpoint, data, method = 'POST', retries = 3, headers = {}) => {
  let lastError;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await apiRequest(endpoint, data, method, headers);
    } catch (error) {
      lastError = error;
      
      // 如果是网络错误，进行重试
      if (i < retries - 1 && (error.message.includes('Failed to fetch') || error.message.includes('请求超时'))) {
        console.warn(`Gemini API请求失败 (${i + 1}/${retries})，${error.message}，正在重试...`);
        // 指数退避策略
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // 其他错误直接抛出
        throw error;
      }
    }
  }
  
  throw lastError;
};

/**
 * 带超时的流式请求
 * @param {string} endpoint - API端点路径
 * @param {Object} data - 请求数据
 * @param {Function} onChunk - 处理流数据的回调函数
 * @returns {Promise<string>} 完整的响应文本
 */
const fetchStreamWithTimeout = async (endpoint, data, onChunk) => {
  // 自动获取API Key
  const apiKey = await getApiKey();
  
  // 检查API Key是否为空
  if (!apiKey) {
    const error = new Error('API Key未配置，请点击左下角"API Key"按钮进行配置');
    error.code = 'API_KEY_MISSING';
    throw error;
  }
  
  // 构建URL，添加必要的查询参数
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  url.searchParams.append('key', apiKey);
  url.searchParams.append('alt', 'sse');
  
  // 添加超时控制，增加超时时间到60秒
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时
  
  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify(data),
      signal: controller.signal,
      mode: 'cors' // 明确指定CORS模式
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // 尝试获取错误详情
      let errorMessage = `Gemini API请求失败: ${response.status}`;
      try {
        const errorData = await response.text();
        if (errorData) {
          errorMessage += ` - ${errorData}`;
        }
      } catch {
        // 忽略解析错误
      }
      throw new Error(errorMessage);
    }

    // 检查响应类型
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('text/event-stream')) {
      console.warn('响应不是事件流格式:', contentType);
      // 尝试作为普通响应处理
      const text = await response.text();
      if (onChunk && typeof onChunk === 'function') {
        onChunk(text);
      }
      return text;
    }

    // 处理流式响应
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      // 按行分割处理
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 保存最后一个可能不完整的行
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          if (dataStr === '[DONE]') continue;
          
          try {
            const data = JSON.parse(dataStr);
            if (data.candidates && data.candidates[0]?.content?.parts) {
              // 处理每个part
              for (const part of data.candidates[0].content.parts) {
                // 检查是否是思考过程
                if (part.thought === true) {
                  // 这是思考过程，可以选择性显示或忽略
                  console.log('Gemini AI思考过程:', part.text);
                } else if (part.text && part.text !== undefined && part.text !== null) {
                  // 处理文本内容
                  const text = part.text;
                  fullText += text;
                  // 安全地调用回调函数，确保传递正确的文本
                  if (onChunk && typeof onChunk === 'function') {
                    try {
                      onChunk(text);
                    } catch (error) {
                      console.error('Gemini流式回调函数执行错误:', error);
                    }
                  }
                }
              }
            }
          } catch (e) {
            console.error('解析Gemini流数据错误:', e, '原始数据:', dataStr);
          }
        }
      }
    }

    return fullText;
  } catch (fetchError) {
    clearTimeout(timeoutId);
    if (fetchError.name === 'AbortError') {
      throw new Error('请求超时');
    }
    throw fetchError;
  }
};

/**
 * 流式API请求，带重试机制
 * @param {string} endpoint - API端点路径
 * @param {Object} data - 请求数据
 * @param {Function} onChunk - 处理流数据的回调函数
 * @param {number} retries - 重试次数，默认为3
 * @returns {Promise<string>} 完整的响应文本
 */
const fetchStreamWithRetry = async (endpoint, data, onChunk, retries = 3) => {
  let lastError;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await fetchStreamWithTimeout(endpoint, data, onChunk);
    } catch (error) {
      lastError = error;
      
      // 如果是网络错误或超时，进行重试
      if (i < retries - 1 && (error.message.includes('请求超时') || error.message.includes('Failed to fetch'))) {
        console.warn(`Gemini流式API请求失败 (${i + 1}/${retries})，${error.message}，正在重试...`);
        // 指数退避策略
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // 其他错误直接抛出
        throw error;
      }
    }
  }
  
  throw lastError;
};

/**
 * Gemini文本生成API（使用流式API）
 * @param {string} prompt - 文本生成提示词
 * @returns {Promise<string>} 生成的文本
 */
export const generateGeminiText = async (prompt) => {
  try {
    let fullText = '';
    fullText = await fetchStreamWithRetry('/v1beta/models/gemini-2.5-pro:streamGenerateContent', {
      systemInstruction: {
        parts: [
          {
            text: "你是一个专业的AI助手，能够根据用户的输入生成高质量的文本内容。"
          }
        ]
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 1,
        topP: 1,
        thinkingConfig: {
          includeThoughts: true,
          thinkingBudget: 26240
        }
      }
    }, (text) => {
      // 这里可以添加实时处理逻辑，比如显示进度
      console.log('Gemini收到文本片段:', text);
    });
    
    return fullText || '生成失败';
  } catch (error) {
    console.error('Gemini文本生成错误:', error);
    return '生成失败: ' + error.message;
  }
};

/**
 * Gemini流式文本生成API（用于实时显示）
 * @param {string} prompt - 文本生成提示词
 * @param {Function} onChunk - 处理流数据的回调函数
 * @returns {Promise<string>} 完整的生成文本
 */
export const generateGeminiStreamText = async (prompt, onChunk, model = "gemini-2.5-pro") => {
  try {
    let fullText = '';
    let accumulatedText = '';
    
    // 根据选择的模型确定API端点
    const modelEndpoint = model === "gemini-3-pro" ? "/v1beta/models/gemini-3-pro-preview:generateContent" : "/v1beta/models/gemini-2.5-pro:streamGenerateContent";
    
    // 首先测试API连接性
    console.log(`开始Gemini流式文本生成请求，使用模型: ${model}`);
    console.log(`选择的API端点: ${modelEndpoint}`);
    
    fullText = await fetchStreamWithRetry(modelEndpoint, {
      systemInstruction: {
        parts: [
          {
            text: "你是一个专业的AI助手，能够根据用户的输入生成高质量的文本内容。"
          }
        ]
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 1,
        topP: 1,
        thinkingConfig: {
          includeThoughts: true,
          thinkingBudget: 26240
        }
      }
    }, (text) => {
      // 实时处理文本片段，确保不会传递undefined值
      if (text && text !== undefined && text !== null && text.trim() !== '') {
        accumulatedText += text;
        fullText += text;
        
        // 安全地调用回调函数
        if (onChunk && typeof onChunk === 'function') {
          try {
            onChunk(text);
          } catch (error) {
            console.error('Gemini回调函数执行错误:', error);
          }
        }
      }
    });
    
    return fullText || '生成失败';
  } catch (error) {
    console.error('Gemini流式文本生成错误:', error);
    
    // 提供降级方案：使用模拟的流式响应
    if (error.message.includes('Failed to fetch') || error.message.includes('网络错误')) {
      console.warn('Gemini API连接失败，使用模拟响应');
      
      // 模拟流式响应
      const mockResponse = `这是对您提供的剧本的模拟AI续写：\n\n${prompt}\n\nAI继续写道：这是一个充满悬念的故事...`;
      
      // 模拟流式效果
      if (onChunk && typeof onChunk === 'function') {
        const chunks = mockResponse.split('');
        for (let i = 0; i < chunks.length; i++) {
          setTimeout(() => {
            try {
              onChunk(chunks[i]);
            } catch (e) {
              console.error('模拟Gemini流式回调错误:', e);
            }
          }, i * 50); // 50ms间隔模拟打字效果
        }
      }
      
      return mockResponse;
    }
    
    return '生成失败: ' + error.message;
  }
};

/**
 * Gemini图像生成API
 * @param {string} prompt - 图像生成提示词
 * @param {string} model - 模型名称，默认为nano-banana
 * @param {string} ratio - 图像宽高比，默认为4:3
 * @returns {Promise<string>} Base64编码的图像数据
 */
export const generateGeminiImage = async (prompt, model = 'nano-banana', ratio = '4:3') => {
  try {
    // 模型映射
    const modelMap = {
      'nano-banana': 'gemini-2.5-flash-image-preview',
      'nano-banana-pro': 'gemini-3-pro-image-preview',
      'qwen-image': 'qwen-image-edit-2509'
    };
    
    const endpoint = `/v1beta/models/${modelMap[model] || modelMap['nano-banana']}:generateContent`;
    
    // 将比例转换为正确的宽高比格式
    const [widthRatio, heightRatio] = ratio.split(':').map(Number);
    const aspectRatio = `${widthRatio}:${heightRatio}`;
    
    // 构建API请求
    const requestData = {
      contents: [
        {
          parts: [
            {
              text: `生成一张图片，描述：${prompt}，宽高比：${ratio}`
            }
          ]
        }
      ],
      generationConfig: {
        responseModalities: ["IMAGE"],
        imageConfig: {
          aspectRatio: aspectRatio
        }
      }
    };
    
    console.log('📤 Gemini图像生成API请求参数:', JSON.stringify(requestData, null, 2));
    
    const response = await apiRequestWithRetry(endpoint, requestData);
    
    console.log('📥 Gemini图像生成API响应类型:', typeof response);
    
    // 检查响应结构，API可能直接返回Base64数据
    if (typeof response === 'string' && response.length > 0) {
      console.log('✅ 获得Gemini Base64图片数据');
      return `data:image/png;base64,${response}`;
    }
    
    // Google Gemini API标准响应结构
    const imagePart = response?.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
    if (imagePart && imagePart.inlineData?.data) {
      console.log('✅ 获得Gemini API图片数据');
      return `data:image/png;base64,${imagePart.inlineData.data}`;
    }
    
    // 检查其他可能的响应结构
    const possibleDataFields = ['data', 'image_data', 'base64_image', 'image'];
    for (const field of possibleDataFields) {
      if (response[field] && typeof response[field] === 'string') {
        console.log(`✅ 获得Gemini图片数据 (字段: ${field})`);
        return `data:image/png;base64,${response[field]}`;
      }
    }
    
    console.log('⚠️ Gemini API未返回图片数据，使用占位图片');
    return createPlaceholderImage(prompt, ratio);
    
  } catch (error) {
    console.error("❌ Gemini图像生成API错误:", error);
    return createPlaceholderImage(prompt, ratio, true);
  }
};

/**
 * Gemini基于参考图像的图像编辑API
 * @param {string} prompt - 图像编辑提示词
 * @param {string} refImage - 参考图像的Base64数据
 * @param {string} model - 模型名称，默认为nano-banana
 * @param {string} ratio - 图像宽高比，默认为4:3
 * @returns {Promise<string>} Base64编码的图像数据
 */
export const generateGeminiImageFromRef = async (prompt, refImage, model = 'nano-banana', ratio = '4:3') => {
  console.log('🎨 Gemini图像编辑API调用:', { prompt, model, ratio, hasRefImage: !!refImage });
  
  if (!refImage) {
    console.warn('⚠️ 没有参考图片，切换到普通生成模式');
    return await generateGeminiImage(prompt, model, ratio);
  }
  
  try {
    // 模型映射
    const modelMap = {
      'nano-banana': 'gemini-2.5-flash-image-preview',
      'nano-banana-pro': 'gemini-3-pro-image-preview',
      'qwen-image': 'qwen-image-edit-2509'
    };
    
    console.log('🔧 Gemini模型映射检查:', {
      用户选择的模型: model,
      映射后的API模型: modelMap[model],
      最终端点: `/v1beta/models/${modelMap[model] || modelMap['nano-banana']}:generateContent`
    });
    
    const endpoint = `/v1beta/models/${modelMap[model] || modelMap['nano-banana']}:generateContent`;
    
    // 移除data:image/...;base64,前缀
    const base64Image = refImage.split(',')[1] || refImage.replace(/^data:image\/\w+;base64,/, '');
    
    // 将比例转换为正确的宽高比格式
    const [widthRatio, heightRatio] = ratio.split(':').map(Number);
    const aspectRatio = `${widthRatio}:${heightRatio}`;
    
    console.log('📐 Gemini参考图比例参数处理:', { 
      原始比例: ratio, 
      宽比: widthRatio, 
      高比: heightRatio, 
      最终aspectRatio: aspectRatio,
      是否为竖图: heightRatio > widthRatio
    });
    
    // 构建API请求
    const requestData = {
      contents: [
        {
          parts: [
            {
              text: prompt || "根据参考图片生成新图片"
            },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image
              }
            }
          ]
        }
      ],
      generationConfig: {
        responseModalities: ["IMAGE"],
        imageConfig: {
          aspectRatio: aspectRatio
        }
      }
    };
    
    const response = await apiRequestWithRetry(endpoint, requestData);
    
    // 检查响应结构，API可能直接返回Base64数据
    if (typeof response === 'string' && response.length > 0) {
      return `data:image/png;base64,${response}`;
    }
    
    // Google Gemini API返回的编辑后图片数据
    const imagePart = response?.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
    if (imagePart && imagePart.inlineData?.data) {
      return `data:image/png;base64,${imagePart.inlineData.data}`;
    }
    
    // 检查其他可能的响应结构
    const possibleDataFields = ['data', 'image_data', 'base64_image', 'image'];
    for (const field of possibleDataFields) {
      if (response[field] && typeof response[field] === 'string') {
        return `data:image/png;base64,${response[field]}`;
      }
    }
    
    return createPlaceholderImage(prompt, ratio);
    
  } catch (error) {
    console.error("❌ Gemini参考图生成错误:", error);
    // 出错时返回占位图片而不是原始图片，确保比例正确
    return createPlaceholderImage(prompt, ratio, true);
  }
};

/**
 * Gemini结构化文本生成API（用于剧本分析）
 * @param {string} script - 剧本内容
 * @returns {Promise<Object>} 分析结果对象
 */
export const generateGeminiStructuredSynopsis = async (script, model = "gemini-2.5-pro", rolePrompt = "") => {
  try {
    let fullText = '';
    
    // 构建系统提示词，优先使用角色提示词
    const systemInstruction = rolePrompt ? 
      rolePrompt : 
      "你是一个专业的剧本分析师，能够分析剧本并提取关键信息。请直接返回JSON格式的数据，不要添加任何前缀或解释文本。";
    
    const analysisPrompt = `请分析以下剧本，返回一个包含以下字段的JSON对象：
        {
          "synopsis": "剧本概要",
          "characters": ["角色1", "角色2"],
          "key_scenes": ["场景1", "场景2", "场景3"]
        }
        
        剧本内容：
        ${script}`;
        
    // 根据选择的模型确定API端点
    const modelEndpoint = model === "gemini-3-pro" ? "/v1beta/models/gemini-3-pro-preview:generateContent" : "/v1beta/models/gemini-2.5-pro:streamGenerateContent";
    
    fullText = await fetchStreamWithRetry(modelEndpoint, {
      systemInstruction: {
        parts: [
          {
            text: systemInstruction
          }
        ]
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: analysisPrompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        topP: 1
      }
    }, (text) => {
      fullText += text;
    });
    
    // 尝试提取JSON部分
    let jsonText = fullText;
    
    // 尝试找到JSON的开始位置
    const jsonStart = fullText.indexOf('{');
    if (jsonStart !== -1) {
      jsonText = fullText.substring(jsonStart);
    }
    
    // 尝试找到JSON的结束位置
    const jsonEnd = jsonText.lastIndexOf('}');
    if (jsonEnd !== -1) {
      jsonText = jsonText.substring(0, jsonEnd + 1);
    }
    
    // 清理可能的代码块标记
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    try {
      const jsonData = JSON.parse(jsonText);
      return jsonData;
    } catch (error) {
      console.error('解析Gemini结构化响应失败:', error, '清理后文本:', jsonText);
      
      // 如果解析失败，尝试手动提取关键信息
      const fallbackData = {
        synopsis: fullText.split('synopsis')[1]?.split('"')[2] || '分析失败',
        characters: [],
        key_scenes: []
      };
      
      // 尝试提取角色
      const charactersMatch = fullText.match(/"characters"\s*:\s*\[([^\]]+)\]/);
      if (charactersMatch) {
        fallbackData.characters = charactersMatch[1].split(',').map(s => s.trim().replace(/"/g, ''));
      }
      
      // 尝试提取关键场景
      const scenesMatch = fullText.match(/"key_scenes"\s*:\s*\[([^\]]+)\]/);
      if (scenesMatch) {
        fallbackData.key_scenes = scenesMatch[1].split(',').map(s => s.trim().replace(/"/g, ''));
      }
      
      return fallbackData;
    }
  } catch (error) {
    console.error('Gemini剧本分析错误:', error);
    return { synopsis: '分析失败: ' + error.message, characters: [], key_scenes: [] };
  }
};

// 创建占位图片的辅助函数
const createPlaceholderImage = (prompt, ratio = '4:3', isError = false) => {
  const [widthRatio, heightRatio] = ratio.split(':').map(Number);
  const isPortrait = heightRatio > widthRatio;
  
  let mockWidth, mockHeight;
  if (isPortrait) {
    // 竖图，固定宽度为400像素
    mockWidth = 400;
    mockHeight = Math.round(mockWidth * heightRatio / widthRatio);
  } else {
    // 横图，固定宽度为800像素
    mockWidth = 800;
    mockHeight = Math.round(mockWidth * heightRatio / widthRatio);
  }
  
  const textContent = prompt ? prompt.split(/\s+/).slice(0, 3).join(' ') : (isError ? 'Error' : 'Image');
  const bgColor = isError ? 'ef4444' : '1d4ed8';
  const textColor = 'ffffff';
  
  return `https://placehold.co/${mockWidth}x${mockHeight}/${bgColor}/${textColor}?text=${encodeURIComponent(textContent)}`;
};

export default {
  generateGeminiText,
  generateGeminiStreamText,
  generateGeminiImage,
  generateGeminiImageFromRef,
  generateGeminiStructuredSynopsis,
  getApiKey,
  apiRequest
};