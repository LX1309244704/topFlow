// API客户端模块，用于处理ai.jmyps.com的API调用

const API_BASE_URL = 'https://ai.jmyps.com';

/**
 * 从第三方API服务获取API Key
 * @returns {Promise<string>} API Key
 */
export const getApiKey = async () => {
  // 首先尝试从localStorage获取API Key
  const localApiKey = localStorage.getItem('topflow_api_key');
  if (localApiKey) {
    return localApiKey;
  }
  
  try {
    // 如果本地没有，调用第三方API获取key
    const response = await fetch(`${API_BASE_URL}/api/key`);
    
    if (!response.ok) {
      throw new Error(`获取API Key失败: ${response.status}`);
    }
    
    const data = await response.json();
    const apiKey = data.key || '';
    
    // 将获取的key保存到localStorage
    if (apiKey) {
      localStorage.setItem('topflow_api_key', apiKey);
    }
    
    return apiKey;
  } catch (error) {
    console.error('获取API Key出错:', error);
    // 如果获取失败，返回空字符串，让应用使用默认行为
    return '';
  }
};

/**
 * 基本API请求函数
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
      throw new Error(`API请求失败: ${response.status} - ${errorData.message || '未知错误'}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API请求错误:', error);
    throw error;
  }
};

/**
 * 带重试机制的API请求
 * @param {string} endpoint - API端点路径
 * @param {Object} data - 请求数据
 * @param {string} method - HTTP方法，默认为POST
 * @param {number} retries - 重试次数，默认为3
 * @param {Object} headers - 额外的请求头
 * @returns {Promise} API响应
 */
const fetchWithRetry = async (endpoint, data, method = 'POST', retries = 3, headers = {}) => {
  let lastError;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await apiRequest(endpoint, data, method, headers);
    } catch (error) {
      lastError = error;
      if (i < retries - 1) {
        // 指数退避策略
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

/**
 * 流式API请求
 * @param {string} endpoint - API端点路径
 * @param {Object} data - 请求数据
 * @param {Function} onChunk - 处理流数据的回调函数
 * @returns {Promise<string>} 完整的响应文本
 */
const fetchStreamWithRetry = async (endpoint, data, onChunk) => {
  try {
    // 自动获取API Key
    const apiKey = await getApiKey();
    
    // 检查API Key是否为空
    if (!apiKey) {
      throw new Error('API Key为空，请先配置API Key');
    }
    
    // 构建URL，添加必要的查询参数
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    url.searchParams.append('key', apiKey);
    url.searchParams.append('alt', 'sse');
    
    // 添加超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
    
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
        let errorMessage = `API请求失败: ${response.status}`;
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
                    console.log('AI思考过程:', part.text);
                  } else if (part.text && part.text !== undefined && part.text !== null) {
                    // 处理文本内容
                    const text = part.text;
                    fullText += text;
                    // 安全地调用回调函数，确保传递正确的文本
                    if (onChunk && typeof onChunk === 'function') {
                      try {
                        onChunk(text);
                      } catch (error) {
                        console.error('流式回调函数执行错误:', error);
                      }
                    }
                  }
                }
              }
            } catch (e) {
              console.error('解析流数据错误:', e, '原始数据:', dataStr);
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
  } catch (error) {
    console.error('流式API请求错误:', error);
    throw error;
  }
};

// 文本生成API（使用流式API）
export const generateText = async (prompt) => {
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
      console.log('收到文本片段:', text);
    });
    
    return fullText || '生成失败';
  } catch (error) {
    console.error('文本生成错误:', error);
    return '生成失败: ' + error.message;
  }
};

// 流式文本生成API（用于实时显示）
export const generateStreamText = async (prompt, onChunk) => {
  try {
    let fullText = '';
    let accumulatedText = '';
    
    // 首先测试API连接性
    console.log('开始流式文本生成请求...');
    
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
      // 实时处理文本片段，确保不会传递undefined值
      if (text && text !== undefined && text !== null && text.trim() !== '') {
        accumulatedText += text;
        fullText += text;
        
        // 安全地调用回调函数
        if (onChunk && typeof onChunk === 'function') {
          try {
            onChunk(text);
          } catch (error) {
            console.error('回调函数执行错误:', error);
          }
        }
      }
    });
    
    return fullText || '生成失败';
  } catch (error) {
    console.error('流式文本生成错误:', error);
    
    // 提供降级方案：使用模拟的流式响应
    if (error.message.includes('Failed to fetch') || error.message.includes('网络错误')) {
      console.warn('API连接失败，使用模拟响应');
      
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
              console.error('模拟流式回调错误:', e);
            }
          }, i * 50); // 50ms间隔模拟打字效果
        }
      }
      
      return mockResponse;
    }
    
    return '生成失败: ' + error.message;
  }
};

