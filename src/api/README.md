# API 服务组件化架构

本项目的API服务已经按照不同服务类型进行了组件化分离，方便维护和扩展。

## 服务结构

```
src/api/
├── README.md                 # 本文档
├── client.js                 # 统一API客户端接口（向后兼容）
├── services.js               # 统一服务接口层
├── sora2Service.js           # Sora2视频生成服务
├── veo3Service.js            # Veo3视频生成服务
├── geminiService.js          # Gemini AI服务（文本、图像、剧本分析）
└── ttsService.js             # 语音合成服务
```

## 各服务说明

### 1. Sora2视频生成服务 (sora2Service.js)

负责处理Sora2模型的视频生成请求，包括：
- 视频任务创建
- 任务状态轮询
- 视频结果获取

主要接口：
```javascript
import { generateSora2Video } from './api/sora2Service.js';

const videoUrl = await generateSora2Video(
  prompt,        // 视频生成提示词
  model,         // 模型名称，默认为sora2
  images,        // 参考图片数组
  aspectRatio,   // 视频宽高比，默认为16:9
  duration       // 视频时长，默认为10秒
);
```

### 2. Veo3视频生成服务 (veo3Service.js)

负责处理Veo3模型的视频生成请求，包括：
- 视频任务创建
- 任务状态轮询
- 视频结果获取

注意：Veo3仅支持8秒视频时长，会自动忽略传入的duration参数。

主要接口：
```javascript
import { generateVeo3Video } from './api/veo3Service.js';

const videoUrl = await generateVeo3Video(
  prompt,        // 视频生成提示词
  model,         // 模型名称，默认为veo_3_1-fast
  images,        // 参考图片数组
  aspectRatio,   // 视频宽高比，默认为16:9
  duration       // 视频时长（固定为8秒）
);
```

### 3. Gemini AI服务 (geminiService.js)

负责处理Google Gemini相关的AI请求，包括：
- 文本生成
- 流式文本生成
- 图像生成
- 基于参考图像的图像编辑
- 剧本分析

主要接口：
```javascript
import {
  generateGeminiText,
  generateGeminiStreamText,
  generateGeminiImage,
  generateGeminiImageFromRef,
  generateGeminiStructuredSynopsis
} from './api/geminiService.js';

// 文本生成
const text = await generateGeminiText(prompt);

// 流式文本生成
const fullText = await generateGeminiStreamText(prompt, onChunk);

// 图像生成
const imageData = await generateGeminiImage(prompt, model, ratio);

// 基于参考图像的图像编辑
const editedImageData = await generateGeminiImageFromRef(prompt, refImage, model, ratio);

// 剧本分析
const analysis = await generateGeminiStructuredSynopsis(script);
```

### 4. 语音合成服务 (ttsService.js)

负责处理文本转语音的请求，包括：
- 语音合成

主要接口：
```javascript
import { generateSpeech } from './api/ttsService.js';

const audioData = await generateSpeech(
  text,           // 要转换的文本
  model,          // TTS模型，默认为tts-1
  voice,          // 语音类型，默认为alloy
  responseFormat  // 响应格式，默认为base64
);
```

## 统一服务接口 (services.js)

提供一个统一的接口层，根据不同的需求自动选择对应的服务：

```javascript
import {
  generateVideo,              // 根据模型自动选择Sora2或Veo3
  generateText,              // 调用Gemini文本生成
  generateStreamText,         // 调用Gemini流式文本生成
  generateImage,              // 调用Gemini图像生成
  generateImageFromRef,       // 调用Gemini图像编辑
  generateTts,                // 调用语音合成
  generateStructuredSynopsis   // 调用Gemini剧本分析
} from './api/services.js';

// 统一视频生成接口，根据模型自动选择服务
const videoUrl = await generateVideo(
  prompt,
  model,      // 支持sora2和veo_3_1-fast
  images,
  aspectRatio,
  duration
);
```

## 向后兼容性

为了保持现有代码的兼容性，保留了原始的client.js文件作为统一入口：

```javascript
import {
  generateVideo,
  generateText,
  generateStreamText,
  generateImage,
  generateImageFromRef,
  generateSpeech,
  generateStructuredSynopsis
} from './api/client.js';
```

## 如何添加新服务

1. 在src/api目录下创建新的服务文件，如`newService.js`
2. 实现对应的服务接口函数
3. 在services.js中导入并导出新服务的接口
4. 如需要，添加统一接口函数

## 如何删除现有服务

1. 在services.js中删除对应服务的导入和导出
2. 删除对应的服务文件
3. 更新client.js中的导出（如需要）

## 注意事项

1. 所有服务都有独立的API Key获取逻辑，但实际使用中会共享localStorage中的API Key
2. 每个服务都有自己的错误处理和日志记录
3. 可以根据需要独立扩展或替换任何服务，而不影响其他服务
4. 保留了原始的client.js文件，确保现有代码不会因重构而中断