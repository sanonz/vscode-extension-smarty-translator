const crypto = require('crypto');

function sign(text) {
  return crypto
    .createHash('md5')
    .update(text)
    .digest('hex');
}

module.exports = sign;
