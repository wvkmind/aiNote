import React, { useState } from 'react';
import { CustomModel } from '../types';
import { useTranslation } from 'react-i18next';

interface CustomModelConfigProps {
  models: CustomModel[];
  onAdd: (model: Omit<CustomModel, 'id'>) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}

export const CustomModelConfig: React.FC<CustomModelConfigProps> = ({
  models,
  onAdd,
  onDelete,
  onSetDefault,
}) => {
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const [newModel, setNewModel] = useState({
    name: '',
    provider: 'ollama' as 'poe' | 'ollama',
    maxTokens: 8000,
  });

  const handleAdd = () => {
    if (!newModel.name.trim()) {
      alert(t('settings.modelNameRequired'));
      return;
    }
    onAdd(newModel);
    setNewModel({ name: '', provider: 'ollama', maxTokens: 8000 });
    setIsAdding(false);
  };

  return (
    <div className="border-2 border-[var(--border-color)] rounded-2xl p-6 bg-[var(--bg-secondary)] shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <h3 className="font-semibold text-lg text-[var(--text-primary)]">{t('settings.customModels')}</h3>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg hover:from-teal-600 hover:to-teal-700 transition-all font-medium shadow-sm hover:shadow flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>{t('settings.addModel')}</span>
        </button>
      </div>

      {/* Add Model Form */}
      {isAdding && (
        <div className="mb-4 p-4 bg-[var(--bg-primary)] rounded-xl border-2 border-teal-200 dark:border-teal-800">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1 text-[var(--text-secondary)]">
                {t('settings.modelName')}
              </label>
              <input
                type="text"
                value={newModel.name}
                onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                placeholder={t('settings.modelNamePlaceholder')}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-[var(--text-secondary)]">
                  {t('settings.provider')}
                </label>
                <select
                  value={newModel.provider}
                  onChange={(e) => setNewModel({ ...newModel, provider: e.target.value as 'poe' | 'ollama' })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="ollama">Ollama</option>
                  <option value="poe">Poe</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-[var(--text-secondary)]">
                  {t('settings.maxTokens')}
                </label>
                <input
                  type="number"
                  value={newModel.maxTokens}
                  onChange={(e) => setNewModel({ ...newModel, maxTokens: parseInt(e.target.value) || 0 })}
                  min="1000"
                  max="1000000"
                  step="1000"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                className="flex-1 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors font-medium"
              >
                {t('common.confirm')}
              </button>
              <button
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors font-medium"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Models List */}
      {models.length === 0 ? (
        <div className="text-center py-8 text-[var(--text-tertiary)]">
          <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p>{t('settings.noCustomModels')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {models.map((model) => (
            <div
              key={model.id}
              className="flex items-center justify-between p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] hover:border-teal-300 dark:hover:border-teal-700 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[var(--text-primary)]">{model.name}</span>
                  {model.isDefault && (
                    <span className="px-2 py-0.5 bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 text-xs rounded-full font-medium">
                      {t('settings.default')}
                    </span>
                  )}
                </div>
                <div className="text-xs text-[var(--text-tertiary)] mt-1">
                  {model.provider === 'poe' ? '☁️ Poe' : '💻 Ollama'} • {(model.maxTokens / 1000).toFixed(0)}k tokens
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!model.isDefault && (
                  <button
                    onClick={() => onSetDefault(model.id)}
                    className="px-3 py-1.5 text-xs bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900 transition-colors font-medium"
                    title={t('settings.setAsDefault')}
                  >
                    {t('settings.setDefault')}
                  </button>
                )}
                <button
                  onClick={() => {
                    if (confirm(t('settings.confirmDeleteModel', { name: model.name }))) {
                      onDelete(model.id);
                    }
                  }}
                  className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title={t('common.delete')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
