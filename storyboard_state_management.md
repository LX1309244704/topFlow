# 🎬 分镜状态管理优化

## 🎯 问题描述
点击分镜按钮后，源节点不应该进入生成状态，而是保持图片显示。需要通过全局状态管理分镜生成进度，等待所有分镜图片生成完成后才恢复。

## ✨ 解决方案

### 1. 全局状态管理
```javascript
// App.jsx 中添加全局分镜状态
const [storyboardGenerating, setStoryboardGeneratingState] = useState(false);
const [storyboardSourceNodeId, setStoryboardSourceNodeId] = useState(null);

// 暴露到全局
window.topFlow = {
  createStoryboardNodes,
  createGridNodes,
  setStoryboardGenerating: setStoryboardGeneratingState,
  isStoryboardGenerating: () => storyboardGenerating,
  getStoryboardSourceNode: () => storyboardSourceNodeId
};
```

### 2. 源节点状态管理
**之前**：源节点进入生成状态，图片被隐藏
```javascript
updateNode(node.id, { data: { ...node.data, isGenerating: true } });
```

**现在**：源节点保持显示，设置全局分镜状态
```javascript
// 不修改源节点状态
if (window.topFlow && window.topFlow.setStoryboardGenerating) {
  window.topFlow.setStoryboardGenerating(true, node.id);
}
```

### 3. UI状态显示
**分镜生成中的源节点**：
```javascript
{isStoryboardSource && isStoryboardGenerating ? (
  <div className="absolute inset-0 flex flex-col items-center justify-center bg-purple-50/50 backdrop-blur-sm">
    <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-2" />
    <span className="text-xs text-purple-600 font-bold animate-pulse">生成分镜中...</span>
  </div>
) : (
  // 正常显示图片内容
)}
```

### 4. 生成完成后的状态重置
```javascript
// 所有分镜生成完成后重置全局状态
console.log(`分镜生成完成: ${successCount} 成功, ${failureCount} 失败`);
setStoryboardGeneratingState(false);
setStoryboardSourceNodeId(null);
```

## 🔄 完整工作流程

### 用户操作流程：
1. **选择图片节点** → 源节点显示正常图片
2. **点击分镜按钮** → 源节点显示"生成分镜中..."状态
3. **创建分镜节点** → 4个新节点进入生成状态
4. **并发生成图片** → 分镜节点逐个完成生成
5. **生成完成** → 源节点恢复正常，分镜节点显示图片

### 状态转换图：
```
源节点状态：
正常显示 → 生成分镜中 → 正常显示
     ↑           ↓           ↑
   点击按钮   生成完成后   状态重置

分镜节点状态：
创建时(isGenerating: true) → 生成中(加载动画) → 完成后(isGenerating: false, 显示图片)
```

## 🎨 用户体验改进

### 视觉反馈：
- ✅ **源节点保持可见**：参考图片始终显示，不会被隐藏
- ✅ **分镜状态指示**：紫色主题表示分镜生成中
- ✅ **进度可视化**：可以直观看到哪些节点在生成
- ✅ **状态区分**：普通生成(蓝色) vs 分镜生成(紫色)

### 操作逻辑：
- ✅ **非阻塞**：源节点不会被遮挡，用户仍可查看参考图片
- ✅ **状态一致**：全局状态管理确保UI状态同步
- ✅ **错误处理**：生成失败时正确重置状态
- ✅ **性能优化**：并发生成，提高效率

## 🛠 技术实现细节

### 状态管理API：
```javascript
// 设置分镜生成状态
window.topFlow.setStoryboardGenerating(isGenerating, sourceNodeId);

// 检查是否在分镜生成中
window.topFlow.isStoryboardGenerating();

// 获取分镜源节点ID
window.topFlow.getStoryboardSourceNode();
```

### UI组件状态判断：
```javascript
const isStoryboardGenerating = window.topFlow && window.topFlow.isStoryboardGenerating && window.topFlow.isStoryboardGenerating();
const isStoryboardSource = window.topFlow && window.topFlow.getStoryboardSourceNode && window.topFlow.getStoryboardSourceNode() === node.id;
```

### 生成统计和日志：
```javascript
let successCount = 0;
let failureCount = 0;

// 生成完成后输出统计
console.log(`分镜生成完成: ${successCount} 成功, ${failureCount} 失败`);
```

## 📋 使用场景

### 场景1：正常分镜生成
1. 用户输入提示词，生成参考图片
2. 点击"分镜"按钮
3. 源节点显示紫色"生成分镜中..."
4. 4个分镜节点同时创建并开始生成
5. 分镜节点逐个完成，显示生成的图片
6. 源节点恢复到正常显示状态

### 场景2：无参考图片的分镜生成
1. 用户只输入提示词，没有生成参考图片
2. 点击"分镜"按钮
3. 源节点显示紫色"生成分镜中..."
4. 4个分镜节点使用提示词生成图片
5. 生成完成后恢复正常

### 场景3：生成错误处理
1. 分镜生成过程中某个节点失败
2. 该节点重置生成状态，显示为空
3. 其他节点继续生成
4. 全部完成后源节点恢复正常
5. 用户可以手动重新生成失败的分镜

## 🎯 实现效果

现在分镜生成功能具有：
- 🔄 **清晰的状态管理**：全局状态控制，避免状态冲突
- 🎨 **优雅的UI反馈**：紫色主题区分分镜生成状态
- 📊 **完整的进度跟踪**：成功/失败统计，便于调试
- 🚀 **高性能并发生成**：多个分镜同时生成，提高效率
- 🛡️ **强大的错误处理**：单点失败不影响整体流程

这大大提升了分镜生成的用户体验和系统稳定性！