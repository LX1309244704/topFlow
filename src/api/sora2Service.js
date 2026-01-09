// Sora-2-all 视频生成服务接口
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
      console.warn('⚠️ API Key为空，跳过API请求');
      const error = new Error('API Key未配置，请点击左下角"API Key"按钮进行配置');
      error.code = 'API_KEY_MISSING';
      throw error;
    }
    
    // 添加请求URL和参数的详细日志
    const requestUrl = `${API_BASE_URL}${endpoint}`;
    
    const response = await fetch(requestUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...headers
      },
      body: method !== 'GET' ? JSON.stringify(data) : undefined,
      // 添加一些可能有助于解决CORS或网络问题的选项
      mode: 'cors',
      cache: 'no-cache',
      referrerPolicy: 'no-referrer'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('🚫 Sora-2-all API响应错误:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      const error = new Error(`API请求失败: ${response.status} - ${errorData.message || '未知错误'}`);
      error.status = response.status;
      error.errorData = errorData;
      throw error;
    }

    return await response.json();
  } catch (error) {
    // 提供更详细的错误信息
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      console.error('🚫 Sora-2-all API网络连接失败:', {
        message: error.message,
        url: `${API_BASE_URL}${endpoint}`,
        // 尝试提供一些可能的解决方案
        possibleCauses: [
          '网络连接不可用',
          'API服务器可能暂时不可用',
          'CORS策略可能阻止了请求',
          '防火墙或VPN可能阻止了请求',
          'API端点URL可能已更改'
        ]
      });
      
      // 创建一个更具描述性的错误
      const enhancedError = new Error('Sora-2-all API连接失败，请检查网络连接或稍后重试');
      enhancedError.originalError = error;
      enhancedError.isNetworkError = true;
      enhancedError.endpoint = `${API_BASE_URL}${endpoint}`;
      throw enhancedError;
    }
    
    console.error('Sora-2-all API请求错误:', error);
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
      const isNetworkError = error.isNetworkError || 
                            error.message.includes('Failed to fetch') || 
                            error.message.includes('请求超时') ||
                            error.message.includes('NetworkError');
      
      const isRetryableStatus = error.status === 429 || error.status === 503 || error.status === 502 || error.status === 504;
      const isHeavyLoad = error.message.includes('heavy load') || (error.errorData && error.errorData.message && error.errorData.message.includes('heavy load'));
                            
      if (i < retries - 1 && (isNetworkError || isRetryableStatus || isHeavyLoad)) {
        // 指数退避策略
        const delay = Math.pow(2, i) * 1000;
        console.log(`Sora-2-all API请求失败 (重试 ${i+1}/${retries}):`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // 其他错误直接抛出
        // 如果是最后一次重试且是网络错误，提供额外的诊断信息
        if (i === retries - 1 && (isNetworkError || isRetryableStatus || isHeavyLoad)) {
          console.error('🚫 Sora-2-all API所有重试均失败，可能是网络或服务器问题:', {
            endpoint: `${API_BASE_URL}${endpoint}`,
            originalError: error.originalError || error.message
          });
        }
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
    return { orientation: 'square', size: 'large' };
  }
};

/**
 * Sora-2-all视频生成API
 * @param {string} prompt - 视频生成提示词
 * @param {string} model - 模型名称，默认为sora-2-all
 * @param {Array} images - 参考图片数组
 * @param {string} aspectRatio - 视频宽高比，默认为16:9
 * @param {number} duration - 视频时长，默认为15秒
 * @returns {Promise<string>} 视频URL
 */
