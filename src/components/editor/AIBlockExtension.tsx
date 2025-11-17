import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { AIBlockComponent } from './AIBlockComponent';

export interface AIBlockAttrs {
  prompt: string;
  response: string;
  status: 'streaming' | 'complete' | 'accepted' | 'discarded';
  model: string;
  timestamp: number;
}

export const AIBlockExtension = Node.create({
  name: 'aiBlock',

  group: 'block',

  content: 'inline*',

  atom: true,

  addAttributes() {
    return {
      prompt: {
        default: '',
      },
      response: {
        default: '',
      },
      status: {
        default: 'streaming',
      },
      model: {
        default: '',
      },
      timestamp: {
        default: Date.now(),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="ai-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'ai-block' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AIBlockComponent);
  },
});
