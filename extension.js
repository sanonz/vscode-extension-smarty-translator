const vscode = require('vscode');
const Translator = require('./Translator');


let translator = null;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  translator = new Translator();

  let disposable = vscode.commands.registerCommand('extension.smartyTranslate', () => {
    const editor = vscode.window.activeTextEditor;
    if(!editor) {
      return;
    }

    const selection = editor.selection;
    let text = editor.document.getText(selection);
    if(!text) {
      return;
    }

    translator.parse(text.toLocaleLowerCase())
      .then(data => {
        if(data) {
          const msg = formator(data).join('\u00a0\u00a0\u00a0\u00a0');
          const config = vscode.workspace.getConfiguration().smartyTranslator;

          if(config.displayMode === 'bar') {
            const args = ['$(book) ' + msg];
            if(config.duration !== 0) {
              args.push(new Promise(resolve => setTimeout(resolve, config.duration)));
            }
            vscode.window.setStatusBarMessage(...args);
          } else {
            vscode.window.showInformationMessage(msg);
          }
        }
      });
  });

  context.subscriptions.push(disposable);

  vscode.languages.registerHoverProvider('*', {
    provideHover(document, position) {
      const config = vscode.workspace.getConfiguration().smartyTranslator;
      let text = document.getText(vscode.window.activeTextEditor.selection);
      if(!text && config.useAutoMatch) {
        text = document.getText(document.getWordRangeAtPosition(position));
      }
      if(text) {
        return new Promise((resolve, reject) => {
          translator.parse(text.toLocaleLowerCase())
            .then(data => {
              if(data) {
                const msg = formator(data);
                resolve(new vscode.Hover(msg.join('\n\n')));
              }
            })
            .catch(reject);
        });
      }
    }
  });
}

function formator(data) {
  const msg = [];
  if(data.dict_result.simple_means) {
    const symbols = data.dict_result.simple_means.symbols;

    symbols.forEach(symbol => {
      let arr = [];
      if(!!symbol.ph_am) {
        arr.push('英/' + symbol.ph_am + '/');
      }
      if(!!symbol.ph_en) {
        arr.push('美/' + symbol.ph_en + '/');
      }
      msg.push(arr.join(' '));

      symbol.parts.forEach(part => {
        arr.length = 0;
        if(!!part.part) {
          arr.push(part.part);
        }
        if(!!part.part_name) {
          arr.push('[' + part.part_name + ']');
        }

        arr.push(part.means.join('; '));
        msg.push(arr.join(' '));
      });
    });
  } else if(data.trans_result) {
    const rs = data.trans_result.data;
    if(rs && rs[0]) {
      msg.push(data.trans_result.data[0].dst);
    }
  }

  return msg;
}

function deactivate() {}


module.exports = {
  activate,
  deactivate
}
