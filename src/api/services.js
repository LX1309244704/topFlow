// 统一服务接口文件，整合所有分离的服务
import { generateSora2Video } from './sora2Service.js';
import { generateVeo3Video } from './veo3Service.js';
import { 
  generateGeminiText, 
  generateGeminiStreamText, 
  generateGeminiImage, 
  generateGeminiImageFromRef, 
  generateGeminiStructuredSynopsis 
} from './geminiService.js';
import { generateSpeech } from './ttsService.js';
import { generateSong } from './sunoService.js';

/**
 * 统一视频生成接口，根据模型选择对应的服务
 * @param {string} prompt - 视频生成提示词
 * @param {string} model - 模型名称，支持sora2和veo_3_1-fast
 * @param {Array} images - 参考图片数组
 * @param {string} aspectRatio - 视频宽高比
 * @param {number} duration - 视频时长
 * @returns {Promise<string>} 视频URL
 */
export const generateVideo = async (prompt, model, images, aspectRatio, duration) => {
  console.log('统一视频生成接口调用:', { prompt, model, images, aspectRatio, duration });
  
  // 根据模型选择对应的服务
  if (model === 'sora2') {
    return await generateSora2Video(prompt, model, images, aspectRatio, duration);
  } else if (model === 'veo_3_1-fast' || model === 'veo3' || model === 'veo3-fast') {
    // Veo3只支持8秒视频，忽略传入的duration参数
    return await generateVeo3Video(prompt, model, images, aspectRatio, 8);
  } else {
    // 默认使用Sora2
    console.warn(`未知的视频模型: ${model}，使用默认的Sora2服务`);
    return await generateSora2Video(prompt, 'sora2', images, aspectRatio, duration);
  }
};

/**
 * 统一文本生成接口
 * @param {string} prompt - 文本生成提示词
 * @returns {Promise<string>} 生成的文本
 */
export const generateText = async (prompt) => {
  return await generateGeminiText(prompt);
};

/**
 * 统一流式文本生成接口
 * @param {string} prompt - 文本生成提示词
 * @param {Function} onChunk - 处理流数据的回调函数
 * @returns {Promise<string>} 完整的生成文本
 */
export const generateStreamText = async (prompt, onChunk) => {
  return await generateGeminiStreamText(prompt, onChunk);
};

/**
 * 统一图像生成接口
 * @param {string} prompt - 图像生成提示词
 * @param {string} model - 模型名称
 * @param {string} ratio - 图像宽高比
 * @returns {Promise<string>} Base64编码的图像数据
 */
export const generateImage = async (prompt, model, ratio) => {
  return await generateGeminiImage(prompt, model, ratio);
};

/**
 * 统一参考图像编辑接口
 * @param {string} prompt - 图像编辑提示词
 * @param {string} refImage - 参考图像的Base64数据
 * @param {string} model - 模型名称
 * @param {string} ratio - 图像宽高比
 * @returns {Promise<string>} Base64编码的图像数据
 */
export const generateImageFromRef = async (prompt, refImage, model, ratio) => {
  return await generateGeminiImageFromRef(prompt, refImage, model, ratio);
};

/**
 * 统一语音合成接口
 * @param {string} text - 要转换的文本
 * @returns {Promise<string>} Base64编码的音频数据
 */
export const generateTts = async (text) => {
  return await generateSpeech(text);
};

/**
 * 统一剧本分析接口
 * @param {string} script - 剧本内容
 * @returns {Promise<Object>} 分析结果对象
 */
export const generateStructuredSynopsis = async (script) => {
  return await generateGeminiStructuredSynopsis(script);
};

/**
 * 统一歌曲生成接口
 * @param {string} lyrics - 歌词内容
 * @param {string} style - 歌曲风格
 * @param {string} model - 模型名称，默认为suno-v3
 * @returns {Promise<string>} Base64编码的音频数据
 */
export const generateTtsSong = async (lyrics, style = 'pop', model = 'suno-v3') => {
  console.log('统一歌曲生成接口调用:', { lyrics, style, model });
  return await generateSong(lyrics, style, model);
};

// 导出所有服务接口，方便直接使用
export {
  // 视频生成服务
  generateSora2Video,
  generateVeo3Video,
  
  // Gemini AI服务
  generateGeminiText,
  generateGeminiStreamText,
  generateGeminiImage,
  generateGeminiImageFromRef,
  generateGeminiStructuredSynopsis,
  
  // 语音合成服务
  generateSpeech,
  
  // 歌曲生成服务
  generateSong
};

export default {
  // 统一接口
  generateVideo,
  generateText,
  generateStreamText,
  generateImage,
  generateImageFromRef,
  generateTts,
  generateStructuredSynopsis,
  generateTtsSong,
  
  // 直接接口
  generateSora2Video,
  generateVeo3Video,
  generateGeminiText,
  generateGeminiStreamText,
  generateGeminiImage,
  generateGeminiImageFromRef,
  generateGeminiStructuredSynopsis,
  generateSpeech,
  generateSong
};