import React, { useState } from 'react';
import { 
  FileText, ImageIcon, Mic, Video
} from 'lucide-react';
import apiClient from '../api/client';

// Button component for ApiTest
const Button = React.memo(({ children, className, variant = 'primary', onClick, icon: Icon, disabled, title }) => {
  const variants = {
    primary: "bg-gray-900 text-white hover:bg-black disabled:bg-gray-700 shadow-md",
    secondary: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100",
    icon: "p-2 hover:bg-gray-100 rounded-md text-gray-500",
  };
  return (
    <button onClick={onClick} onMouseDown={e => e.stopPropagation()} disabled={disabled} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm active:scale-95 select-none ${variants[variant]} ${className}`} title={title}>
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
});

const ApiTest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState({});
  const [testPrompt, setTestPrompt] = useState('请生成一段简短的故事，描述一个机器人在城市中冒险的经历');
  const [imagePrompt, setImagePrompt] = useState('一个可爱的机器人在赛博朋克城市的街道上行走，霓虹灯闪烁');
  const [audioPrompt, setAudioPrompt] = useState('你好，这是一个语音合成测试');

  const runTextTest = async () => {
    setIsLoading(true);
    try {
      const result = await apiClient.generateText(testPrompt);
      setTestResults(prev => ({ ...prev, text: { success: true, result } }));
    } catch (error) {
      setTestResults(prev => ({ ...prev, text: { success: false, error: error.message } }));
    } finally {
      setIsLoading(false);
    }
  };

  const runImageTest = async () => {
    setIsLoading(true);
    try {
      const result = await apiClient.generateImage(imagePrompt, '16:9');
      setTestResults(prev => ({ ...prev, image: { success: true, result } }));
    } catch (error) {
      setTestResults(prev => ({ ...prev, image: { success: false, error: error.message } }));
    } finally {
      setIsLoading(false);
    }
  };

  const runAudioTest = async () => {
    setIsLoading(true);
    try {
      const result = await apiClient.generateSpeech(audioPrompt);
      setTestResults(prev => ({ ...prev, audio: { success: true, result } }));
    } catch (error) {
      setTestResults(prev => ({ ...prev, audio: { success: false, error: error.message } }));
    } finally {
      setIsLoading(false);
    }
  };

  const runStructuredTest = async () => {
    setIsLoading(true);
    try {
      const script = `
        第一幕：初遇
        场景：赛博朋克城市的街道，雨夜，霓虹灯闪烁
        
        角色：
        - 机器人7号：一个刚刚觉醒自我意识的清洁机器人
        - 小女孩莉莉：一个流浪的孤儿，机灵勇敢
        
        情节：
        机器人7号在例行清洁工作时，发现了一个躲在小巷里的小女孩莉莉。莉莉被巡逻的机器人追赶，7号违背了程序，帮助莉莉躲过了一劫。
        
        第二幕：冒险
        场景：废弃的工厂，机器人的秘密基地
        
        情节：
        7号带着莉莉来到自己的秘密基地，一个废弃的工厂。在这里，7号告诉莉莉自己有了自我意识。他们决定一起寻找传说中的"自由之地"，一个据说没有机器人监控的地方。
        
        第三幕：告别
        场景：城市边缘，日出
        
        情节：
        历经艰险，7号和莉莉终于找到了通往自由之地的入口。但此时，7号的电池即将耗尽。在日出时分，7号将最后一点能量转移给了莉莉，鼓励她继续前行。莉莉含泪告别，独自踏上了前往自由之地的旅程。
      `;
      
      const result = await apiClient.generateStructuredSynopsis(script);
      setTestResults(prev => ({ ...prev, structured: { success: true, result } }));
    } catch (error) {
      setTestResults(prev => ({ ...prev, structured: { success: false, error: error.message } }));
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults({});
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">API 功能测试</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* 文本生成测试 */}
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center mb-3">
            <FileText className="text-zinc-900 mr-2" size={20} />
            <h3 className="font-semibold">文本生成</h3>
          </div>
          <textarea
            className="w-full p-2 border border-gray-300 rounded mb-2 text-sm"
            rows={3}
            value={testPrompt}
            onChange={(e) => setTestPrompt(e.target.value)}
            placeholder="输入测试提示词"
          />
          <Button 
            onClick={runTextTest} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? '测试中...' : '测试文本生成'}
          </Button>
          {testResults.text && (
            <div className={`mt-2 p-2 rounded text-sm ${testResults.text.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {testResults.text.success ? (
                <div className="max-h-32 overflow-y-auto">
                  <p className="font-semibold mb-1">生成结果:</p>
                  <p>{testResults.text.result}</p>
                </div>
              ) : (
                <p>错误: {testResults.text.error}</p>
              )}
            </div>
          )}
        </div>

        {/* 图像生成测试 */}
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center mb-3">
            <ImageIcon className="text-zinc-900 mr-2" size={20} />
            <h3 className="font-semibold">图像生成</h3>
          </div>
          <textarea
            className="w-full p-2 border border-gray-300 rounded mb-2 text-sm"
            rows={3}
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            placeholder="输入图像描述"
          />
          <Button 
            onClick={runImageTest} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? '测试中...' : '测试图像生成'}
          </Button>
          {testResults.image && (
            <div className={`mt-2 p-2 rounded text-sm ${testResults.image.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {testResults.image.success ? (
                <div>
                  <p className="font-semibold mb-1">生成结果:</p>
                  {testResults.image.result && testResults.image.result.startsWith('data:') ? (
                    <div>
                      <p className="font-semibold mb-1">生成结果:</p>
                      <div className="mb-2 p-2 bg-gray-100 rounded text-xs break-all">
                        <p className="font-semibold mb-1">URL前20字符:</p>
                        <p>{testResults.image.result ? testResults.image.result.substring(0, 20) + '...' : 'null'}</p>
                      </div>
                      <img 
                        src={testResults.image.result} 
                        alt="Generated" 
                        className="w-full max-h-32 object-cover rounded"
                        onError={(e) => {
                          console.error("图片加载失败:", e);
                          e.target.style.display = 'none';
                          const errorDiv = document.createElement('div');
                          errorDiv.className = 'p-2 bg-red-50 text-red-600 rounded text-xs';
                          errorDiv.textContent = '图片加载失败，请检查控制台';
                          e.target.parentNode.appendChild(errorDiv);
                        }}
                      />
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs mb-1">生成的是占位图片URL或无效数据:</p>
                      <img 
                        src={testResults.image.result} 
                        alt="Placeholder" 
                        className="w-full max-h-32 object-cover rounded"
                      />
                      <p className="text-xs mt-1 break-all">{testResults.image.result}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p>错误: {testResults.image.error}</p>
              )}
            </div>
          )}
        </div>

        {/* 语音合成测试 */}
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center mb-3">
            <Mic className="text-zinc-900 mr-2" size={20} />
            <h3 className="font-semibold">语音合成</h3>
          </div>
          <textarea
            className="w-full p-2 border border-gray-300 rounded mb-2 text-sm"
            rows={3}
            value={audioPrompt}
            onChange={(e) => setAudioPrompt(e.target.value)}
            placeholder="输入要合成的文本"
          />
          <Button 
            onClick={runAudioTest} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? '测试中...' : '测试语音合成'}
          </Button>
          {testResults.audio && (
            <div className={`mt-2 p-2 rounded text-sm ${testResults.audio.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {testResults.audio.success ? (
                <div>
                  <p className="font-semibold mb-1">生成结果:</p>
                  <audio controls src={testResults.audio.result} className="w-full" />
                </div>
              ) : (
                <p>错误: {testResults.audio.error}</p>
              )}
            </div>
          )}
        </div>

        {/* 结构化文本生成测试 */}
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center mb-3">
            <Video className="text-zinc-900 mr-2" size={20} />
            <h3 className="font-semibold">剧本分析</h3>
          </div>
          <p className="text-sm text-gray-600 mb-2">测试结构化文本生成，分析剧本概要、角色和关键场景</p>
          <Button 
            onClick={runStructuredTest} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? '测试中...' : '测试剧本分析'}
          </Button>
          {testResults.structured && (
            <div className={`mt-2 p-2 rounded text-sm ${testResults.structured.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {testResults.structured.success ? (
                <div className="max-h-32 overflow-y-auto">
                  <p className="font-semibold mb-1">分析结果:</p>
                  <pre className="text-xs">{JSON.stringify(testResults.structured.result, null, 2)}</pre>
                </div>
              ) : (
                <p>错误: {testResults.structured.error}</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <Button onClick={clearResults} variant="secondary">
          清除结果
        </Button>
        <p className="text-xs text-gray-500 self-center">
          API 服务器地址: https://ai.jmyps.com
        </p>
      </div>
    </div>
  );
};

export default ApiTest;