import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const searchPluginKey = new PluginKey('search');

export const SearchExtension = Extension.create({
  name: 'search',

  addStorage() {
    return {
      searchTerm: '',
      activeMatchIndex: 0,
      results: [],
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        key: searchPluginKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, oldState) {
            const { searchTerm, activeMatchIndex } = editor.storage.search;

            if (!tr.docChanged && !tr.getMeta('search-update')) {
              return oldState.map(tr.mapping, tr.doc);
            }

            if (!searchTerm) {
              editor.storage.search.results = [];
              return DecorationSet.empty;
            }

            const doc = tr.doc;
            const results = [];
            
            doc.descendants((node, pos) => {
              if (node.isText) {
                const text = node.text.toLowerCase();
                const term = searchTerm.toLowerCase();
                let startIndex = 0;
                let index;
                while ((index = text.indexOf(term, startIndex)) > -1) {
                  results.push({
                    from: pos + index,
                    to: pos + index + term.length,
                  });
                  startIndex = index + term.length;
                }
              }
            });

            editor.storage.search.results = results;

            const decorations = results.map((result, idx) => {
              const isActive = idx === activeMatchIndex;
              return Decoration.inline(result.from, result.to, {
                nodeName: 'mark',
                class: isActive ? 'search-highlight-active' : 'search-highlight',
                style: isActive ? 'background-color: #ff9632 !important; color: #000 !important; border-radius: 2px !important; padding: 0 2px !important; box-shadow: 0 0 0 2px rgba(255, 150, 50, 0.5) !important;' : 'background-color: rgba(255, 255, 0, 0.4) !important; color: inherit !important; border-radius: 2px !important; padding: 0 2px !important;'
              });
            });

            return DecorationSet.create(doc, decorations);
          },
        },
        props: {
          decorations(state) {
            return searchPluginKey.getState(state);
          },
        },
      }),
    ];
  },
});
