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
    translator.query(text.toLocaleLowerCase())
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
    const disposable2 = vscode.languages.registerHoverProvider('*', {
      provideHover(document, position) {
        let text = document.getText(vscode.window.activeTextEditor.selection);
        const readText = document.getText(document.getWordRangeAtPosition(position, /[a-zA-Z]+/));
        if(!text || text !== readText) {
          text = readText;
        }
        if(text) {
          return new Promise((resolve, reject) => {
            translator.query(text.toLocaleLowerCase())
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

    context.subscriptions.push(disposable2);
  }
}

function getConfig(key) {
  const config = vscode.workspace.getConfiguration().smartyTranslator;
  
  return key === undefined ? config : config[key];
}

function formator(data, colorful) {
  const msg = [];
  const result = data.ec;

  const c = (tag) => (colorful ? tag : '');

  if (result) {
    if (result.word) {
      if (result.word.usphone && result.word.ukphone) {
        msg.push(`${c('**<span style="color:#fd9720;">')}${data.input}${c('</span>**')} 美 /${c('<span style="color:#8abc25;">')}${result.word.usphone}${c('</span>')}/  英 /${c('<span style="color:#8abc25;">')}${result.word.ukphone}${c('</span>')}/`);
      } else {
        msg.push(`${c('**<span style="color:#fd9720;">')}${data.input}${c('</span>**')}`);
      }

      for (item of result.word.trs) {
        msg.push(`${item.pos || ''} ${item.tran}`);
      }
    } else if (result.web_trans) {
      for (item of result.web_trans) {
        msg.push(item);
      }
    }

    if (result.exam_type) {
      msg.push(c('*<span style="color:#888888;">') + result.exam_type.join(' / ') + c('</span>*'));
    }
  } else if (data.typos?.typo) {
    for (item of data.typos.typo) {
      msg.push(`[${item.word || ''}] ${item.trans || ''}`);
    }
  }

  return msg;
}

function deactivate() {}


module.exports = {
  activate,
  deactivate
}
