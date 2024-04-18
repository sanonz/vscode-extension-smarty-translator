const axios = require('axios');


const cache = {
  Cookie: {},
};

const host = 'dict.youdao.com';
const protocol = 'https:'
const origin = protocol + '//' + host;

const request = axios.create({
  baseURL: origin,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36',
    'Host': host,
    'Origin': origin,
    'Referer': origin + '/',
  },
});

request.interceptors.request.use(function (config) {
  const arr = [];
  const sep = '; ';
  const str = sep + config.headers.Cookie;
  const cookies = cache.Cookie;
  for(let key in cookies) {
    if(str.indexOf(sep + key + '=') === -1) {
      arr.push([key, cache.Cookie[key]].join('='));
    }
  }

  if (config.headers.Cookie) {
    config.headers.Cookie += arr.join(sep);
  } else {
    config.headers.Cookie = arr.join(sep);
  }

  return config;
}, function (error) {
  return Promise.reject(error);
});

request.interceptors.response.use(function (response) {
  const cookies = response.headers['set-cookie'];
  if(cookies) {
    cookies.forEach(cookie => {
      const arr = cookie.split('; ');
      const [key, value] = arr[0].split('=');
      cache.Cookie[key] = value;
    });
  }

  return response;
}, function (error) {
  return Promise.reject(error);
});


module.exports = request;
