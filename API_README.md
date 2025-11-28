# TopFlow API 集成文档

## 概述

本项目已集成第三方API服务（ai.jmyps.com）与Google Gemini API兼容的图像生成功能。

## API功能

### 1. 文本生成（流式API）
- 使用`generateText`函数
- 基于Google Gemini 2.5 Pro模型
- 端点：`/v1beta/models/gemini-2.5-pro:streamGenerateContent`
- 支持流式响应，实时接收生成的内容
- 请求结构：
  ```json
  {
    "systemInstruction": {
      "parts": [
        {
          "text": "你是一个专业的AI助手，能够根据用户的输入生成高质量的文本内容。"
        }
      ]
    },
    "contents": [
      {
        "role": "user",
        "parts": [
          {
            "text": "用户输入的文本"
          }
        ]
      }
    ],
    "generationConfig": {
      "temperature": 1,
      "topP": 1,
      "thinkingConfig": {
        "includeThoughts": true,
        "thinkingBudget": 26240
      }
    }
  }
  ```

### 2. 图像生成（兼容Google Gemini API）
- 使用`generateImage`函数
- 支持自定义宽高比（如4:3, 16:9等）
- 基于Google Gemini API规范实现
- 端点：`/v1beta/models/gemini-2.5-flash-image:generateContent`
- 请求结构：
  ```json
  {
    "contents": [
      {
        "parts": [
          {
            "text": "生成一张图片，描述：xxx，宽高比：4:3"
          }
        ]
      }
    ],
    "generationConfig": {
      "responseModalities": ["IMAGE"],
      "imageConfig": {
        "aspectRatio": "4:3"
      }
    }
  }
  ```
- 如果API无法生成真实图片，将返回占位图片

### 3. 图像编辑（兼容Google Gemini API）
- 使用`generateImageFromRef`函数
- 基于参考图片生成新图片
- 基于Google Gemini API规范实现
- 端点：`/v1beta/models/gemini-2.5-flash-image:generateContent`
- 支持Base64编码的输入图片
- 请求结构：
  ```json
  {
    "contents": [
      {
        "parts": [
          {
            "text": "根据参考图片生成新图片"
          },
          {
            "inline_data": {
              "mime_type": "image/jpeg",
              "data": "base64编码的图片数据"
            }
          }
        ]
      }
    ],
    "generationConfig": {
      "responseModalities": ["IMAGE"],
      "imageConfig": {
        "aspectRatio": "4:3"
      }
    }
  }
  ```

### 4. 语音合成
- 使用`generateSpeech`函数
- 将文本转换为语音
- 端点：`/v1/audio/speech`

### 5. 剧本分析（流式API）
- 使用`generateStructuredSynopsis`函数
- 分析剧本并提取概要、角色和关键场景
- 返回结构化JSON数据
- 端点：`/v1beta/models/gemini-2.5-pro:streamGenerateContent`
- 请求结构：
  ```json
  {
    "systemInstruction": {
      "parts": [
        {
          "text": "你是一个专业的剧本分析师，能够分析剧本并提取关键信息，以结构化JSON格式返回。"
        }
      ]
    },
    "contents": [
      {
        "role": "user",
        "parts": [
          {
            "text": "分析剧本的提示词..."
          }
        ]
      }
    ],
    "generationConfig": {
      "temperature": 0.3,
      "topP": 1
    }
  }
  ```

## API响应处理

### 图像生成响应
- 优先返回Base64编码的真实图片
- 如果API无法生成图片，返回占位图片URL
- 占位图片格式：`https://placehold.co/widthxheight/color/background?text=description`

### 图像编辑响应
- 优先返回编辑后的图片
- 如果编辑失败，返回原始参考图片

## 测试功能

项目包含一个内置的API测试界面，可以通过以下方式访问：
1. 启动开发服务器：`npm run dev`
2. 点击左侧边栏的"测试"按钮
3. 测试各种API功能

