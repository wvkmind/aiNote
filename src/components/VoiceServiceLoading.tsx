import React from 'react';
import { useVoiceService } from '../hooks/useVoiceService';

interface VoiceServiceLoadingProps {
  children: React.ReactNode;
}

export const VoiceServiceLoading: React.FC<VoiceServiceLoadingProps> = ({ children }) => {
  const { status, retryCount } = useVoiceService();

  // 开发模式下不显示 loading
  if (import.meta.env.DEV) {
    return <>{children}</>;
  }

  if (status === 'checking' || status === 'starting') {
    const progress = Math.min((retryCount / 30) * 100, 90);
    
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="flex flex-col items-center">
            {/* Logo 或图标 */}
            <div className="mb-6">
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div className="absolute inset-0 w-20 h-20 bg-blue-500 rounded-full animate-ping opacity-20"></div>
              </div>
            </div>

            {/* 标题 */}
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {status === 'checking' ? '初始化中...' : '启动语音识别'}
            </h2>
            
            {/* 描述 */}
            <p className="text-gray-600 text-center mb-6">
              {status === 'checking' 
                ? '正在检查语音服务状态...' 
                : '首次启动需要加载模型，请稍候...'}
            </p>

            {/* 进度条 */}
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
              </div>
            </div>

            {/* 进度文本 */}
            <p className="text-sm text-gray-500">
              {retryCount > 0 && `${retryCount}/30 秒`}
            </p>

            {/* 提示 */}
            {retryCount > 15 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800 text-center">
                  ⏳ 加载时间较长，请耐心等待...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (status === 'unavailable') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              语音服务启动超时
            </h2>
            
            <p className="text-gray-600 text-center mb-6">
              语音识别功能暂时不可用，但您仍可以正常使用其他功能。
            </p>
            
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              重新加载
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              语音服务启动失败
            </h2>
            
            <p className="text-gray-600 text-center mb-6">
              无法启动语音识别服务，但您仍可以正常使用其他功能。
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                重试
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                继续使用
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // status === 'ready'
  return <>{children}</>;
};
