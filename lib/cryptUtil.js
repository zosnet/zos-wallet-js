'use strict';

var CryptoJS = require('crypto-js');

var cryptUtil = function cryptUtil() {};

cryptUtil.prototype.init = function (password) {
    this.password = password;
    //this.algorithm = { ecb:'des-ecb',cbc:'des-cbc' }
    this.algorithm = { ecb: 'aes-128-cbc', cbc: 'des-cbc' };
};

////加密
// cryptUtil.prototype.encrypt = function(plaintext,iv){
//     var key = new Buffer(this.password);
//     var iv = new Buffer(iv ? iv : 0);
//     var cipher = crypto.createCipheriv(this.algorithm.ecb, key, iv);
//     cipher.setAutoPadding(true) //default true
//     var ciph = cipher.update(plaintext, 'utf8', 'base64');
//     ciph += cipher.final('base64');
//     return ciph;
// },


// //解密
// cryptUtil.prototype.decrypt = function(encrypt_text,iv){
//     var key = new Buffer(this.password);
//     var iv = new Buffer(iv ? iv : 0);
//     var decipher = crypto.createDecipheriv(this.algorithm.ecb, key, iv);
//     decipher.setAutoPadding(true);
//     var txt = decipher.update(encrypt_text, 'base64', 'utf8');
//     txt += decipher.final('utf8');
//     return txt;
//   }

cryptUtil.prototype.encrypt = function (message) {
    //把私钥转换成16进制的字符串
    var keyHex = CryptoJS.enc.Utf8.parse(this.password);
    //模式为ECB padding为Pkcs7
    var encrypted = CryptoJS.DES.encrypt(message, keyHex, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
    });
    //加密出来是一个16进制的字符串
    return encrypted.ciphertext.toString();
};
//DES  ECB模式解密
cryptUtil.prototype.decrypt = function (ciphertext) {
    //把私钥转换成16进制的字符串
    var keyHex = CryptoJS.enc.Utf8.parse(this.password);
    //把需要解密的数据从16进制字符串转换成字符byte数组
    var decrypted = CryptoJS.DES.decrypt({
        ciphertext: CryptoJS.enc.Hex.parse(ciphertext)
    }, keyHex, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
    });
    //以utf-8的形式输出解密过后内容
    var result_value = decrypted.toString(CryptoJS.enc.Utf8);
    return result_value;
};

module.exports = cryptUtil;