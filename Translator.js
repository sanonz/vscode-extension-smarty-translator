const vscode = require('vscode');
const querystring = require('querystring');
const sign = require('./sign');
const request = require('./request');


class Translator {

  async query(word) {
    if (!/^\w+$/.test(word)) {
      return null;
    }

    try {
      // const config = vscode.workspace.getConfiguration().smartyTranslator;
      const client = 'web';
      const from = 'webdict';
      const code = sign(word + from);
      const time = (word + from).length % 10;
      const key = 'Mk6hqtUp33DGGtoS63tTJbMUYjRrG1Lu';
      const lang = 'en'; // config.language;
      const data = {
        q: word,
        le: lang,
        t: time,
        client,
        sign: sign(client + word + time + key + code),
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

}


module.exports = Translator;
