import apiClient from '../api/client';

// API 服务类
export class ApiService {
  // 生成文本
  static async generateText(prompt) {
    try { 
      const response = await apiClient.generateText(prompt); 
      return response; 
    } catch (e) { 
      return "Error: " + e.message; 
    } 
  }

  // 生成结构化剧本分析
  static async generateStructuredSynopsis(script) {
    try { 
      const result = await apiClient.generateStructuredSynopsis(script); 
      return result; 
    } catch (e) { 
      return { synopsis: `Error: ${e.message}`, characters: [], key_scenes: [] }; 
    } 
  }

  // 生成图片
  static async generateImage(prompt, ratio) {
    try { 
      const imageData = await apiClient.generateImage(prompt, ratio); 
      return imageData; 
    } catch (error) { 
      console.error("Image generation error:", error); 
      return null; 
    } 
  }

  // 基于参考图生成图片
  static async generateImageFromRef(prompt, refImg) {
    if (!refImg) return null; 
    try { 
      const imageData = await apiClient.generateImageFromRef(prompt, refImg); 
      return imageData; 
    } catch (error) { 
      console.error("Image editing error:", error); 
      return null; 
    } 
  }

  // 生成语音
  static async generateSpeech(text) {
    try { 
      const audioData = await apiClient.generateSpeech(text); 
      return audioData; 
    } catch (error) { 
      console.error("Speech generation error:", error); 
      return null; 
    } 
  }

  // 流式文本生成
  static async generateStreamText(prompt, onChunk) {
    try { 
      const response = await apiClient.generateStreamText(prompt, onChunk); 
      return response; 
    } catch (e) { 
      console.error('流式文本生成错误:', e);
      return '生成失败'; 
    } 
  }
}