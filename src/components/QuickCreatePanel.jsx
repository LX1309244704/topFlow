import React, { useState, useEffect, useRef } from 'react';
import { Type, ImageIcon, Video, Music, Send, Square, Layers, Play, Sparkles, Search, Users, Grid3X3 } from 'lucide-react';
import { createStoryboardNodesFromImage, createBasicStoryboardNodes } from './agents/storyboardAgent';

const QuickCreatePanel = ({ onAddNode, generateText }) => {
  const [selectedType, setSelectedType] = useState('text');
  const [inputValue, setInputValue] = useState('');
  const [nodeParams, setNodeParams] = useState({});
  const [isFocused, setIsFocused] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const nodeTypes = [
    { type: 'text', label: '文本', icon: Type, color: 'text-zinc-400' },
    { type: 'image', label: '图片', icon: ImageIcon, color: 'text-zinc-400' },
    { type: 'video', label: '视频', icon: Video, color: 'text-zinc-400' },
    { type: 'audio', label: '音频', icon: Music, color: 'text-zinc-400' }
  ];

  // 角色选项状态
  const [customRoles, setCustomRoles] = useState([]);

  // 加载角色数据的函数
  const loadRoles = () => {
    try {
      const saved = localStorage.getItem('topflow_custom_roles');
      if (saved) {
        const roles = JSON.parse(saved);
        // 过滤有效角色
        const filteredRoles = roles.filter(role => role && role.value && role.label);
        setCustomRoles(filteredRoles);
      } else {
        setCustomRoles([]);
      }
    } catch (error) {
      console.error('加载自定义角色失败:', error);
      setCustomRoles([]);
    }
  };

  // 组件挂载时加载角色数据
  useEffect(() => {
    loadRoles();
  }, []);

  // 角色选项 - 从资产角色库获取
  const allRoleOptions = [
    { value: '', label: '无角色设定' },
    ...(customRoles || []).filter(role => role && role.value && role.label)
  ];

  // 文本节点参数配置
  const textParams = {
    model: { value: 'gemini-2.5', options: [
      { value: 'gemini-2.5', label: 'Gemini 2.5' },
      { value: 'gemini-3', label: 'Gemini 3' }
    ]},
    role: { value: '', options: allRoleOptions }
  };

  // 图片节点参数配置
  const imageParams = {
    model: { value: 'nano-banana', options: [
      { value: 'nano-banana', label: 'Nano Banana' },
      { value: 'nano-banana-pro', label: 'Nano Banana Pro' }
    ]},
    ratio: { value: '4:3', options: [
      { value: '1:1', label: '1:1' },
      { value: '4:3', label: '4:3' },
      { value: '16:9', label: '16:9' },
      { value: '3:4', label: '3:4' },
      { value: '9:16', label: '9:16' }
    ]},
    batchSize: { value: 1, options: [
      { value: 1, label: '1x' },
      { value: 2, label: '2x' },
      { value: 4, label: '4x' }
    ]}
  };

  // 视频节点参数配置
  const videoParams = {
    model: { value: 'sora2', options: [
      { value: 'sora2', label: 'Sora 2.0' },
      { value: 'veo_3_1-fast', label: 'veo_3_1-fast' }
    ]},
    ratio: { value: '16:9', options: [
      { value: '16:9', label: '16:9' },
      { value: '9:16', label: '9:16' },
      { value: '1:1', label: '1:1' }
    ]},
    batchSize: { value: 1, options: [
      { value: 1, label: '1x' },
      { value: 2, label: '2x' }
    ]}
  };

  // 音频节点参数配置
  const audioParams = {
    mode: { value: 'speech', options: [
      { value: 'speech', label: '语音生成' },
      { value: 'song', label: '歌曲生成' }
    ]},
    voice: { value: 'alloy', options: [
      { value: 'alloy', label: 'Alloy (中性)' },
      { value: 'echo', label: 'Echo (男声)' },
      { value: 'fable', label: 'Fable (英式)' },
      { value: 'onyx', label: 'Onyx (深沉男声)' },
      { value: 'nova', label: 'Nova (女声)' },
      { value: 'shimmer', label: 'Shimmer (柔和女声)' }
    ]},
    style: { value: 'pop', options: [
      { value: 'pop', label: '流行音乐' },
      { value: 'rock', label: '摇滚' },
      { value: 'jazz', label: '爵士' },
      { value: 'classical', label: '古典' },
      { value: 'electronic', label: '电子' },
      { value: 'folk', label: '民谣' },
      { value: 'country', label: '乡村' },
      { value: 'hip-hop', label: '嘻哈' }
    ]},
    batchSize: { value: 1, options: [
      { value: 1, label: '1x' },
      { value: 2, label: '2x' }
    ]}
  };

  // 根据类型初始化参数
  useEffect(() => {
    switch (selectedType) {
      case 'text':
        setNodeParams({
          model: textParams.model.value,
          role: textParams.role.value
        });
        break;
      case 'image':
        setNodeParams({
          model: imageParams.model.value,
          ratio: imageParams.ratio.value,
          batchSize: imageParams.batchSize.value
        });
        break;
      case 'video':
        setNodeParams({
          model: videoParams.model.value,
          ratio: videoParams.ratio.value,
          batchSize: videoParams.batchSize.value
        });
        break;
      case 'audio':
        setNodeParams({
          mode: audioParams.mode.value,
          voice: audioParams.voice.value,
          style: audioParams.style.value,
          batchSize: audioParams.batchSize.value
        });
        break;
      default:
        setNodeParams({});
    }
  }, [selectedType]);

  const handleCreate = () => {
    if (!inputValue.trim()) return;
    
    const position = { x: window.innerWidth / 2 - 100, y: window.innerHeight / 2 - 50 };
    
    // 构建节点数据
    let nodeData = {};
    
    switch (selectedType) {
      case 'text':
        const selectedRole = allRoleOptions.find(role => role.value === nodeParams.role);
        nodeData = { 
          text: inputValue,
          model: nodeParams.model,
          selectedRole: nodeParams.role,
          rolePrompt: selectedRole ? (selectedRole.prompt || selectedRole.value) : ''
        };
        break;
      case 'image':
        // 计算宽高比
        const [imgW, imgH] = nodeParams.ratio.split(':').map(Number);
        nodeData = { 
          prompt: inputValue,
          model: nodeParams.model,
          ratio: nodeParams.ratio,
          aspectRatio: imgW / imgH,
          batchSize: nodeParams.batchSize
        };
        break;
      case 'video':
        // 计算宽高比
        const [vidW, vidH] = nodeParams.ratio.split(':').map(Number);
        nodeData = { 
          prompt: inputValue,
          model: nodeParams.model,
          ratio: nodeParams.ratio,
          aspectRatio: vidW / vidH,
          batchSize: nodeParams.batchSize
        };
        break;
      case 'audio':
        nodeData = { 
          text: nodeParams.mode === 'speech' ? inputValue : '',
          lyrics: nodeParams.mode === 'song' ? inputValue : '',
          audioMode: nodeParams.mode,
          voice: nodeParams.voice,
          style: nodeParams.style,
          batchSize: nodeParams.batchSize
        };
        break;
    }
    
    onAddNode(selectedType, position.x, position.y, null, nodeData);
    
    setInputValue('');
  };

  const handleCreateStoryboard = async () => {
    if (!inputValue.trim()) return;
    
    const position = { x: window.innerWidth / 2 - 200, y: window.innerHeight / 2 - 100 };
    const params = {
      model: nodeParams.model,
      ratio: nodeParams.ratio,
      batchSize: nodeParams.batchSize
    };
    
    try {
      if (uploadedImage && generateText) {
        // 如果有上传的图片，使用图片分析生成分镜
        const success = await createStoryboardNodesFromImage(
          uploadedImage,
          inputValue,
          position.x,
          position.y,
          onAddNode,
          generateText,
          params
        );
        
        if (success) {
          // 清理上传的图片
          setUploadedImage(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      } else {
        // 没有上传图片，使用基本分镜生成
        createBasicStoryboardNodes(
          inputValue,
          position.x,
          position.y,
          onAddNode,
          params
        );
      }
    } catch (error) {
      console.error('创建分镜失败:', error);
      // 如果出错，回退到基本分镜生成
      createBasicStoryboardNodes(
        inputValue,
        position.x,
        position.y,
        onAddNode,
        params
      );
    }
    
    setInputValue('');
  };

  // 处理图片上传
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const aspect = img.width / img.height;
          setUploadedImage(reader.result);
          // 如果需要，可以更新默认比例以匹配上传的图片
          if (selectedType === 'image') {
            // 找到最接近的比例
            const aspectRatios = [
              { value: '1:1', label: '1:1', ratio: 1 },
              { value: '4:3', label: '4:3', ratio: 4/3 },
              { value: '16:9', label: '16:9', ratio: 16/9 },
              { value: '3:4', label: '3:4', ratio: 3/4 },
              { value: '9:16', label: '9:16', ratio: 9/16 }
            ];
            
            let closestRatio = aspectRatios[0];
            let minDiff = Math.abs(aspect - closestRatio.ratio);
            
            aspectRatios.forEach(ratio => {
              const diff = Math.abs(aspect - ratio.ratio);
              if (diff < minDiff) {
                minDiff = diff;
                closestRatio = ratio;
              }
            });
            
            setNodeParams(prev => ({ ...prev, ratio: closestRatio.value }));
          }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  // 创建包含上传图片的节点
  const handleCreateWithUploadedImage = () => {
    if (!uploadedImage) return;
    
    const position = { x: window.innerWidth / 2 - 100, y: window.innerHeight / 2 - 50 };
    
    // 计算宽高比
    const [imgW, imgH] = nodeParams.ratio.split(':').map(Number);
    
    const nodeData = { 
      prompt: inputValue || '上传的图片',
      model: nodeParams.model,
      ratio: nodeParams.ratio,
      aspectRatio: imgW / imgH,
      batchSize: nodeParams.batchSize,
      generatedImage: uploadedImage
    };
    
    onAddNode('image', position.x, position.y, null, nodeData);
    
    // 重置状态
    setUploadedImage(null);
    setInputValue('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreate();
    }
  };

  const updateParam = (paramName, value) => {
    setNodeParams(prev => ({ ...prev, [paramName]: value }));
  };

  // 参数选择器组件 - Gemini风格
  const renderParamSelect = (paramName, options, IconComponent, label) => (
    <div className="flex items-center gap-2">
      {IconComponent && <IconComponent size={14} className="text-zinc-500" />}
      <select 
        value={nodeParams[paramName] || ''}
        onChange={(e) => updateParam(paramName, e.target.value)}
        className="text-xs text-zinc-300 bg-transparent border-0 focus:ring-0 cursor-pointer hover:bg-zinc-900 rounded-md px-2 py-1 outline-none transition-colors"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  // 滑动条组件 - Gemini风格
  const renderSlider = (paramName, min, max, step, label) => (
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-500 whitespace-nowrap">{label}:</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={nodeParams[paramName] || min}
        onChange={(e) => updateParam(paramName, parseInt(e.target.value))}
        className="flex-1 h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer slider"
        style={{
          background: `linear-gradient(to right, #f4f4f5 0%, #f4f4f5 ${((nodeParams[paramName] || min) - min) / (max - min) * 100}%, #27272a ${((nodeParams[paramName] || min) - min) / (max - min) * 100}%, #27272a 100%)`
        }}
      />
      <span className="text-xs text-zinc-300 w-8 text-right">{nodeParams[paramName] || min}</span>
    </div>
  );

  // 渲染不同类型参数 - Gemini风格
  const renderParams = () => {
    switch (selectedType) {
      case 'text':
        return (
          <div className="flex items-center gap-3">
            <div className="h-5 w-px bg-zinc-800"></div>
            {renderParamSelect('model', textParams.model.options, Sparkles, '模型')}
            {renderParamSelect('role', textParams.role.options, Users, '角色')}
          </div>
        );
      
      case 'image':
        return (
          <div className="flex items-center gap-3">
            <div className="h-5 w-px bg-zinc-800"></div>
            {renderParamSelect('model', imageParams.model.options, Sparkles, '模型')}
            {renderParamSelect('ratio', imageParams.ratio.options, Square, '比例')}
            {renderParamSelect('batchSize', imageParams.batchSize.options, Layers, '批量')}
            <div className="flex items-center gap-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 hover:bg-zinc-900 rounded text-zinc-500 transition-colors"
                title="上传图片"
              >
                <ImageIcon size={14} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageUpload} 
              />
            </div>
            <button
              onClick={handleCreateStoryboard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-900 bg-zinc-100 hover:bg-white transition-all shadow-sm"
              title={uploadedImage ? "基于上传图片分析并创建4个分镜" : "创建4个分镜图片"}
            >
              <Grid3X3 size={14} />
              分镜
            </button>
          </div>
        );
      
      case 'video':
        return (
          <div className="flex items-center gap-3">
            <div className="h-5 w-px bg-zinc-800"></div>
            {renderParamSelect('model', videoParams.model.options, Sparkles, '模型')}
            {renderParamSelect('ratio', videoParams.ratio.options, Square, '比例')}
            {renderParamSelect('batchSize', videoParams.batchSize.options, Layers, '批量')}
          </div>
        );
      
      case 'audio':
        return (
          <div className="flex items-center gap-3">
            <div className="h-5 w-px bg-zinc-800"></div>
            {renderParamSelect('mode', audioParams.mode.options, Play, '模式')}
            {nodeParams.mode === 'speech' 
              ? renderParamSelect('voice', audioParams.voice.options, null, '音色')
              : renderParamSelect('style', audioParams.style.options, Music, '风格')
            }
            {renderParamSelect('batchSize', audioParams.batchSize.options, Layers, '批量')}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[100] pointer-events-auto">
      {/* 类型选择器 - Gemini风格的浮动标签 */}
      <div className="flex justify-center mb-3">
        <div className="inline-flex items-center bg-zinc-900 rounded-full shadow-lg border border-zinc-800 p-1">
          {nodeTypes.map(({ type, label, icon: Icon, color }) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedType === type 
                  ? 'bg-zinc-100 text-zinc-900' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon size={16} className={selectedType === type ? 'text-zinc-900' : 'text-zinc-500'} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 主输入区域 - Gemini风格 */}
      <div className="relative bg-zinc-950 rounded-2xl shadow-lg border border-zinc-800 w-[700px]">
        {/* 参数配置区域 - 更简洁的样式 */}
        <div className="px-4 pt-3 pb-2 border-b border-zinc-900">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-zinc-500 font-medium">参数:</span>
            {renderParams()}
          </div>
        </div>

        {/* 上传图片预览区域 */}
        {uploadedImage && (
          <div className="px-4 py-3 border-b border-zinc-900">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                <img src={uploadedImage} alt="上传的图片" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-zinc-500 mb-1">已选择图片</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCreateWithUploadedImage}
                    className="flex items-center gap-1 px-3 py-1.5 bg-zinc-100 text-zinc-900 rounded-md text-xs font-medium hover:bg-white transition-colors"
                  >
                    <Send size={12} />
                    创建图片节点
                  </button>
                  <button
                    onClick={() => {
                      setUploadedImage(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded-md text-xs font-medium hover:bg-zinc-700 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* 输入框 - Gemini风格 */}
        <div className={`relative p-2 pb-3 ${isFocused ? 'bg-zinc-900/50' : ''} transition-colors rounded-b-2xl`}>
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={`输入${nodeTypes.find(t => t.type === selectedType)?.label || '文本'}内容...`}
            className="w-full resize-none text-sm px-3 py-2 outline-none bg-transparent text-zinc-100 placeholder-zinc-600 min-h-[48px] max-h-[150px] transition-colors"
            rows={1}
            style={{ 
              height: 'auto',
              overflow: 'hidden',
              minHeight: '48px'
            }}
            onInput={(e) => {
              // 自动调整高度
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
            }}
          />
          
          {/* 底部操作区域 */}
          <div className="flex items-center justify-between mt-2">
            <div className="text-xs text-zinc-500">
              {uploadedImage ? '使用上传的图片' : `快速创建 ${nodeTypes.find(t => t.type === selectedType)?.label || '文本'} 节点`}
            </div>
            
            {/* 发送按钮 - Gemini风格 */}
            {!uploadedImage && (
              <button
                onClick={handleCreate}
                disabled={!inputValue.trim()}
                className={`p-2 rounded-full transition-all ${
                  inputValue.trim() 
                    ? 'bg-zinc-100 text-zinc-900 hover:bg-white shadow-md' 
                    : 'bg-zinc-900 text-zinc-600 cursor-not-allowed'
                }`}
                title="创建节点"
              >
                <Send size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickCreatePanel;