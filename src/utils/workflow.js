import { LAYOUT_CONSTANTS, NODE_WIDTHS } from '../constants.js';
import { getNodeHeight } from '../constants.js';

// 自动布局算法
export const performAutoLayout = (nodes, edges) => {
  if (!nodes.length) return nodes;
  
  const adjacency = {};
  const inDegree = {};
  
  // 构建邻接表和入度表
  nodes.forEach(n => { 
    adjacency[n.id] = []; 
    inDegree[n.id] = 0; 
  });
  
  edges.forEach(e => {
    if (adjacency[e.source]) adjacency[e.source].push(e.target);
    if (inDegree[e.target] !== undefined) inDegree[e.target]++;
  });

  // 拓扑排序分层
  const levels = [];
  const queue = nodes.filter(n => inDegree[n.id] === 0).map(n => ({ id: n.id, level: 0 }));
  
  if (queue.length === 0 && nodes.length > 0) {
    queue.push({ id: nodes[0].id, level: 0 });
  }
  
  const visited = new Set();
  
  while (queue.length > 0) {
    const { id, level } = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    
    if (!levels[level]) levels[level] = [];
    levels[level].push(id);
    
    if (adjacency[id]) {
      adjacency[id].forEach(targetId => { 
        if (!visited.has(targetId)) {
          queue.push({ id: targetId, level: level + 1 }); 
        }
      });
    }
  }
  
  // 处理未访问的节点
  nodes.forEach(n => { 
    if (!visited.has(n.id)) { 
      if (!levels[0]) levels[0] = []; 
      levels[0].push(n.id); 
      visited.add(n.id); 
    } 
  });

  // 布局计算
  const newNodes = [...nodes];
  const { GRID_W, START_X, START_Y, MAX_PER_ROW, LEVEL_MARGIN, VERTICAL_SPACING } = LAYOUT_CONSTANTS;
  
  let currentLevelX = START_X;
  
  levels.forEach((levelNodes) => {
    if (!levelNodes || !levelNodes.length) return;
    
    const columnYPositions = {}; 
    let maxCols = 0;
    
    levelNodes.forEach((nodeId, index) => {
      const nodeIndex = newNodes.findIndex(n => n.id === nodeId);
      if (nodeIndex === -1) return;
      
      const node = newNodes[nodeIndex];
      const nodeHeight = getNodeHeight(node); 
      const col = index % MAX_PER_ROW;
      maxCols = Math.max(maxCols, col + 1);
      const currentY = columnYPositions[col] || START_Y;
      
      node.x = currentLevelX + col * GRID_W;
      node.y = currentY;
      columnYPositions[col] = currentY + nodeHeight + VERTICAL_SPACING;
    });
    
    currentLevelX = currentLevelX + (maxCols * GRID_W) + LEVEL_MARGIN; 
  });
  
  return newNodes;
};

// 批量生成节点
export const createBatchNodes = (sourceNode, count, nodes, edges) => {
  const ratioStr = sourceNode.data.ratio || (sourceNode.type === 'video' ? "16:9" : "4:3");
  const [w, h] = ratioStr.split(':').map(Number);
  const targetAspectRatio = w / h;
  
  // 在源节点右侧紧凑排列新节点
  const startX = sourceNode.x + NODE_WIDTHS[sourceNode.type] + 50;
  const startY = sourceNode.y;
  const nodeSpacing = 20; // 节点间距
  
  const newNodes = [];
  const newEdges = [];
  
  for (let i = 0; i < count; i++) {
    const nid = Date.now() + i;
    
    // 计算紧凑排列的位置
    const col = i % 3; // 每行最多3个
    const row = Math.floor(i / 3);
    
    const x = startX + col * (NODE_WIDTHS[sourceNode.type] + nodeSpacing);
    const y = startY + row * (getNodeHeight(sourceNode) + nodeSpacing);
    
    newNodes.push({
      id: nid, 
      type: sourceNode.type, 
      x: x, 
      y: y, 
      data: { 
        prompt: sourceNode.data.prompt || "", 
        ratio: ratioStr, 
        aspectRatio: targetAspectRatio, 
        isGenerating: true, 
        generatedImage: null, 
        batchSize: 1, 
        model: sourceNode.data.model 
      } 
    });
    
    newEdges.push({ 
      id: `edge-${sourceNode.id}-${nid}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`, 
      source: sourceNode.id, 
      target: nid 
    });
  }
  
  return { newNodes, newEdges, targetAspectRatio };
};

// 数据库操作工具
export const createDBHelpers = (DB_NAME, STORE_NAME, PROJECT_KEY) => {
  const openDB = () => new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = e => resolve(e.target.result);
    request.onerror = e => reject(e.target.error);
  });

  const loadFromDB = async () => {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const request = transaction.objectStore(STORE_NAME).get(PROJECT_KEY);
        request.onsuccess = e => resolve(e.target.result);
        request.onerror = e => reject(e.target.error);
      });
    } catch {
      return null;
    }
  };

  const saveToDB = async (data) => {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const request = transaction.objectStore(STORE_NAME).put(
          JSON.parse(JSON.stringify(data)), 
          PROJECT_KEY
        );
        request.onsuccess = resolve;
        request.onerror = e => reject(e.target.error);
      });
    } catch (e) {
      console.error(e);
    }
  };

  return { openDB, loadFromDB, saveToDB };
};