// 图像生成API (兼容Google Gemini API)
export const generateImage = async (prompt, ratio = '4:3') => {
  try {
    // 使用ai.jmyps.com的API，结构按照提供的接口定义
    const response = await fetchWithRetry('/v1beta/models/gemini-2.5-flash-image:generateContent', {
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
          aspectRatio: ratio || "4:3"
        }
      }
    });
    
    // 添加调试日志
    console.log("图像生成API响应:", typeof response, response ? "有内容" : "无内容");
    if (typeof response === 'object') {
      console.log("响应对象键:", Object.keys(response));
    }
    
    // 检查响应结构，API可能直接返回Base64数据
    if (typeof response === 'string' && response.length > 0) {
      // 如果响应直接是Base64字符串
      return `data:image/png;base64,${response}`;
    }
    
    // 或者检查Google Gemini API的标准响应结构
    // 根据实际返回格式，字段名是inlineData（驼峰命名）而非inline_data
    const imagePart = response?.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
    if (imagePart && imagePart.inlineData?.data) {
      return `data:image/png;base64,${imagePart.inlineData.data}`;
    }
    
    // 检查是否有其他可能的响应结构
    if (response.data && typeof response.data === 'string') {
      return `data:image/png;base64,${response.data}`;
    }
    
    if (response.image_data && typeof response.image_data === 'string') {
      return `data:image/png;base64,${response.image_data}`;
    }
    
    if (response.base64_image && typeof response.base64_image === 'string') {
      return `data:image/png;base64,${response.base64_image}`;
    }
    
    // 如果没有返回图片，返回一个占位图片
    const [width, height] = ratio.split(':').map(Number);
    const textContent = prompt ? prompt.split(/\s+/).slice(0, 3).join(' ') : 'Image';
    return `https://placehold.co/${width * 200}x${height * 200}/1d4ed8/ffffff?text=${encodeURIComponent(textContent)}`;
  } catch (error) {
    console.error("图像生成错误:", error);
    // 出错时返回占位图片
    const [width, height] = ratio.split(':').map(Number);
    const textContent = prompt ? prompt.split(/\s+/).slice(0, 3).join(' ') : 'Error';
    return `https://placehold.co/${width * 200}x${height * 200}/ef4444/ffffff?text=${encodeURIComponent(textContent)}`;
  }
};

// 基于参考图像的图像编辑API (兼容Google Gemini API)
export const generateImageFromRef = async (prompt, refImage, ratio = '4:3') => {
  if (!refImage) return null;
  
  try {
    // 移除data:image/...;base64,前缀
    const base64Image = refImage.split(',')[1] || refImage.replace(/^data:image\/\w+;base64,/, '');
    
    // 使用ai.jmyps.com的API，结构按照提供的接口定义
    const response = await fetchWithRetry('/v1beta/models/gemini-2.5-flash-image:generateContent', {
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
          aspectRatio: ratio || "4:3" // 使用传入的比例参数
        }
      }
    });
    
    // 检查响应结构，API可能直接返回Base64数据
    if (typeof response === 'string' && response.length > 0) {
      // 如果响应直接是Base64字符串
      return `data:image/png;base64,${response}`;
    }
    
    // Google Gemini API返回的编辑后图片数据
    // 根据实际返回格式，字段名是inlineData（驼峰命名）而非inline_data
    const imagePart = response?.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
    if (imagePart && imagePart.inlineData?.data) {
      return `data:image/png;base64,${imagePart.inlineData.data}`;
    }
    
    // 检查是否有其他可能的响应结构
    if (response.data && typeof response.data === 'string') {
      return `data:image/png;base64,${response.data}`;
    }
    
    if (response.image_data && typeof response.image_data === 'string') {
      return `data:image/png;base64,${response.image_data}`;
    }
    
    if (response.base64_image && typeof response.base64_image === 'string') {
      return `data:image/png;base64,${response.base64_image}`;
    }
    
    // 如果没有返回图片，返回原始图片
    return refImage;
  } catch (error) {
    console.error("图像编辑错误:", error);
    // 出错时返回原始图片
    return refImage;
  }
};

