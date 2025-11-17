import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';

// 上下文分隔符节点视图
const ContextSeparatorView = ({ deleteNode }: any) => {
  return (
    <NodeViewWrapper className="context-separator">
      <div className="flex items-center gap-3 my-6 select-none group">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-300 to-transparent"></div>
        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-full shadow-sm">
          <span className="text-purple-600">🧹</span>
          <span className="text-sm font-medium text-purple-700">上下文已清除</span>
          <span className="text-xs text-purple-500">此行以上内容不会作为 AI 上下文</span>
          <button
            onClick={deleteNode}
            className="ml-2 p-1 hover:bg-red-100 rounded-full transition-colors opacity-0 group-hover:opacity-100"
            title="删除分隔符"
          >
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-300 to-transparent"></div>
      </div>
    </NodeViewWrapper>
  );
};

// 上下文分隔符扩展
export const ContextSeparatorExtension = Node.create({
  name: 'contextSeparator',

  group: 'block',

  atom: true,

  parseHTML() {
    return [
      {
        tag: 'div[data-type="context-separator"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'context-separator' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ContextSeparatorView);
  },

  addCommands() {
    return {
      insertContextSeparator:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
          });
        },
    };
  },
});
