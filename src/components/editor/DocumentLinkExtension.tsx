import { Mark, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface DocumentLinkOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    documentLink: {
      setDocumentLink: (documentId: string, title: string) => ReturnType;
      unsetDocumentLink: () => ReturnType;
    };
  }
}

export const DocumentLinkExtension = Mark.create<DocumentLinkOptions>({
  name: 'documentLink',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      documentId: {
        default: null,
      },
      title: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'a[data-document-link]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'a',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-document-link': '',
        class: 'document-link',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setDocumentLink:
        (documentId: string, title: string) =>
        ({ commands }) => {
          return commands.setMark(this.name, { documentId, title });
        },
      unsetDocumentLink:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('documentLinkHandler'),
        props: {
          handleClick(view, pos, event) {
            const { doc } = view.state;
            const clickedNode = doc.nodeAt(pos);
            
            if (!clickedNode) return false;

            const mark = clickedNode.marks.find((m) => m.type.name === 'documentLink');
            if (mark) {
              event.preventDefault();
              const documentId = mark.attrs.documentId;
              
              // 触发自定义事件来打开文档
              window.dispatchEvent(
                new CustomEvent('openDocument', { detail: { documentId } })
              );
              
              return true;
            }

            return false;
          },
        },
      }),
    ];
  },
});
