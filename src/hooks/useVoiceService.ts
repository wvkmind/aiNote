import { useState } from 'react';

export type VoiceServiceStatus = 'unknown' | 'ready' | 'unavailable';

export const useVoiceService = () => {
  const [status, setStatus] = useState<VoiceServiceStatus>('unknown');

  // 手动检查服务状态
  const checkStatus = async () => {
    try {
      const ws = new WebSocket('ws://localhost:8765');
      
      const timeout = setTimeout(() => {
        ws.close();
        setStatus('unavailable');
        console.log('🔴 STT 服务不可用');
      }, 1000);

      ws.onopen = () => {
        clearTimeout(timeout);
        console.log('✅ STT 服务已就绪');
        setStatus('ready');
        ws.close();
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        setStatus('unavailable');
        console.log('🔴 STT 服务连接失败');
      };
    } catch (error) {
      console.error('检查服务状态失败:', error);
      setStatus('unavailable');
    }
  };

  return { status, checkStatus };
};