## 错误处理

所有API调用都包含错误处理机制：
- 自动重试（最多3次，指数退避）
- 详细的错误日志记录
- 优雅的降级处理（如图片生成失败时使用占位图片）

## 使用示例

### 生成图像
```javascript
import { generateImage } from './api/client';

const imageUrl = await generateImage('一个可爱的机器人在赛博朋克城市的街道上行走', '16:9');
```

### 编辑图像
```javascript
import { generateImageFromRef } from './api/client';

const editedImageUrl = await generateImageFromRef('在机器人旁边添加一只猫', referenceImageUrl);
```

## API Key 配置

项目支持两种API Key配置方式：

### 1. 手动配置
用户可以手动输入API Key：
1. 点击界面左下角的"API Key"按钮
2. 在弹出的对话框中输入您的API Key
3. 点击"保存 Key"按钮

### 2. 自动获取（推荐）
项目支持从第三方服务自动获取API Key：
1. 点击界面左下角的"API Key"按钮
2. 在弹出的对话框中点击"获取Key"按钮
3. 系统将自动从 `ai.jmyps.com/api/key` 获取最新的API Key
4. 点击"保存 Key"按钮保存

系统会在每次API请求时自动获取和使用最新的API Key，无需手动更新。

### 3. 浏览器缓存存储
所有API Key都会保存在浏览器的localStorage中，具有以下特点：
- 自动保存：每次设置API Key都会自动保存到浏览器缓存
- 自动加载：页面刷新后会自动从缓存加载之前保存的API Key
- 自动清除：清除API Key时会同时从缓存中移除
- 优先使用：系统会优先使用缓存中的API Key，如果没有才会从服务器获取

这样设计的优点是：
- 减少API Key获取的网络请求
- 提高应用响应速度
- 保证用户设置的API Key持久性

## 注意事项

1. 推荐使用"获取Key"功能，确保使用最新的API Key
2. 如果手动输入API Key，请确保其有效性和权限
3. 图像生成可能需要几秒钟时间
4. 大量使用API可能会受到速率限制
5. 占位图片仅用于演示目的，不代表真实的AI生成结果

## Google Gemini API兼容性

本项目中的图像生成和编辑功能遵循Google Gemini API的规范：

- 使用相同的请求结构
- 支持相同的参数（如宽高比）
- 处理相同的响应格式
- 兼容相同的错误处理模式

参考文档：https://ai.google.dev/gemini-api/docs/image-generation?hl=zh-cn#gemini-image-editing

## 流式API说明

本项目中的文本生成和剧本分析功能使用了Google Gemini的流式API，具有以下特点：

### 优势
1. **实时响应**：内容以流的形式逐步返回，用户可以更快看到生成的内容
2. **性能提升**：不需要等待整个响应完成，减少等待时间
3. **更好的用户体验**：对于长文本生成，用户可以实时看到进度

### 技术实现
- 使用Server-Sent Events (SSE)格式解析流数据
- 自动处理数据片段，拼接成完整文本
- 支持实时回调函数，可扩展为实时显示

### 数据格式
流式API返回的是多个JSON对象，可能包含两种类型的内容：
1. 思考过程 (thought: true)：
```
data: {"candidates":[{"content":{"parts":[{"thought": true, "text":"AI的思考过程"}]}]}
```

2. 实际生成的文本：
```
data: {"candidates":[{"content":{"parts":[{"text":"生成的文本内容"}]}]}
data: [DONE]
```

### 特殊处理
系统会自动识别并处理这两种内容类型：
- 思考过程只记录到控制台，不作为生成结果
- 实际生成的文本会累积并返回给用户
- 支持混合流（思考过程和实际内容交替出现）

### 错误处理
- 自动重试机制（最多3次，指数退避）
- 详细的错误日志记录
- 优雅的降级处理（返回错误信息而非崩溃）

这种实现方式使得AI文本生成功能更加高效和用户友好。