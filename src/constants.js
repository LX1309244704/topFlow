// 节点宽度配置
export const NODE_WIDTHS = {
  image: 320,
  video: 320,
  audio: 280,
  text: 320
};

// 节点高度计算
export const getNodeHeight = (node) => {
  if (node.type === 'text') return node.data.height || 200;
  if (node.type === 'audio') return 140;
  const width = NODE_WIDTHS[node.type];
  const ratio = node.data.aspectRatio || (node.type === 'video' ? 16/9 : 4/3);
  return (width / ratio) + 130;
};

// 获取连接手柄位置
export const getHandlePosition = (nodeId, handleType, nodes) => {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return { x: 0, y: 0 };
  const width = NODE_WIDTHS[node.type];
  let handleY = 80;
  if (node.type === 'image' || node.type === 'video') {
    const ratio = node.data.aspectRatio || (node.type === 'video' ? 16/9 : 4/3);
    handleY = (width / ratio) / 2;
  } else if (node.type === 'audio') {
    handleY = 48;
  } else if (node.type === 'text') {
    handleY = (node.data.height || 200) / 2;
  }
  return { 
    x: handleType === 'source' ? node.x + width + 12 : node.x - 12, 
    y: node.y + handleY 
  };
};

// 文件下载工具
export const downloadFile = (url, filename) => {
  if (!url) return;
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// API Key 配置
export const API_KEY = "";

// 数据库配置
export const DB_CONFIG = {
  NAME: 'TapNowCloneDB',
  STORE_NAME: 'projects',
  PROJECT_KEY: 'currentProject'
};

// 布局常量
export const LAYOUT_CONSTANTS = {
  GRID_WIDTH: 350,
  START_X: 100,
  START_Y: 100,
  MAX_PER_ROW: Infinity, // 取消每行节点数量限制
  LEVEL_MARGIN: 150,
  VERTICAL_SPACING: 50
};