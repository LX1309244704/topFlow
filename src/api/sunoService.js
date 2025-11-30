// 歌曲生成服务接口 (Suno模型)
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
    
    console.log('🔑 歌曲生成API Key状态:', {
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey ? apiKey.length : 0,
      apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'null'
    });
    
    // 如果API Key为空，抛出特殊的错误类型
    if (!apiKey) {
      console.warn('⚠️ API Key为空，跳过API请求');
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
      console.error('🚫 歌曲生成API响应错误:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      throw new Error(`API请求失败: ${response.status} - ${errorData.message || '未知错误'}`);
    }

    return await response.json();
  } catch (error) {
    console.error('歌曲生成API请求错误:', error);
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
        console.warn(`歌曲生成API请求失败 (${i + 1}/${retries})，${error.message}，正在重试...`);
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
 * 歌曲生成API (Suno模型)
 * @param {string} lyrics - 歌词内容
 * @param {string} style - 歌曲风格
 * @param {string} model - 模型，默认为suno-v3
 * @param {string} responseFormat - 响应格式，默认为base64
 * @returns {Promise<string>} Base64编码的音频数据
 */
export const generateSong = async (lyrics, style = 'pop', model = 'suno-v3', responseFormat = 'base64') => {
  try {
    const response = await apiRequestWithRetry('/v1/audio/song', {
      model: model,
      lyrics: lyrics,
      style: style,
      response_format: responseFormat
    });
    
    const audioData = response.audio_base64;
    return audioData ? `data:audio/mp3;base64,${audioData}` : null;
  } catch (error) {
    console.error('歌曲生成错误:', error);
    throw error;
  }
};

export default {
  generateSong,
  getApiKey,
  apiRequest
};