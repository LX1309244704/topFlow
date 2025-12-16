import { LAYOUT_CONSTANTS, NODE_WIDTHS } from '../constants.js';
import { getNodeHeight } from '../constants.js';

// 自动布局算法
export const performAutoLayout = (nodes, edges) => {
  if (!nodes.length) return nodes;
  const newNodes = [...nodes];
  const { START_X, START_Y, MAGNETIC_GAP } = LAYOUT_CONSTANTS;
  const idIndex = new Map();
  newNodes.forEach((n, i) => idIndex.set(n.id, i));
  const childrenMap = {};
  const inDegree = {};
  newNodes.forEach(n => { childrenMap[n.id] = []; inDegree[n.id] = 0; });
  edges.forEach(e => { if (childrenMap[e.source]) childrenMap[e.source].push(e.target); if (inDegree[e.target] !== undefined) inDegree[e.target]++; });
  const roots = newNodes.filter(n => inDegree[n.id] === 0);
  let xCursor = START_X;
  const yBase = START_Y;
  const placed = new Set();
  roots.forEach(root => {
    const ri = idIndex.get(root.id);
    const rw = NODE_WIDTHS[newNodes[ri].type] || 320;
    newNodes[ri].x = xCursor;
    newNodes[ri].y = yBase;
    xCursor += rw + MAGNETIC_GAP;
    placed.add(root.id);
  });
  const queue = [...roots.map(r => r.id)];
  const placeChain = (pid) => {
    const pi = idIndex.get(pid);
    if (pi === undefined) return;
    const parent = newNodes[pi];
    const ph = getNodeHeight(parent);
    let yNext = parent.y + ph;
    const kids = childrenMap[pid] || [];
    kids.forEach(cid => {
      const ci = idIndex.get(cid);
      if (ci === undefined) return;
      const child = newNodes[ci];
      const ch = getNodeHeight(child);
      child.x = parent.x;
      child.y = yNext;
      yNext += ch; // VERTICAL_SPACING 为 0，实现贴合
      if (!placed.has(cid)) {
        placed.add(cid);
        placeChain(cid);
      }
    });
  };
  while (queue.length > 0) {
    const pid = queue.shift();
    placeChain(pid);
  }
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
