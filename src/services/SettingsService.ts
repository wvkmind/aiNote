import { invoke } from '@tauri-apps/api/core';
import { Settings } from '../types';

export class SettingsService {
  // 将后端的 snake_case 转换为前端的 camelCase
  private convertToCamelCase(backendSettings: any): Settings {
    return {
      aiProviders: backendSettings.ai_providers?.map((p: any) => ({
        type: p.provider_type,
        enabled: p.enabled,
        poeApiKey: p.poe_api_key,
        ollamaBaseUrl: p.ollama_base_url,
      })) || [],
      defaultProvider: backendSettings.default_provider,
      defaultModel: backendSettings.default_model,
      customModels: backendSettings.custom_models?.map((m: any) => ({
        id: m.id,
        name: m.name,
        provider: m.provider,
        maxTokens: m.max_tokens,
        isDefault: m.is_default,
      })) || [],
      theme: backendSettings.theme,
      autoSave: backendSettings.auto_save,
      autoSaveDelay: backendSettings.auto_save_delay,
      databasePath: backendSettings.database_path,
    };
  }

  // 将前端的 camelCase 转换为后端的 snake_case
  private convertToSnakeCase(settings: Settings): any {
    return {
      ai_providers: settings.aiProviders.map(p => ({
        provider_type: p.type,
        enabled: p.enabled,
        poe_api_key: p.poeApiKey,
        ollama_base_url: p.ollamaBaseUrl,
      })),
      default_provider: settings.defaultProvider,
      default_model: settings.defaultModel,
      custom_models: settings.customModels?.map(m => ({
        id: m.id,
        name: m.name,
        provider: m.provider,
        max_tokens: m.maxTokens,
        is_default: m.isDefault,
      })) || [],
      theme: settings.theme,
      auto_save: settings.autoSave,
      auto_save_delay: settings.autoSaveDelay,
      database_path: settings.databasePath,
    };
  }

  async getSettings(): Promise<Settings> {
    try {
      const backendSettings = await invoke<any>('get_settings');
      console.log('📋 SettingsService: 后端返回的设置', backendSettings);
      
      // 确保必要的字段存在
      if (!backendSettings || !backendSettings.ai_providers) {
        console.warn('⚠️ 后端设置不完整，使用默认设置');
        throw new Error('Invalid settings from backend');
      }
      
      const settings = this.convertToCamelCase(backendSettings);
      console.log('📋 SettingsService: 转换后的设置', settings);
      
      // 验证转换后的设置
      if (!settings.aiProviders || settings.aiProviders.length === 0) {
        console.warn('⚠️ AI Providers 为空，使用默认设置');
        throw new Error('Invalid AI providers');
      }
      
      return settings;
    } catch (error) {
      console.error('Failed to get settings:', error);
      // Return default settings on error
      return {
        aiProviders: [
          {
            type: 'poe',
            enabled: true,
            poeApiKey: '',
            ollamaBaseUrl: undefined,
          },
          {
            type: 'ollama',
            enabled: true,
            poeApiKey: undefined,
            ollamaBaseUrl: 'http://localhost:11434',
          },
        ],
        defaultProvider: 'poe',
        defaultModel: 'Claude-Sonnet-4.5',
        customModels: [],
        theme: 'light',
        autoSave: true,
        autoSaveDelay: 2000,
        databasePath: undefined,
      };
    }
  }

  async updateSettings(settings: Settings): Promise<void> {
    try {
      const backendSettings = this.convertToSnakeCase(settings);
      console.log('💾 SettingsService: 保存设置到后端', backendSettings);
      await invoke('update_settings', { settings: backendSettings });
    } catch (error) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  }
}
