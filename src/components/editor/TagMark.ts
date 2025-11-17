import { Mark, mergeAttributes } from '@tiptap/core';

export interface TagMarkOptions {
  HTMLAttributes: Record<string, any>;
  onTagClick?: (tagId: string) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tagMark: {
      setTagMark: (attributes: { tagId: string }) => ReturnType;
      unsetTagMark: () => ReturnType;
      removeTagMark: (tagId: string) => ReturnType;
    };
  }
}

export const TagMark = Mark.create<TagMarkOptions>({
  name: 'tagMark',

  addOptions() {
    return {
      HTMLAttributes: {},
      onTagClick: undefined,
    };
  },

  addAttributes() {
    return {
      tagId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-tag-id'),
        renderHTML: (attributes) => {
          if (!attributes.tagId) {
            return {};
          }
          return {
            'data-tag-id': attributes.tagId,
            'class': 'tag-highlight',
            'title': '点击查看标签',
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'mark[data-tag-id]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'mark',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'tag-highlight',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setTagMark:
        (attributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes);
        },
      unsetTagMark:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
      removeTagMark:
        (tagId: string) =>
        ({ tr, state }) => {
          const { doc } = state;
          let found = false;

          doc.descendants((node, pos) => {
            if (node.marks) {
              node.marks.forEach((mark) => {
                if (mark.type.name === 'tagMark' && mark.attrs.tagId === tagId) {
                  const from = pos;
                  const to = pos + node.nodeSize;
                  tr.removeMark(from, to, mark.type);
                  found = true;
                }
              });
            }
          });

          return found;
        },
    };
  },
});
