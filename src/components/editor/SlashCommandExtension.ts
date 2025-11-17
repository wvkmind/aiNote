import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface SlashCommandOptions {
  onSlashCommand: (prompt: string, position: { top: number; left: number }) => void;
}

export const SlashCommandExtension = Extension.create<SlashCommandOptions>({
  name: 'slashCommand',

  addOptions() {
    return {
      onSlashCommand: () => {},
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('slashCommand'),
        
        state: {
          init() {
            return {
              active: false,
              range: null,
            };
          },
          
          apply(tr, value) {
            const { selection } = tr;
            const { $from } = selection;
            
            // 检查光标前的字符是否是 /
            const textBefore = $from.parent.textBetween(
              Math.max(0, $from.parentOffset - 1),
              $from.parentOffset,
              null,
              '\ufffc'
            );
            
            if (textBefore === '/') {
              return {
                active: true,
                range: {
                  from: $from.pos - 1,
                  to: $from.pos,
                },
              };
            }
            
            return {
              active: false,
              range: null,
            };
          },
        },
        
        props: {
          handleKeyDown: (view, event) => {
            const { state } = view;
            const pluginState = this.getState(state);
            
            if (!pluginState.active) return false;
            
            // 按 Enter 键触发命令
            if (event.key === 'Enter') {
              event.preventDefault();
              
              // 获取光标位置
              const { selection } = state;
              const coords = view.coordsAtPos(selection.from);
              
              // 触发回调
              this.options.onSlashCommand('', {
                top: coords.top,
                left: coords.left,
              });
              
              return true;
            }
            
            return false;
          },
        },
      }),
    ];
  },
});
