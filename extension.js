const vscode = require('vscode');

const { translate, formator } = require('./translator');


function getConfig(key) {
  const config = vscode.workspace.getConfiguration().smartyTranslator;

  return key === undefined ? config : config[key];
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const disposableTranslate = vscode.commands.registerCommand('extension.smartyTranslate', () => {
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
    translate(text.toLocaleLowerCase())
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

  context.subscriptions.push(disposableTranslate);

  if(getConfig('useHover')) {
    const disposableHover = vscode.languages.registerHoverProvider('*', {
      provideHover(document, position) {
        let text = document.getText(vscode.window.activeTextEditor.selection);
        if(!text) {
          const readText = document.getText(document.getWordRangeAtPosition(position, /[a-zA-Z]+/));
          text = readText;
        }
        if(text) {
          return new Promise((resolve, reject) => {
            translate(text.toLocaleLowerCase())
              .then(data => {
                if(data) {
                  const msg = formator(data, true);
                  console.log('msg', msg.join('\n\n'));
                  const markdown = new vscode.MarkdownString(msg.join('\n\n'));
                  markdown.isTrusted = true;
                  markdown.supportHtml = true;
                  resolve(new vscode.Hover(markdown));
                }
              })
              .catch(reject);
          });
        }
      }
    });

    context.subscriptions.push(disposableHover);
  }
}

function deactivate() {}


module.exports = {
  activate,
  deactivate
}
