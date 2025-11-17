import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Send } from 'lucide-react';
import { aiService } from '../services/ai/AIService';
import { useAppStore } from '../store/useAppStore';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  mode?: 'insert' | 'send'; // insert: 插入到光标/输入框, send: 直接发送给AI
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscript, mode = 'insert' }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [partialText, setPartialText] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rawTranscriptRef = useRef<string>('');
  const recordingTimerRef = useRef<number | null>(null);
  
  const { settings, currentDocument } = useAppStore();

  useEffect(() => {
    return () => {
      // 清理 WebSocket 连接
      if (wsRef.current) {
        wsRef.current.close();
      }
      // 清理媒体流
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    // 立即设置录音状态，防止重复点击
    setIsRecording(true);
    setRecordingDuration(0);
    
    try {
      // 建立 WebSocket 连接，设置 2 秒超时
      const ws = new WebSocket('ws://localhost:8765');
      wsRef.current = ws;
      
      let connectionTimeout: number | null = null;
      let isConnected = false;

      // 设置连接超时
      connectionTimeout = window.setTimeout(() => {
        if (!isConnected && ws.readyState !== WebSocket.OPEN) {
          console.error('⏱️ STT 服务连接超时');
          ws.close();
          setErrorMessage('语音识别服务连接超时，请确保服务已启动');
          setTimeout(() => setErrorMessage(''), 5000);
          setIsRecording(false);
          if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
          }
        }
      }, 2000); // 2秒超时

      ws.onopen = async () => {
        isConnected = true;
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
        }
        console.log('🔗 已连接到流式 STT 服务');
        
        // 开始会话
        ws.send(JSON.stringify({ command: 'start' }));
        
        // 获取麦克风
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        streamRef.current = stream;

        // 创建 MediaRecorder，每 100ms 发送一次数据
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus',
        });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            console.log('📤 发送音频数据块:', e.data.size, 'bytes');
            ws.send(e.data);
          }
        };

        mediaRecorder.start(100); // 每 100ms 触发一次
        
        // 开始计时
        recordingTimerRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
        }, 1000);
        
        console.log('🎤 开始流式录音');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📝 收到消息:', data);
          
          if (data.type === 'connected') {
            console.log('✅ 服务器确认连接');
          } else if (data.type === 'session_started') {
            console.log('✅ 会话已开始');
          } else if (data.type === 'partial') {
            // 部分结果（实时显示）
            console.log('⏳ 部分结果:', data.text);
            setPartialText(data.text);
          } else if (data.type === 'final') {
            // 最终结果 - 先保存原始文本
            console.log('✅ 最终结果:', data.text);
            rawTranscriptRef.current = data.text;
            setPartialText('');
            
            // STT 返回最终文案后，改变按钮状态
            setIsRecording(false);
            
            // 开始 AI 优化
            optimizeTranscript(data.text);
          } else if (data.type === 'session_ended') {
            console.log('✅ 会话已结束');
            
            // 如果有 partial 结果但没有收到 final，使用最后的 partial 作为最终结果
            if (partialText && !rawTranscriptRef.current) {
              console.log('⚠️ 使用最后的 partial 结果作为最终结果');
              rawTranscriptRef.current = partialText;
              setPartialText('');
              
              // 改变按钮状态
              setIsRecording(false);
              
              optimizeTranscript(partialText);
            } else if (!rawTranscriptRef.current) {
              // 如果既没有 final 也没有 partial，直接恢复按钮状态
              setIsRecording(false);
            }
            
            ws.close();
          }
        } catch (error) {
          console.error('解析消息失败:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket 错误:', error);
        setErrorMessage('语音识别服务连接失败，请确保服务已启动');
        setTimeout(() => setErrorMessage(''), 5000);
        setIsRecording(false);
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket 连接已关闭');
        wsRef.current = null;
      };
      
    } catch (error) {
      console.error('启动录音失败:', error);
      setErrorMessage('无法访问麦克风，请检查权限设置');
      setTimeout(() => setErrorMessage(''), 5000);
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const stopRecording = () => {
    console.log('🛑 停止录音');
    // 不立即改变按钮状态，等待 STT 返回最终文案
    
    // 停止计时
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // 发送停止命令
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('📨 发送停止命令');
      wsRef.current.send(JSON.stringify({ command: 'stop' }));
    }
  };

  const optimizeTranscript = async (rawText: string) => {
    // 检查是否有文字内容
    if (!rawText || rawText.trim().length === 0) {
      console.log('⚠️ 语音识别结果为空，不发送给 AI');
      setIsOptimizing(false);
      return;
    }
    
    setIsOptimizing(true);
    
    try {
      // 获取当前文档内容作为上下文（转换为纯文本）
      const getTextContent = (content: any): string => {
        if (!content) return '';
        if (typeof content === 'string') return content;
        if (content.type === 'text') return content.text || '';
        if (content.content && Array.isArray(content.content)) {
          return content.content.map(getTextContent).join('');
        }
        return '';
      };
      
      const context = currentDocument?.content ? getTextContent(currentDocument.content) : '';
      
      // 构建优化提示词
      const prompt = `请修正以下语音识别文字中可能存在的识别错误。

要求：
1. 仅修正明显的语音识别错误（如同音字错误、错别字）
2. 补充必要的标点符号
3. 保持原文的表达方式和语气，不要改写或优化语句
4. 如果有上下文，根据上下文判断是否有识别错误
5. 直接输出修正后的文字，不要添加任何解释或说明

语音识别原文：
${rawText}`;

      let optimizedText = '';
      
      // 调用 AI 服务优化文字
      await aiService.sendPrompt(
        settings.defaultProvider,
        prompt,
        context,
        settings.defaultModel,
        (chunk) => {
          optimizedText += chunk;
        }
      );
      
      console.log('✨ AI 优化完成:', optimizedText);
      
      // 插入优化后的文字
      if (optimizedText.trim()) {
        onTranscript(optimizedText.trim());
      }
      
    } catch (error) {
      console.error('❌ AI 优化失败:', error);
      // 如果优化失败，使用原始文本
      if (rawText.trim()) {
        onTranscript(rawText);
      }
    } finally {
      setIsOptimizing(false);
    }
  };

  const isSendMode = mode === 'send';
  const buttonColor = isSendMode ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600';
  
  // 根据 mode 决定气泡位置
  const bubblePosition = isSendMode ? 'right-0' : 'left-0';
  const trianglePosition = isSendMode ? 'right-4' : 'left-4';

  return (
    <div className="relative">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isOptimizing}
        className={`p-3 rounded-lg transition-colors ${
          isRecording
            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
            : isOptimizing
            ? 'bg-purple-500 text-white cursor-not-allowed'
            : `${buttonColor} text-white`
        }`}
        title={
          isOptimizing
            ? 'AI 正在优化文字...'
            : isRecording 
            ? '点击停止录音' 
            : isSendMode
            ? '语音输入到聊天框'
            : '语音输入到光标位置'
        }
      >
        {isOptimizing ? (
          <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
        ) : isRecording ? (
          <Square className="w-5 h-5" />
        ) : isSendMode ? (
          <div className="relative">
            <Mic className="w-5 h-5" />
            <Send className="w-3 h-3 absolute -bottom-1 -right-1 bg-green-600 rounded-full p-0.5" />
          </div>
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>
      
      {/* 录音中提示（显示时长） */}
      {isRecording && !partialText && (
        <div className={`absolute bottom-full mb-3 ${bubblePosition} bg-gradient-to-r from-red-600 to-red-500 text-white text-sm px-4 py-2.5 rounded-2xl shadow-xl z-50 animate-fade-in`}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span>录音中 {recordingDuration}s</span>
          </div>
          <div className={`absolute -bottom-1 ${trianglePosition} w-3 h-3 bg-red-500 transform rotate-45`}></div>
        </div>
      )}
      
      {/* 显示实时识别结果 - 气泡样式 */}
      {partialText && !isOptimizing && (
        <div className={`absolute bottom-full mb-3 ${bubblePosition} bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm px-4 py-2.5 rounded-2xl shadow-xl max-w-sm min-w-[200px] z-50 animate-fade-in`}>
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            </div>
            <div className="flex-1 leading-relaxed">
              {partialText}
            </div>
          </div>
          {/* 小三角 */}
          <div className={`absolute -bottom-1 ${trianglePosition} w-3 h-3 bg-blue-500 transform rotate-45`}></div>
        </div>
      )}
      
      {/* AI 优化中提示 */}
      {isOptimizing && (
        <div className={`absolute bottom-full mb-3 ${bubblePosition} bg-gradient-to-r from-purple-600 to-purple-500 text-white text-sm px-4 py-2.5 rounded-2xl shadow-xl max-w-sm min-w-[200px] z-50 animate-fade-in`}>
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 mt-0.5">
              <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></div>
            </div>
            <div className="flex-1 leading-relaxed">
              AI 正在优化文字...
            </div>
          </div>
          {/* 小三角 */}
          <div className={`absolute -bottom-1 ${trianglePosition} w-3 h-3 bg-purple-500 transform rotate-45`}></div>
        </div>
      )}
      
      {/* 错误提示 */}
      {errorMessage && (
        <div className={`absolute bottom-full mb-3 ${bubblePosition} bg-gradient-to-r from-red-600 to-red-500 text-white text-sm px-4 py-2.5 rounded-2xl shadow-xl max-w-sm min-w-[200px] z-50 animate-fade-in`}>
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1 leading-relaxed">
              {errorMessage}
            </div>
          </div>
          {/* 小三角 */}
          <div className={`absolute -bottom-1 ${trianglePosition} w-3 h-3 bg-red-500 transform rotate-45`}></div>
        </div>
      )}
    </div>
  );
};
