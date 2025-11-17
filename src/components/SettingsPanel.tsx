import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/useAppStore';

export const SettingsPanel: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { settings, updateSettings, toggleSettings, setTheme } = useAppStore();
  
  // 确保 localSettings 始终有初始值
  const [localSettings, setLocalSettings] = useState(() => settings);

  useEffect(() => {
    console.log('⚙️ SettingsPanel: settings 更新', settings);
    if (settings && settings.aiProviders) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleSave = async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    
    // 检查数据库路径是否改变
    const oldPath = settings.databasePath || '';
    const newPath = localSettings.databasePath || '';
    
    if (oldPath !== newPath) {
      const confirmed = confirm(
        '数据库路径已更改。\n\n' +
        (newPath ? `新路径：${newPath}\n\n` : '将使用默认路径\n\n') +
        '现有数据将自动复制到新位置。\n\n' +
        '是否继续？'
      );
      
      if (!confirmed) {
        return;
      }
      
      try {
        // 如果新路径为空，使用默认路径
        const targetPath = newPath || await invoke<string>('get_default_db_path');
        
        // 调用后端迁移数据库
        await invoke('change_database_path', { newPath: targetPath });
        
        alert('数据库迁移成功！应用将重新加载文档列表。');
      } catch (error) {
        alert(`数据库迁移失败：${error}`);
        return;
      }
    }
    
    await updateSettings(localSettings);
    toggleSettings();
    
    // 如果数据库路径改变了，重新加载文档
    if (oldPath !== newPath) {
      window.location.reload();
    }
  };

  const handleProviderChange = (index: number, field: string, value: any) => {
    if (!localSettings?.aiProviders) return;
    const newProviders = [...localSettings.aiProviders];
    newProviders[index] = { ...newProviders[index], [field]: value };
    setLocalSettings({ ...localSettings, aiProviders: newProviders });
  };

  console.log('⚙️ SettingsPanel: 渲染', { settings, localSettings });
  
  // 如果 localSettings 不完整，显示加载中
  if (!localSettings || !localSettings.aiProviders) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">设置</h2>
          <button
            onClick={toggleSettings}
            className="text-2xl hover:bg-[var(--bg-tertiary)] rounded p-1"
          >
            ×
          </button>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center text-[var(--text-secondary)]">
            <p>{t('settings.loading')}</p>
          </div>
        </div>
      </div>
    );
  }
  
  const poeProvider = localSettings?.aiProviders?.find(p => p.type === 'poe');
  const ollamaProvider = localSettings?.aiProviders?.find(p => p.type === 'ollama');

  console.log('🔍 SettingsPanel 渲染:', {
    localSettings,
    poeProvider,
    ollamaProvider,
    hasAiProviders: !!localSettings?.aiProviders
  });

  return (
    <div className="p-8 max-h-[80vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{t('settings.title')}</h2>
        </div>
        <button
          onClick={toggleSettings}
          className="w-10 h-10 flex items-center justify-center hover:bg-[var(--bg-hover)] rounded-xl transition-all"
        >
          <svg className="w-6 h-6 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-6">
        {/* Language Selection */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-2xl p-6 border border-[var(--border-color)] shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            <label className="text-sm font-semibold text-[var(--text-primary)]">{t('settings.language')}</label>
          </div>
          <select
            value={i18n.language}
            onChange={(e) => {
              i18n.changeLanguage(e.target.value);
            }}
            className="w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border-2 border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent transition-all shadow-sm"
          >
            <option value="zh">🇨🇳 简体中文</option>
            <option value="en">🇺🇸 English</option>
            <option value="ja">🇯🇵 日本語</option>
            <option value="ko">🇰🇷 한국어</option>
            <option value="es">🇪🇸 Español</option>
            <option value="fr">🇫🇷 Français</option>
            <option value="de">🇩🇪 Deutsch</option>
          </select>
        </div>

        {/* AI Provider Selection */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-6 border border-[var(--border-color)] shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <label className="text-sm font-semibold text-[var(--text-primary)]">{t('settings.defaultProvider')}</label>
          </div>
          <select
            value={localSettings.defaultProvider}
            onChange={(e) => setLocalSettings({ ...localSettings, defaultProvider: e.target.value as 'poe' | 'ollama' })}
            className="w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border-2 border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent transition-all shadow-sm"
          >
            <option value="poe">🌐 {t('settings.poeCloud')}</option>
            <option value="ollama">💻 {t('settings.ollamaLocal')}</option>
          </select>
        </div>

        {/* Poe Configuration */}
        {poeProvider && (
          <div className="border-2 border-[var(--border-color)] rounded-2xl p-6 bg-[var(--bg-secondary)] shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                  <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg text-[var(--text-primary)]">{t('settings.poeConfig')}</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--bg-hover)] transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={poeProvider?.enabled ?? true}
                    onChange={(e) => handleProviderChange(
                      localSettings?.aiProviders?.findIndex(p => p.type === 'poe') ?? 0,
                      'enabled',
                      e.target.checked
                    )}
                    className="w-5 h-5 rounded border-2 border-[var(--border-color)] text-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium">{t('settings.enablePoe')}</span>
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">{t('settings.apiKey')}</label>
                <div className="relative">
                  <input
                    type="password"
                    value={poeProvider?.poeApiKey || ''}
                    onChange={(e) => handleProviderChange(
                      localSettings?.aiProviders?.findIndex(p => p.type === 'poe') ?? 0,
                      'poeApiKey',
                      e.target.value
                    )}
                    placeholder={t('settings.apiKeyPlaceholder')}
                    className="w-full px-4 py-3 pl-11 rounded-xl bg-[var(--bg-primary)] border-2 border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ollama Configuration */}
        {ollamaProvider && (
          <div className="border-2 border-[var(--border-color)] rounded-2xl p-6 bg-[var(--bg-secondary)] shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg text-[var(--text-primary)]">{t('settings.ollamaConfig')}</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--bg-hover)] transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ollamaProvider?.enabled ?? true}
                    onChange={(e) => handleProviderChange(
                      localSettings?.aiProviders?.findIndex(p => p.type === 'ollama') ?? 1,
                      'enabled',
                      e.target.checked
                    )}
                    className="w-5 h-5 rounded border-2 border-[var(--border-color)] text-purple-500 focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium">{t('settings.enableOllama')}</span>
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">{t('settings.serverAddress')}</label>
                <div className="relative">
                  <input
                    type="text"
                    value={ollamaProvider?.ollamaBaseUrl || 'http://localhost:11434'}
                    onChange={(e) => handleProviderChange(
                      localSettings?.aiProviders?.findIndex(p => p.type === 'ollama') ?? 1,
                      'ollamaBaseUrl',
                      e.target.value
                    )}
                    placeholder="http://localhost:11434"
                    className="w-full px-4 py-3 pl-11 rounded-xl bg-[var(--bg-primary)] border-2 border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Default Model */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-6 border border-[var(--border-color)] shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            <label className="text-sm font-semibold text-[var(--text-primary)]">{t('settings.defaultModel')}</label>
          </div>
          <select
            value={localSettings.defaultModel}
            onChange={(e) => setLocalSettings({ ...localSettings, defaultModel: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border-2 border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-sm"
          >
            <optgroup label={`☁️ ${t('settings.poeModels')}`}>
              <option value="Claude-Sonnet-4.5">⭐ Claude-Sonnet-4.5 (推荐 - 200k)</option>
              <option value="GPT-5-Chat">🚀 GPT-5-Chat (400k)</option>
              <option value="Claude-3-Sonnet">Claude-3-Sonnet (200k)</option>
              <option value="GPT-4o">GPT-4o (128k)</option>
              <option value="Claude-3.5-Sonnet">Claude-3.5-Sonnet (200k)</option>
              <option value="GPT-4-Turbo">GPT-4-Turbo (128k)</option>
            </optgroup>
            <optgroup label={`💻 ${t('settings.ollamaModels')}`}>
              <option value="llama2">🦙 llama2</option>
              <option value="mistral">🌪️ mistral</option>
              <option value="deepseek-r1:8b">🔍 deepseek-r1:8b</option>
              <option value="qwen2.5:7b">🎯 qwen2.5:7b</option>
              <option value="llama3.1:8b">🦙 llama3.1:8b</option>
            </optgroup>
          </select>
          <p className="text-xs text-[var(--text-tertiary)] mt-3 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            上下文长度显示在状态栏
          </p>
        </div>

        {/* Theme & Auto Save */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Theme */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-6 border border-[var(--border-color)] shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <label className="text-sm font-semibold text-[var(--text-primary)]">{t('settings.theme')}</label>
            </div>
            <select
              value={localSettings.theme}
              onChange={(e) => {
                const theme = e.target.value as 'light' | 'dark';
                setLocalSettings({ ...localSettings, theme });
                setTheme(theme);
              }}
              className="w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border-2 border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all shadow-sm"
            >
              <option value="light">☀️ {t('settings.light')}</option>
              <option value="dark">🌙 {t('settings.dark')}</option>
            </select>
          </div>

          {/* Auto Save */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 border border-[var(--border-color)] shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              <label className="text-sm font-semibold text-[var(--text-primary)]">{t('settings.autoSave')}</label>
            </div>
            <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--bg-hover)] transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={localSettings.autoSave}
                onChange={(e) => setLocalSettings({ ...localSettings, autoSave: e.target.checked })}
                className="w-5 h-5 rounded border-2 border-[var(--border-color)] text-green-500 focus:ring-2 focus:ring-green-500"
              />
              <span className="text-sm font-medium">{t('settings.enableAutoSave')}</span>
            </label>
            {localSettings.autoSave && (
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                  {t('settings.saveDelay')}: {localSettings.autoSaveDelay}ms
                </label>
                <input
                  type="range"
                  min="500"
                  max="5000"
                  step="500"
                  value={localSettings.autoSaveDelay}
                  onChange={(e) => setLocalSettings({ ...localSettings, autoSaveDelay: parseInt(e.target.value) })}
                  className="w-full h-2 bg-[var(--bg-tertiary)] rounded-lg appearance-none cursor-pointer accent-green-500"
                />
                <div className="flex justify-between text-xs text-[var(--text-tertiary)] mt-1">
                  <span>500ms</span>
                  <span>5000ms</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* STT Service */}
        <div className="border-2 border-[var(--border-color)] rounded-2xl p-6 bg-[var(--bg-secondary)] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg text-[var(--text-primary)]">{t('settings.sttService')}</h3>
            </div>
            <button
              onClick={async () => {
                const { setSttStatus } = useAppStore.getState();
                setSttStatus('unknown');
                
                const ws = new WebSocket('ws://localhost:8765');
                const timeout = setTimeout(() => {
                  if (ws.readyState !== WebSocket.OPEN) {
                    ws.close();
                    setSttStatus('disconnected');
                    alert('STT 服务连接失败\n\n请确保服务已启动：\npython stt_server.py');
                  }
                }, 2000);

                ws.onopen = () => {
                  clearTimeout(timeout);
                  setSttStatus('connected');
                  alert('STT 服务连接成功！');
                  ws.close();
                };

                ws.onerror = () => {
                  clearTimeout(timeout);
                  setSttStatus('disconnected');
                  alert('STT 服务连接失败\n\n请确保服务已启动：\npython stt_server.py');
                };
              }}
              className="px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:from-pink-600 hover:to-pink-700 transition-all font-medium shadow-sm hover:shadow flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{t('settings.reconnectSTT')}</span>
            </button>
          </div>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            语音识别服务地址：<code className="px-2 py-1 bg-[var(--bg-tertiary)] rounded text-xs">ws://localhost:8765</code>
          </p>
          <p className="text-xs text-[var(--text-tertiary)] mt-2">
            状态栏会显示 STT 服务连接状态
          </p>
        </div>

        {/* Database Path */}
        <div className="border-2 border-[var(--border-color)] rounded-2xl p-6 bg-[var(--bg-secondary)] shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
                <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
                <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg text-[var(--text-primary)]">{t('settings.databaseSettings')}</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">{t('settings.databasePath')}</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={localSettings.databasePath || ''}
                    onChange={(e) => setLocalSettings({ ...localSettings, databasePath: e.target.value })}
                    placeholder={t('settings.databasePathPlaceholder')}
                    className="w-full px-4 py-3 pl-11 rounded-xl bg-[var(--bg-primary)] border-2 border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <button
                  onClick={async () => {
                    const { open } = await import('@tauri-apps/plugin-dialog');
                    const selected = await open({
                      directory: true,
                      multiple: false,
                      defaultPath: localSettings.databasePath,
                    });
                    if (selected) {
                      const folderPath = selected as string;
                      const dbPath = folderPath.endsWith('/') || folderPath.endsWith('\\') 
                        ? `${folderPath}ai_notes.db` 
                        : `${folderPath}/ai_notes.db`;
                      setLocalSettings({ ...localSettings, databasePath: dbPath });
                    }
                  }}
                  className="px-4 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl hover:from-indigo-600 hover:to-indigo-700 transition-all whitespace-nowrap font-medium shadow-sm hover:shadow flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span>{t('settings.selectFolder')}</span>
                </button>
              </div>
              <div className="mt-3 space-y-2">
                <p className="text-xs text-[var(--text-tertiary)] flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>选择文件夹后，数据库文件 (ai_notes.db) 将保存在该文件夹下</span>
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>更改路径后，现有数据会自动复制到新位置</span>
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const { invoke } = await import('@tauri-apps/api/core');
                  try {
                    const defaultPath = await invoke<string>('get_default_db_path');
                    alert(`默认路径：\n${defaultPath}`);
                  } catch (error) {
                    alert(`获取默认路径失败：${error}`);
                  }
                }}
                className="text-xs px-3 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors font-medium"
              >
                {t('settings.viewDefaultPath')}
              </button>
              <button
                onClick={async () => {
                  const { invoke } = await import('@tauri-apps/api/core');
                  try {
                    const currentPath = await invoke<string>('get_current_db_path');
                    alert(t('settings.currentPathResult', { path: currentPath }));
                  } catch (error) {
                    alert(t('settings.getPathFailed', { error: String(error) }));
                  }
                }}
                className="text-xs px-3 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors font-medium"
              >
                {t('settings.viewCurrentPath')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-8 flex gap-3 sticky bottom-0 bg-[var(--bg-primary)] pt-4 border-t border-[var(--border-color)]">
        <button
          onClick={() => {
            useAppStore.getState().toggleBackup();
          }}
          className="px-6 py-3.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all font-semibold shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          <span>{t('settings.backupManagement')}</span>
        </button>
        <button
          onClick={handleSave}
          className="flex-1 px-6 py-3.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{t('settings.saveSettings')}</span>
        </button>
        <button
          onClick={async () => {
            const confirmed = confirm('确定要重置所有设置为默认值吗？');
            if (confirmed) {
              const { invoke } = await import('@tauri-apps/api/core');
              try {
                await invoke('reset_settings');
                alert('设置已重置，请重新加载应用');
                window.location.reload();
              } catch (error) {
                alert(`重置失败：${error}`);
              }
            }
          }}
          className="px-6 py-3.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all font-semibold shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{t('settings.resetSettings')}</span>
        </button>
        <button
          onClick={toggleSettings}
          className="px-6 py-3.5 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-xl hover:bg-[var(--bg-hover)] transition-all font-semibold shadow-sm hover:shadow flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>{t('common.cancel')}</span>
        </button>
      </div>
    </div>
  );
};
