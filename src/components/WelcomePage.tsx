import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/useAppStore';

export const WelcomePage: React.FC = () => {
  const { t } = useTranslation();
  const { documents, createDocument, toggleTodos, toggleSettings, folders } = useAppStore();
  const [showFolderSelect, setShowFolderSelect] = React.useState(false);
  const [showNameInput, setShowNameInput] = React.useState(false);
  const [documentName, setDocumentName] = React.useState('');
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | undefined>();

  const handleCreateDocument = async () => {
    const title = documentName.trim() || `${t('editor.newDocumentTitle')} ${new Date().toLocaleString()}`;
    await createDocument(title, selectedFolderId);
    setShowFolderSelect(false);
    setShowNameInput(false);
    setDocumentName('');
    setSelectedFolderId(undefined);
  };

  const handleNewDocClick = () => {
    setShowNameInput(true);
  };

  const handleNameSubmit = () => {
    if (folders.length > 0) {
      setShowNameInput(false);
      setShowFolderSelect(true);
    } else {
      handleCreateDocument();
    }
  };

  const handleFolderSelect = (folderId?: string) => {
    setSelectedFolderId(folderId);
    handleCreateDocument();
  };

  // 获取最近的文档
  const recentDocuments = [...documents]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 5);

  return (
    <div className="h-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="max-w-4xl w-full px-8">
        {/* 欢迎标题 */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-2xl mb-6">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            {t('welcome.title')}
          </h1>
          <p className="text-lg text-gray-600">
            {t('welcome.subtitle')}
          </p>
        </div>

        {/* 快速操作卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <button
            onClick={handleNewDocClick}
            className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-blue-500"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{t('welcome.newDocument')}</h3>
            <p className="text-sm text-gray-600">{t('welcome.newDocumentDesc')}</p>
          </button>

          <button
            onClick={toggleTodos}
            className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-purple-500"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{t('welcome.globalTodos')}</h3>
            <p className="text-sm text-gray-600">{t('welcome.globalTodosDesc')}</p>
          </button>

          <button
            onClick={toggleSettings}
            className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-pink-500"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{t('welcome.systemSettings')}</h3>
            <p className="text-sm text-gray-600">{t('welcome.systemSettingsDesc')}</p>
          </button>
        </div>

        {/* 最近文档 */}
        {recentDocuments.length > 0 && (
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-2xl font-bold text-gray-800">{t('welcome.recentDocuments')}</h2>
            </div>
            <div className="space-y-3">
              {recentDocuments.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => useAppStore.getState().selectDocument(doc.id)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-all group text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 truncate group-hover:text-blue-600 transition-colors">
                      {doc.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {new Date(doc.updatedAt < 10000000000 ? doc.updatedAt * 1000 : doc.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 提示信息 */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            {t('welcome.tip')}
          </p>
        </div>
      </div>

      {/* 文档名称输入对话框 */}
      {showNameInput && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">{t('welcome.newDocumentTitle')}</h3>
            <input
              type="text"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNameSubmit();
                if (e.key === 'Escape') {
                  setShowNameInput(false);
                  setDocumentName('');
                }
              }}
              placeholder={t('welcome.documentNamePlaceholder')}
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none mb-6 text-gray-800"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowNameInput(false);
                  setDocumentName('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleNameSubmit}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-colors font-medium"
              >
                {t('common.next')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 文件夹选择对话框 */}
      {showFolderSelect && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">{t('welcome.selectFolder')}</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto mb-6">
              <button
                onClick={() => handleFolderSelect()}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-3"
              >
                <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
                <span className="font-medium text-gray-800">{t('sidebar.root')}</span>
              </button>
              {folders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => handleFolderSelect(folder.id)}
                  className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-3"
                >
                  <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                  </svg>
                  <span className="font-medium text-gray-800">{folder.name}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setShowFolderSelect(false);
                setDocumentName('');
              }}
              className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