// 语音合成API
export const generateSpeech = async (text) => {
  const response = await fetchWithRetry('/v1/audio/speech', {
    model: 'tts-1',
    input: text,
    voice: 'alloy',
    response_format: 'base64'
  });
  
  const audioData = response.audio_base64;
  return audioData ? `data:audio/mp3;base64,${audioData}` : null;
};

// 视频生成API (支持 sora2 和 veo3.1)
export const generateVideo = async (prompt, model, images, aspectRatio, duration = 10) => {
  try {
    // 根据宽高比确定orientation和size参数
    const getOrientationAndSize = (aspectRatio) => {
      const [width, height] = aspectRatio.split(':').map(Number);
      
      if (width > height) {
        // 横屏
        return { orientation: 'landscape', size: 'large' };
      } else if (width < height) {
        // 竖屏
        return { orientation: 'portrait', size: 'large' };
      } else {
        // 正方形
        return { orientation: 'portrait', size: 'large' };
      }
    };
    
    const { orientation, size } = getOrientationAndSize(aspectRatio || '16:9');
    
    // 构建请求参数，按照Sora2 API规范
    const requestData = {
      images: images || [],
      model: model === 'sora2' ? 'sora-2' : model, // Sora2模型名称为sora-2
      orientation: orientation,
      prompt: prompt || '',
      size: size,
      duration: duration,
      watermark: false,
      private: true
    };
    
    // 创建视频任务
    const response = await apiRequest('/v1/video/create', requestData);
    
    if (!response.id) {
      throw new Error('创建视频任务失败');
    }
    
    // 轮询查询任务状态
    let attempts = 0;
    const maxAttempts = 60; // 最多查询60次（5分钟）
    const pollInterval = 5000; // 每5秒查询一次
    
    while (attempts < maxAttempts) {
      attempts++;
      
      // 等待一段时间后查询
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
      // 查询任务状态 - 使用Sora2 API的查询接口
      const statusResponse = await apiRequest(`/v1/video/query?id=${response.id}`, {}, 'GET');
      
      console.log('视频任务状态查询:', statusResponse);
      
      // 根据Sora2 API返回格式检查状态
      if (statusResponse.status === 'completed' || statusResponse.status === 'success') {
        // 如果API返回video_url，直接使用
        if (statusResponse.video_url) {
          return statusResponse.video_url;
        }
        // 或者尝试根据id构造视频URL
        return `${API_BASE_URL}/v1/video/download?id=${response.id}`;
      }
      
      if (statusResponse.status === 'failed') {
        throw new Error(`视频生成失败: ${statusResponse.error || '未知错误'}`);
      }
      
      // 任务仍在进行中，继续轮询
      console.log(`视频生成中，进度: ${statusResponse.progress || attempts}/${maxAttempts}, 当前状态: ${statusResponse.status}`);
    }
    
    throw new Error('视频生成超时');
  } catch (error) {
    console.error('视频生成错误:', error);
    // 返回示例视频作为占位符
    return 'https://www.w3schools.com/html/mov_bbb.mp4';
  }
};

// 结构化文本生成API（用于剧本分析）
export const generateStructuredSynopsis = async (script) => {
  try {
    let fullText = '';
    const analysisPrompt = `请分析以下剧本，返回一个包含以下字段的JSON对象：
        {
          "synopsis": "剧本概要",
          "characters": ["角色1", "角色2"],
          "key_scenes": ["场景1", "场景2", "场景3"]
        }
        
        剧本内容：
        ${script}`;
        
    fullText = await fetchStreamWithRetry('/v1beta/models/gemini-2.5-pro:streamGenerateContent', {
      systemInstruction: {
        parts: [
          {
            text: "你是一个专业的剧本分析师，能够分析剧本并提取关键信息。请直接返回JSON格式的数据，不要添加任何前缀或解释文本。"
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
      console.error('解析结构化响应失败:', error, '清理后文本:', jsonText);
      
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
    console.error('剧本分析错误:', error);
    return { synopsis: '分析失败: ' + error.message, characters: [], key_scenes: [] };
  }
};

export default {
  fetchWithRetry,
  generateText,
  generateStreamText,
  generateImage,
  generateImageFromRef,
  generateSpeech,
  generateVideo,
  generateStructuredSynopsis,
  getApiKey
};