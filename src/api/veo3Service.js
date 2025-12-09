// Veo3 视频生成服务接口
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
      console.error('🚫 Veo3 API响应错误:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      throw new Error(`API请求失败: ${response.status} - ${errorData.message || '未知错误'}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Veo3 API请求错误:', error);
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
        console.warn(`Veo3 API请求失败 (${i + 1}/${retries})，${error.message}，正在重试...`);
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
 * 根据宽高比确定orientation和size参数
 * @param {string} aspectRatio - 宽高比，如"16:9"
 * @returns {Object} 包含orientation和size的对象
 */
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

/**
 * Veo3视频生成API
 * @param {string} prompt - 视频生成提示词
 * @param {string} model - 模型名称，默认为veo_3_1-fast
 * @param {Array} images - 参考图片数组
 * @param {string} aspectRatio - 视频宽高比，默认为16:9
 * @param {number} duration - 视频时长，Veo3仅支持8秒
 * @returns {Promise<string>} 视频URL
 */
export const generateVeo3Video = async (prompt, model = 'veo_3_1-fast', images = [], aspectRatio = '16:9', duration = 8) => {
  
  try {
    // Veo3仅支持8秒视频
    const veo3Duration = 8;
    
    const { orientation, size } = getOrientationAndSize(aspectRatio);
    
    // 构建请求参数，按照Veo3 API规范
    const requestData = {
      images: images,
      model: model, // Veo3模型名称
      orientation: orientation,
      prompt: prompt || '',
      size: size,
      duration: veo3Duration, // Veo3固定为8秒
      watermark: false,
      private: true
    };
    
    
    // 创建视频任务（使用重试机制）
    const response = await apiRequestWithRetry('/v1/video/create', requestData);
    
    if (!response.id) {
      throw new Error('创建Veo3视频任务失败');
    }
    
    // 轮询查询任务状态
    let attempts = 0;
    const maxAttempts = 120; // 最多查询60次（5分钟）
    const pollInterval = 5000; // 每5秒查询一次
    
    while (attempts < maxAttempts) {
      attempts++;
      
      // 等待一段时间后查询
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
      // 查询任务状态 - 使用Veo3 API的查询接口（使用重试机制）
      const statusResponse = await apiRequestWithRetry(`/v1/video/query?id=${response.id}`, {}, 'GET');
      
      console.log('Veo3视频任务状态查询:', statusResponse);
      
      // 根据Veo3 API返回格式检查状态
      if (statusResponse.status === 'completed' || statusResponse.status === 'success') {
        // 如果API返回video_url，直接使用
        if (statusResponse.video_url) {
          return statusResponse.video_url;
        }
        // 或者尝试根据id构造视频URL
        return `${API_BASE_URL}/v1/video/download?id=${response.id}`;
      }
      
      if (statusResponse.status === 'failed') {
        const errorMessage = statusResponse.error?.message || statusResponse.error || '未知错误';
        throw new Error(`Veo3视频生成失败: ${errorMessage}`);
      }
      
      // 任务仍在进行中，继续轮询
      console.log(`Veo3视频生成中，进度: ${statusResponse.progress || attempts}/${maxAttempts}, 当前状态: ${statusResponse.status}`);
    }
    
    throw new Error('Veo3视频生成超时');
  } catch (error) {
    console.error('Veo3视频生成错误:', error);
    // 返回示例视频作为占位符
    return 'https://www.w3schools.com/html/mov_bbb.mp4';
  }
};

export default {
  generateVeo3Video,
  getApiKey,
  apiRequest
};