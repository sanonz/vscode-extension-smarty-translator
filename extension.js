const vscode = require('vscode');
const Translator = require('./Translator');


let translator = null;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  translator = new Translator();

  const disposable = vscode.commands.registerCommand('extension.smartyTranslate', () => {
    const editor = vscode.window.activeTextEditor;
    if(!editor) {
      return;
    }

    const selection = editor.selection;
    let text = editor.document.getText(selection);

    const icon = '$(book)';
    const config = getConfig();
    const errorMsg = icon + ' ' + text + ' 翻译失败';
    let bar = vscode.window.setStatusBarMessage(icon + ' 正在翻译 ' + text + ' 中...');
    translator.parse(text.toLocaleLowerCase())
      .then(data => {
        if(data) {
          const msg = formator(data).join('\u00a0\u00a0\u00a0\u00a0');

          if(config.displayMode === 'bar') {
            const args = [icon + ' ' + msg];
            if(config.duration !== 0) {
              args.push(new Promise(resolve => setTimeout(resolve, config.duration)));
            }
            vscode.window.setStatusBarMessage(...args);
          } else {
            vscode.window.showInformationMessage(msg);
          }
        } else {
          if(config.displayMode === 'bar') {
            vscode.window.setStatusBarMessage(errorMsg);
          } else {
            vscode.window.showInformationMessage(errorMsg);
          }
        }
      })
      .catch(error => {
        if(config.displayMode === 'bar') {
          vscode.window.setStatusBarMessage(errorMsg);
        } else {
          vscode.window.showInformationMessage(errorMsg);
        }
      })
      .finally(() => {
        if(bar) {
          bar.dispose();
          bar = null;
        }
      });
  });

  context.subscriptions.push(disposable);

  if(getConfig('useHover')) {
    vscode.languages.registerHoverProvider('*', {
      provideHover(document, position) {
        let text = document.getText(vscode.window.activeTextEditor.selection);
        const readText = document.getText(document.getWordRangeAtPosition(position));
        if(!text || text !== readText) {
          text = readText;
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
}

function getConfig(key) {
  const config = vscode.workspace.getConfiguration().smartyTranslator;
  
  return key === undefined ? config : config[key];
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
