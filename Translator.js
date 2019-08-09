const vscode = require('vscode');
const querystring = require('querystring');
const sign = require('./sign');
const request = require('./request');


class Translator {

  constructor() {
    this.data = {
      gtk: null,
      token: null,
    };
    this.headers = {};
    this.sessionPromise = this.initialize();
  }

  async initialize() {
    await this.startSession();
    await this.startSession();

    this.sessionPromise = null;
  }

  async startSession() {
    const response = await request.get('/');
    const html = response.data;

    let rs = html.match(/gtk\s*=\s*'([\d.]+)'/);
    if(rs && rs[1]) {
      this.data.gtk = rs[1];
    } else {
      throw new Error('gtk not matched');
    }

    rs = html.match(/token:\s+'(\w{32})'/);
    if(rs && rs[1]) {
      this.data.token = rs[1];
    } else {
      throw new Error('token not matched');
    }
  }

  cleanSession() {
    this.data.gtk = null;
    this.data.token = null;
    this.headers = {};
  }

  getLang(text) {
    return request.post('/langdetect', querystring.stringify({query: text}))
      .then(response => {
        if(response.data.error === 0) {
          return response.data.lan;
        }
      });
  }

  async parse(text) {
    try {
      if(this.sessionPromise) {
        await this.sessionPromise;
      }

      const config = vscode.workspace.getConfiguration().smartyTranslator;
      const fromLang = config.fromLanguage === 'auto' ? await this.getLang(text) : config.fromLanguage;
      const toLang = config.toLanguage === fromLang ? fromLang === 'en' ? 'zh' : 'en' : config.toLanguage;
      const data = {
        from: fromLang,
        to: toLang,
        query: text,
        transtype: 'realtime',
        simple_means_flag: 3,
        sign: sign(text, this.data.gtk),
        token: this.data.token,
      }

      return request.post('/v2transapi', querystring.stringify(data)).then(response => {
        if(response.data.error) {
          if(response.data.error === 998) {
            // token error
            this.startSession();
          }

          vscode.window.showInformationMessage(`
            Translation plugin api request error,
            if you encounter this problem for a long time,
            please Issue contact the author to fix.
          `);

          return null;
        }

        return response.data;
      });
    } catch(error) {
      return Promise.reject(error);
    }
  }

}


module.exports = Translator;
