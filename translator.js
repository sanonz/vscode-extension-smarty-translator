const crypto = require('crypto');
const vscode = require('vscode');
const querystring = require('querystring');

const request = require('./request');

async function translate(word) {
  if (!/^\w+$/.test(word)) {
    return null;
  }

  try {
    // const config = vscode.workspace.getConfiguration().smartyTranslator;
    const client = 'web';
    const from = 'webdict';
    const code = md5(word + from);
    const time = (word + from).length % 10;
    const key = 'Mk6hqtUp33DGGtoS63tTJbMUYjRrG1Lu';
    const lang = 'en'; // config.language;
    const data = {
      q: word,
      le: lang,
      t: time,
      client,
      sign: md5(client + word + time + key + code),
      keyfrom: from,
    };

    const res = await request.post('/jsonapi_s?doctype=json&jsonversion=4', querystring.stringify(data));
    console.log('result', res.data)

    if (!res.data?.input) {
      vscode.window.showInformationMessage(`
        Translation plugin api request error,
        if you encounter this problem for a long time,
        please Issue contact the author to fix.
      `);

      return null;
    }

    return res.data;
  } catch(error) {
    return Promise.reject(error);
  }
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

function md5(text) {
  return crypto
    .createHash('md5')
    .update(text)
    .digest('hex');
}


module.exports = {
  translate,
  formator
};
