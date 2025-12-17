import React, { useState, useEffect, useMemo } from 'react';
import { ProjectCard } from './ProjectCard';
import { 
  FolderKanban, Play, Image as ImageIcon, Sparkles, Type, Video, Music, 
  Layers, Clock, Square, Sliders, Download 
} from 'lucide-react';
import { NodeSelect } from './UI';

// Define options constants locally to avoid circular dependencies or complex imports
const TEXT_MODEL_OPTIONS = [
  { value: "gemini-2.5", label: "Gemini 2.5 (标准)" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro (增强)" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet" }
];

const IMAGE_MODEL_OPTIONS = [
  { value: "nano-banana", label: "Nano Banana" },
  { value: "nano-banana-pro", label: "Nano Banana Pro" },
];

const VIDEO_MODEL_OPTIONS = [
  { value: "sora2", label: "Sora 2.0" }, 
  { value: "veo_3_1-fast", label: "veo_3_1-fast" }
];

const RATIO_OPTIONS = [
  {value:"16:9",label:"16:9"}, 
  {value:"9:16",label:"9:16"}, 
  {value:"1:1",label:"1:1"}, 
  {value:"4:3",label:"4:3"}, 
  {value:"3:4",label:"3:4"}
];

const VOICE_OPTIONS = [
  { value: "alloy", label: "Alloy (中性)" },
  { value: "echo", label: "Echo (男声)" },
  { value: "fable", label: "Fable (英式)" },
  { value: "onyx", label: "Onyx (深沉男声)" },
  { value: "nova", label: "Nova (女声)" },
  { value: "shimmer", label: "Shimmer (柔和女声)" }
];

const STYLE_OPTIONS = [
  { value: "pop", label: "流行音乐" },
  { value: "rock", label: "摇滚" },
  { value: "jazz", label: "爵士" },
  { value: "classical", label: "古典" },
  { value: "electronic", label: "电子" },
  { value: "folk", label: "民谣" },
  { value: "country", label: "乡村" },
  { value: "hip-hop", label: "嘻哈" }
];

// Professional Mode Constants
const CAMERA_OPTIONS = ["水平", "俯视", "仰视", "航拍", "侧视"];
const SHOT_OPTIONS = ["大远景", "远景", "全景", "中景", "特写", "大特写"];
const MOVEMENT_OPTIONS = ["固定", "推镜头", "拉镜头", "摇镜头", "跟随", "环绕"];

const PRO_MODE_PROMPTS = {
  // 机位 (Camera Angles)
  "水平": "eye level shot",
  "俯视": "high angle shot, overhead view",
  "仰视": "low angle shot, looking up",
  "航拍": "aerial view, drone shot",
  "侧视": "side view, profile shot",
  
  // 景别 (Shot Sizes)
  "大远景": "extreme long shot, vast scene",
  "远景": "long shot, wide view",
  "全景": "full shot, wide angle",
  "中景": "medium shot, waist up",
  "特写": "close-up shot, detailed",
  "大特写": "extreme close-up, macro details",
  
  // 分镜 (Movement)
  "固定": "static camera, still shot",
  "推镜头": "dolly in, camera pushing in",
  "拉镜头": "dolly out, camera pulling back",
  "摇镜头": "pan shot, camera panning",
  "跟随": "tracking shot, following subject",
  "环绕": "orbit shot, camera circling"
};

