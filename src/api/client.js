// API客户端模块，整合所有服务接口
import {
  generateVideo,
  generateText,
  generateStreamText,
  generateImage,
  generateImageFromRef,
  generateTextWithImage,
  generateTts as generateSpeech,
  generateStructuredSynopsis,
  generateTtsSong as generateSong
} from './services.js';

// 重新导出所有接口，保持向后兼容性
export {
  generateVideo,
  generateText,
  generateStreamText,
  generateImage,
  generateImageFromRef,
  generateTextWithImage,
  generateSpeech,
  generateStructuredSynopsis,
  generateSong
};

// 导出默认对象，保持向后兼容性
export default {
  generateVideo,
  generateText,
  generateStreamText,
  generateImage,
  generateImageFromRef,
  generateTextWithImage,
  generateSpeech,
  generateStructuredSynopsis,
  generateSong
};