export const generateSora2Video = async (prompt, model = 'sora-2-all', images = [], aspectRatio = '16:9', duration = 15) => {
  // 添加调试日志，查看传入的参数
  console.log('Sora-2-all视频生成参数:', { prompt, model, images, aspectRatio, duration });
  
  const maxGlobalRetries = 3;
  let globalAttempts = 0;

  while (globalAttempts < maxGlobalRetries) {
    globalAttempts++;
    
    try {
      const { orientation, size } = getOrientationAndSize(aspectRatio);
      
      // 构建请求参数，按照Sora-2-all API规范
      const requestData = {
        images: images,
        model: model === 'sora-2-all' ? 'sora-2-all' : model, // Sora-2-all模型名称为sora-2-all
        orientation: orientation,
        prompt: prompt || '',
        size: size,
        duration: duration,
        watermark: false,
        private: false
      };
      
      
      // 创建视频任务（使用重试机制）
      const response = await apiRequestWithRetry('/v1/video/create', requestData);
      
      if (!response.id) {
        throw new Error('创建Sora2视频任务失败');
      }
      
      // 轮询查询任务状态
      let attempts = 0;
      const maxAttempts = 100; // 最多查询60次（5分钟）
      const pollInterval = 5000; // 每5秒查询一次
      
      while (attempts < maxAttempts) {
        attempts++;
        
        // 等待一段时间后查询
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
        // 查询任务状态 - 使用Sora2 API的查询接口（使用重试机制）
        const statusResponse = await apiRequestWithRetry(`/v1/video/query?id=${response.id}`, {}, 'GET');
        
        console.log('Sora2视频任务状态查询:', statusResponse);
        
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
          const errorMessage = statusResponse.error?.message || statusResponse.error || '未知错误';
          
          // 如果是因为服务器负载过高导致的失败，抛出特殊错误以触发全局重试
          if (errorMessage.includes('heavy load') || errorMessage.includes('busy')) {
             throw new Error('HEAVY_LOAD_RETRY');
          }
          
          throw new Error(`Sora2视频生成失败: ${errorMessage}`);
        }
        
        // 任务仍在进行中，继续轮询
        console.log(`Sora2视频生成中，进度: ${statusResponse.progress || attempts}/${maxAttempts}, 当前状态: ${statusResponse.status}`);
      }
      
      const enhancedError = new Error('Sora2视频生成超时（5分钟）');
      enhancedError.code = 'TIMEOUT_ERROR';
      enhancedError.solution = '视频生成可能需要更长时间，请稍后重试或尝试简化提示词';
      enhancedError.details = '视频生成任务在5分钟内未完成，可能是服务器负载较高或生成复杂内容需要更长时间';
      throw enhancedError;
    } catch (error) {
      // 检查是否需要全局重试
      const isHeavyLoad = error.message === 'HEAVY_LOAD_RETRY' || 
                          error.message.includes('heavy load') || 
                          error.message.includes('busy');
                          
      if (isHeavyLoad && globalAttempts < maxGlobalRetries) {
        const retryDelay = 5000 * globalAttempts; // 递增等待时间：5s, 10s
        console.warn(`Sora2服务器负载过高，正在重新尝试生成 (${globalAttempts}/${maxGlobalRetries})... 等待 ${retryDelay}ms`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }
      
      console.error('Sora2视频生成错误:', error);
      
      // 创建友好的错误信息
      let userFriendlyError = new Error();
      
      if (error.code === 'TIMEOUT_ERROR') {
        userFriendlyError.message = '视频生成超时';
        userFriendlyError.code = 'TIMEOUT_ERROR';
        userFriendlyError.solution = error.solution;
        userFriendlyError.details = error.details;
      } else if (error.isNetworkError || error.message.includes('Failed to fetch') || error.message.includes('网络连接失败')) {
        userFriendlyError.message = '网络连接失败';
        userFriendlyError.code = 'NETWORK_ERROR';
        userFriendlyError.solution = '请检查网络连接，或稍后重试';
        userFriendlyError.details = '无法连接到Sora2视频生成服务';
      } else if (error.message.includes('API Key')) {
        userFriendlyError.message = 'API Key未配置';
        userFriendlyError.code = 'API_KEY_ERROR';
        userFriendlyError.solution = '请点击左下角"API Key"按钮配置有效的API Key';
        userFriendlyError.details = '需要有效的API Key才能使用Sora2视频生成功能';
      } else if (error.message.includes('服务器错误') || error.message.includes('500') || error.message.includes('heavy load')) {
        userFriendlyError.message = '服务器繁忙';
        userFriendlyError.code = 'SERVER_BUSY';
        userFriendlyError.solution = '服务器负载过高，已自动重试多次但仍失败，请稍后重试';
        userFriendlyError.details = 'Sora2视频生成服务暂时不可用';
      } else {
        userFriendlyError.message = '视频生成失败';
        userFriendlyError.code = 'GENERAL_ERROR';
        userFriendlyError.solution = '请检查提示词内容，或尝试重新生成';
        userFriendlyError.details = error.message || '未知错误';
      }
      
      // 保留原始错误信息用于调试
      userFriendlyError.originalError = error;
      
      // 抛出友好的错误信息
      throw userFriendlyError;
    }
  }
};

export default {
  generateSora2Video,
  getApiKey,
  apiRequest
};