export const ProductionMode = ({ projects, onRunProject, apiFunctions }) => {
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [modifiedNodes, setModifiedNodes] = useState([]);
  const [generatedWorks, setGeneratedWorks] = useState([]); // Placeholder for now
  const [generateCount, setGenerateCount] = useState(1); // Default generate count

  const selectedProject = useMemo(() => 
    projects.find(p => p.id === selectedProjectId), 
  [projects, selectedProjectId]);

  // Sync and Sort modifiedNodes when project is selected
  useEffect(() => {
    if (selectedProject && selectedProject.nodes) {
      // Build graph for topological sort
      const nodesById = new Map(selectedProject.nodes.map(n => [n.id, n]));
      const inDegree = new Map(selectedProject.nodes.map(n => [n.id, 0]));
      const adj = new Map(selectedProject.nodes.map(n => [n.id, []]));

      if (selectedProject.edges) {
        selectedProject.edges.forEach(edge => {
          if (nodesById.has(edge.source) && nodesById.has(edge.target)) {
            adj.get(edge.source).push(edge.target);
            inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
          }
        });
      }

      // Initial queue: nodes with in-degree 0
      const queue = selectedProject.nodes.filter(n => inDegree.get(n.id) === 0);
      // Sort initial queue by position (Y then X) to maintain visual flow for independent start nodes
      queue.sort((a, b) => {
        const diffY = a.y - b.y;
        if (Math.abs(diffY) > 50) return diffY;
        return a.x - b.x;
      });

      const sortedNodes = [];
      const visited = new Set();

      while (queue.length > 0) {
        const node = queue.shift();
        if (visited.has(node.id)) continue;
        visited.add(node.id);
        sortedNodes.push(node);

        const neighbors = adj.get(node.id);
        const nextBatch = [];
        
        neighbors.forEach(targetId => {
          inDegree.set(targetId, inDegree.get(targetId) - 1);
          if (inDegree.get(targetId) === 0) {
            const targetNode = nodesById.get(targetId);
            if (targetNode) nextBatch.push(targetNode);
          }
        });
        
        // Sort neighbors by position before adding to queue
        nextBatch.sort((a, b) => {
          const diffY = a.y - b.y;
          if (Math.abs(diffY) > 50) return diffY;
          return a.x - b.x;
        });

        queue.push(...nextBatch);
      }

      // Handle any remaining nodes (cycles or disconnected parts not reached)
      const remaining = selectedProject.nodes.filter(n => !visited.has(n.id));
      remaining.sort((a, b) => {
        const diffY = a.y - b.y;
        if (Math.abs(diffY) > 50) return diffY;
        return a.x - b.x;
      });
      
      setModifiedNodes([...sortedNodes, ...remaining]);
    } else {
      setModifiedNodes([]);
    }
  }, [selectedProject]);

  // Set default placeholder generated works
  useEffect(() => {
    if (selectedProject) {
      setGeneratedWorks([
        { id: 1, title: '作品 1', type: 'video', status: 'completed' },
        { id: 2, title: '作品 2', type: 'video', status: 'completed' },
        { id: 3, title: '作品 3', type: 'video', status: 'completed' },
        { id: 4, title: '作品 4', type: 'video', status: 'completed' },
      ]);
    } else {
      setGeneratedWorks([]);
    }
  }, [selectedProject]);

  const handleNodeUpdate = (nodeId, updates) => {
    setModifiedNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, data: { ...node.data, ...updates } } : node
    ));
  };

  // Handle Pro Mode selection logic (Video Nodes)
  const handleProModeSelection = (node, category, newValue) => {
    const currentData = node.data;
    const oldValue = currentData[category];
    const isDeselecting = oldValue === newValue;
    const finalValue = isDeselecting ? null : newValue;
    
    // Calculate new prompt
    let prompt = currentData.prompt || '';
    
    // Remove old prompt text if it exists
    if (oldValue && PRO_MODE_PROMPTS[oldValue]) {
      const textToRemove = PRO_MODE_PROMPTS[oldValue];
      if (prompt.includes(textToRemove)) {
        prompt = prompt.replace(textToRemove, '');
      }
    }
    
    // Add new prompt text
    if (finalValue && PRO_MODE_PROMPTS[finalValue]) {
      const textToAdd = PRO_MODE_PROMPTS[finalValue];
      if (!prompt.includes(textToAdd)) {
        prompt = prompt ? `${prompt}, ${textToAdd}` : textToAdd;
      }
    }
    
    // Clean up commas and spaces
    prompt = prompt.replace(/,\s*,/g, ',') // Replace double commas
                   .replace(/^,\s*/, '')   // Remove leading comma
                   .replace(/,\s*$/, '')   // Remove trailing comma
                   .trim();
    
    handleNodeUpdate(node.id, {
      [category]: finalValue,
      prompt: prompt
    });
  };

  const handleRun = () => {
    if (selectedProject && onRunProject) {
      // Pass the modified project data and count
      const projectToRun = {
        ...selectedProject,
        nodes: modifiedNodes,
        generateCount: generateCount
      };
      onRunProject(projectToRun);

      // Simulate generation results locally for UI demonstration
      // In a real app, this would be updated via a callback or subscription to generation status
      setGeneratedWorks([
        { id: 1, title: '生成作品 1', type: 'video', status: 'completed' },
        { id: 2, title: '生成作品 2', type: 'video', status: 'completed' },
        { id: 3, title: '生成作品 3', type: 'video', status: 'completed' },
        { id: 4, title: '生成作品 4', type: 'video', status: 'completed' },
      ]);
    }
  };

  const handleDownloadAll = () => {
    if (generatedWorks.length === 0) return;
    
    // Simulate downloading all works
    // In a real app, this would trigger batch download or zip file generation
    alert(`开始下载 ${generatedWorks.length} 个作品...`);
    console.log("Downloading works:", generatedWorks);
  };

  // Helper to get duration options based on model
  const getDurationOptions = (model) => {
    if (model === "veo_3_1-fast") return [{ value: 8, label: "8s" }];
    return [{ value: 10, label: "10s" }, { value: 15, label: "15s" }];
  };

  const renderNodeConfig = (node) => {
    const { type, id, data } = node;
    const commonClasses = "bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300";
    
    // Header for each node card
    const header = (
      <div className="flex items-center gap-2 pb-2 border-b border-zinc-800 mb-1">
        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
          type === 'text' ? 'bg-zinc-800 text-zinc-400' :
          type === 'image' ? 'bg-blue-900/20 text-blue-400' :
          type === 'video' ? 'bg-purple-900/20 text-purple-400' :
          'bg-orange-900/20 text-orange-400'
        }`}>
          {type === 'text' && <Type size={14} />}
          {type === 'image' && <ImageIcon size={14} />}
          {type === 'video' && <Video size={14} />}
          {type === 'audio' && <Music size={14} />}
        </div>
        <span className="text-sm font-medium text-zinc-300">
          {type === 'text' ? '文本内容' : 
           type === 'image' ? '图片生成' : 
           type === 'video' ? '视频生成' : '音频生成'} 
          <span className="text-zinc-600 text-xs ml-2">#{id}</span>
        </span>
      </div>
    );

    switch (type) {
      case 'text':
        return (
          <div key={id} className={commonClasses}>
            {header}
            <div className="space-y-3">
               <div>
                 <label className="text-xs text-zinc-500 mb-1.5 block">模型</label>
                 <NodeSelect 
                    value={data.model || "gemini-2.5"}
                    options={TEXT_MODEL_OPTIONS}
                    onChange={(v) => handleNodeUpdate(id, { model: v })}
                 />
               </div>
               <div className="flex-1">
                 <label className="text-xs text-zinc-500 mb-1.5 block">内容</label>
                 <textarea
                   value={data.text || ''}
                   onChange={(e) => handleNodeUpdate(id, { text: e.target.value })}
                   className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:ring-1 focus:ring-zinc-600 outline-none resize-none"
                   rows={6}
                   placeholder="输入文本内容..."
                 />
               </div>
            </div>
          </div>
        );
      case 'image':
        return (
          <div key={id} className={commonClasses}>
            {header}
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-zinc-500 mb-1.5 block">模型</label>
                  <NodeSelect 
                    value={data.model || "nano-banana"}
                    options={IMAGE_MODEL_OPTIONS}
                    onChange={(v) => handleNodeUpdate(id, { model: v })}
                  />
                </div>
                <div className="w-24">
                  <label className="text-xs text-zinc-500 mb-1.5 block">比例</label>
                  <NodeSelect 
                    value={data.ratio || "4:3"}
                    options={RATIO_OPTIONS}
                    icon={Square}
                    onChange={(v) => {
                      const [w, h] = v.split(':').map(Number);
                      handleNodeUpdate(id, { ratio: v, aspectRatio: w/h });
                    }}
                  />
                </div>
                <div className="w-20">
                  <label className="text-xs text-zinc-500 mb-1.5 block">数量</label>
                  <NodeSelect 
                    value={data.batchSize || 1}
                    options={[{value:1,label:"1x"}, {value:2,label:"2x"}, {value:4,label:"4x"}]}
                    icon={Layers}
                    onChange={(v) => handleNodeUpdate(id, { batchSize: parseInt(v) })}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">提示词</label>
                <textarea
                  value={data.prompt || ''}
                  onChange={(e) => handleNodeUpdate(id, { prompt: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:ring-1 focus:ring-zinc-600 outline-none resize-none"
                  rows={4}
                  placeholder="输入图片提示词..."
                />
              </div>
            </div>
          </div>
        );
      case 'video':
        return (
          <div key={id} className={commonClasses}>
            {header}
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                   <label className="text-xs text-zinc-500 mb-1.5 block">模型</label>
                   <NodeSelect 
                      value={data.model || "sora2"}
                      options={VIDEO_MODEL_OPTIONS}
                      onChange={(v) => handleNodeUpdate(id, { model: v })}
                   />
                </div>
                <div className="w-24">
                  <label className="text-xs text-zinc-500 mb-1.5 block">时长</label>
                  <NodeSelect 
                    value={data.duration || 10}
                    options={getDurationOptions(data.model || "sora2")}
                    icon={Clock}
                    onChange={(v) => handleNodeUpdate(id, { duration: parseInt(v) })}
                  />
                </div>
                <div className="w-24">
                  <label className="text-xs text-zinc-500 mb-1.5 block">比例</label>
                  <NodeSelect 
                    value={data.ratio || "16:9"}
                    options={RATIO_OPTIONS}
                    icon={Square}
                    onChange={(v) => {
                       const [w, h] = v.split(':').map(Number);
                       handleNodeUpdate(id, { ratio: v, aspectRatio: w/h });
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                   <label className="text-xs text-zinc-500">提示词</label>
                   <button
                    onClick={() => handleNodeUpdate(id, { showProMode: !data.showProMode })}
                    className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                      data.showProMode 
                        ? 'bg-zinc-800 text-zinc-100' 
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <Sliders size={10} />
                    专业模式
                  </button>
                </div>
                <textarea
                  value={data.prompt || ''}
                  onChange={(e) => handleNodeUpdate(id, { prompt: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:ring-1 focus:ring-zinc-600 outline-none resize-none"
                  rows={4}
                  placeholder="输入视频提示词..."
                />
              </div>

              {/* Pro Mode Panel */}
              {data.showProMode && (
                <div className="flex flex-col gap-3 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50 animate-in slide-in-from-top-2 fade-in duration-200">
                  {/* 机位 */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-zinc-500 font-medium">机位</span>
                    <div className="grid grid-cols-5 gap-1">
                      {CAMERA_OPTIONS.map(opt => (
                        <button
                          key={opt}
                          onClick={() => handleProModeSelection(node, 'camera_pos', opt)}
                          className={`text-[10px] py-1 rounded transition-colors ${
                            data.camera_pos === opt 
                              ? 'bg-zinc-100 text-zinc-900 font-medium' 
                              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* 景别 */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-zinc-500 font-medium">景别</span>
                    <div className="grid grid-cols-6 gap-1">
                      {SHOT_OPTIONS.map(opt => (
                        <button
                          key={opt}
                          onClick={() => handleProModeSelection(node, 'shot_size', opt)}
                          className={`text-[10px] py-1 rounded transition-colors ${
                            data.shot_size === opt 
                              ? 'bg-zinc-100 text-zinc-900 font-medium' 
                              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 分镜 (Movement) */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-zinc-500 font-medium">分镜</span>
                    <div className="grid grid-cols-6 gap-1">
                      {MOVEMENT_OPTIONS.map(opt => (
                        <button
                          key={opt}
                          onClick={() => handleProModeSelection(node, 'camera_move', opt)}
                          className={`text-[10px] py-1 rounded transition-colors ${
                            data.camera_move === opt 
                              ? 'bg-zinc-100 text-zinc-900 font-medium' 
                              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      case 'audio':
        const isSong = data.audioMode === 'song';
        return (
          <div key={id} className={commonClasses}>
            {header}
            <div className="space-y-3">
              <div className="flex gap-2 p-1 bg-zinc-950 rounded-lg border border-zinc-800">
                <button
                  onClick={() => handleNodeUpdate(id, { audioMode: 'speech' })}
                  className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors ${
                    !isSong ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-300'
                  }`}
                >
                  语音生成
                </button>
                <button
                  onClick={() => handleNodeUpdate(id, { audioMode: 'song' })}
                  className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors ${
                    isSong ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-300'
                  }`}
                >
                  歌曲生成
                </button>
              </div>
              
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">{isSong ? '风格' : '音色'}</label>
                <NodeSelect 
                  value={isSong ? (data.style || "pop") : (data.voice || "alloy")}
                  options={isSong ? STYLE_OPTIONS : VOICE_OPTIONS}
                  onChange={(v) => handleNodeUpdate(id, isSong ? { style: v } : { voice: v })}
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">{isSong ? '歌词' : '文本内容'}</label>
                <textarea
                  value={isSong ? (data.lyrics || '') : (data.text || '')}
                  onChange={(e) => handleNodeUpdate(id, isSong ? { lyrics: e.target.value } : { text: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:ring-1 focus:ring-zinc-600 outline-none resize-none"
                  rows={4}
                  placeholder={isSong ? "输入歌词..." : "输入要朗读的文本..."}
                />
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full w-full bg-zinc-950 text-zinc-100">
      {/* Left Panel: Projects */}
      <div className="w-[300px] border-r border-zinc-800 p-4 flex flex-col gap-4 bg-zinc-900/30">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center shadow-sm">
            <FolderKanban size={20} className="text-zinc-200" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-100">项目资产</h2>
            <p className="text-xs text-zinc-500">选择项目进行配置与生产</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto -mx-2 px-2 py-2 space-y-3 custom-scrollbar">
          {projects.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 text-sm">
              暂无保存的项目
            </div>
          ) : (
            projects.map(p => (
              <div 
                key={p.id} 
                className={`relative transition-all duration-200 rounded-xl ${
                  selectedProjectId === p.id 
                    ? 'ring-2 ring-zinc-100 ring-offset-2 ring-offset-zinc-950' 
                    : 'hover:bg-zinc-900'
                }`}
              >
                <ProjectCard 
                  project={p} 
                  onLoadProject={() => setSelectedProjectId(p.id)}
                  onDeleteProject={null}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content Area: Split into Config (Left) and Results (Right) */}
      <div className="flex-1 flex overflow-hidden bg-zinc-950">
        {selectedProject ? (
          <>
            {/* Left Column: Configuration (Frame style) */}
            <div className="w-[500px] flex flex-col border-r border-zinc-800 bg-zinc-900/20">
              {/* Header */}
              <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
                <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-3">
                  {selectedProject.title}
                  <span className="text-xs font-normal text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700">
                    {modifiedNodes.length} 个节点
                  </span>
                </h2>
                <p className="text-xs text-zinc-500 mt-1 line-clamp-1">
                  {selectedProject.description || "配置参数并一键生成所有内容"}
                </p>
              </div>

              {/* Scrollable Config List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="space-y-6">
                   {modifiedNodes.length === 0 ? (
                     <div className="text-center py-20 text-zinc-500">
                       <p>该项目没有可配置的节点</p>
                     </div>
                   ) : (
                     modifiedNodes.map(node => renderNodeConfig(node))
                   )}
                </div>
              </div>

              {/* Bottom Action Area */}
              <div className="p-4 border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2">
                    <span className="text-xs text-zinc-500 whitespace-nowrap">生成数量</span>
                    <input 
                      type="number" 
                      min="1" 
                      max="10" 
                      value={generateCount}
                      onChange={(e) => setGenerateCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-12 bg-transparent text-center text-sm font-bold text-zinc-100 outline-none"
                    />
                  </div>
                  <button 
                    onClick={handleRun}
                    className="flex-1 bg-zinc-100 hover:bg-white text-zinc-900 px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-zinc-900/20 hover:shadow-zinc-100/20 transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Play size={16} fill="currentColor" />
                    <span>一键生成</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Results Display */}
            <div className="flex-1 flex flex-col bg-zinc-950">
              <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-zinc-400" />
                  <h3 className="font-bold text-zinc-200">生成结果</h3>
                </div>
                {generatedWorks.length > 0 && (
                  <button 
                    onClick={handleDownloadAll}
                    className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 bg-zinc-800/50 hover:bg-zinc-800 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <Download size={14} />
                    <span>一键下载全部</span>
                  </button>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {generatedWorks.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-4">
                    <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800 border-dashed">
                      <ImageIcon size={24} />
                    </div>
                    <p className="text-sm">暂无生成结果，请点击左侧按钮开始生成</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {generatedWorks.map(work => (
                      <div key={work.id} className="group bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-all cursor-pointer">
                        <div className="aspect-video bg-zinc-950 relative flex items-center justify-center">
                          {work.type === 'video' ? (
                            <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Play size={20} className="fill-white text-white" />
                            </div>
                          ) : (
                            <ImageIcon size={24} className="text-zinc-600" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="p-3">
                          <h4 className="text-sm font-medium text-zinc-200 truncate">{work.title}</h4>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded uppercase">{work.type}</span>
                            <span className="text-[10px] text-green-500 flex items-center gap-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                              完成
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 gap-6">
            <div className="w-24 h-24 bg-zinc-900/50 rounded-3xl flex items-center justify-center border border-zinc-800">
              <Sparkles size={40} className="text-zinc-700" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium text-zinc-300 mb-2">准备开始生产</h3>
              <p className="text-sm text-zinc-500 max-w-xs">
                请从左侧选择一个项目，配置参数后即可一键批量生产所有内容
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
