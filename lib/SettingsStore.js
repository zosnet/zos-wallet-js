'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _immutable = require('immutable');

var _immutable2 = _interopRequireDefault(_immutable);

var _lodash = require('lodash');

var _localStorage = require('./lib/common/localStorage.js');

var _localStorage2 = _interopRequireDefault(_localStorage);

var _zosjsWs = require('zosjs-ws');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// import {settingsAPIs} from "api/apiConfig";
// import {clone} from 'lodash'

var CORE_ASSET = 'ZOS'; // Setting this to ZOS to prevent loading issues when used with ZOS chain which is the most usual case currently

var extenkey = '';
var STORAGE_KEY = '__graphene__';
var ss = new _localStorage2.default(STORAGE_KEY + extenkey);

var SettingsStore = function () {
  _createClass(SettingsStore, null, [{
    key: 'getInstance',
    value: function getInstance(settingsAPIs) {
      if (!SettingsStore.instance) {
        SettingsStore.instance = new SettingsStore(settingsAPIs);
      }
      return SettingsStore.instance;
    }
  }]);

  function SettingsStore(settingsAPIs) {
    var _this = this;

    _classCallCheck(this, SettingsStore);

    this.initDone = false;
    this.defaultSettings = _immutable2.default.Map({
      locale: 'en',
      apiServer: settingsAPIs.DEFAULT_WS_NODE,
      faucet_address: settingsAPIs.DEFAULT_FAUCET,
      unit: CORE_ASSET,
      showSettles: false,
      showAssetPercent: false,
      walletLockTimeout: 60 * 10,
      themes: 'darkTheme',
      passwordLogin: true,
      browser_notifications: {
        allow: true,
        additional: {
          transferToMe: true
        }
      }
    });

    // If you want a default value to be translated, add the translation to settings in locale-xx.js
    // and use an object {translate: key} in the defaults array
    var apiServer = settingsAPIs.WS_NODE_LIST;

    var defaults = {
      locale: ['en', 'zh', 'fr', 'ko', 'de', 'es', 'it', 'tr', 'ru', 'ja'],
      apiServer: apiServer,
      unit: [CORE_ASSET, 'USD', 'CNY', 'BTC', 'EUR', 'GBP'],
      showSettles: [{ translate: 'yes' }, { translate: 'no' }],
      showAssetPercent: [{ translate: 'yes' }, { translate: 'no' }],
      themes: ['darkTheme', 'lightTheme', 'midnightTheme'],
      passwordLogin: [{ translate: 'cloud_login' }, { translate: 'local_wallet' }]
      // confirmMarketOrder: [
      //     {translate: "confirm_yes"},
      //     {translate: "confirm_no"}
      // ]
    };

    this.settings = _immutable2.default.Map((0, _lodash.merge)(this.defaultSettings.toJS(), ss.get('settings_v3')));
    if (this.settings.get('themes') === 'olDarkTheme') {
      this.settings = this.settings.set('themes', 'midnightTheme');
    }
    var savedDefaults = ss.get('defaults_v1', {});
    /* Fix for old clients after changing cn to zh */
    if (savedDefaults && savedDefaults.locale) {
      var cnIdx = savedDefaults.locale.findIndex(function (a) {
        return a === 'cn';
      });
      if (cnIdx !== -1) savedDefaults.locale[cnIdx] = 'zh';
    }
    if (savedDefaults && savedDefaults.themes) {
      var olIdx = savedDefaults.themes.findIndex(function (a) {
        return a === 'olDarkTheme';
      });
      if (olIdx !== -1) savedDefaults.themes[olIdx] = 'midnightTheme';
    }

    this.defaults = (0, _lodash.merge)({}, savedDefaults, defaults);

    (savedDefaults.apiServer || []).forEach(function (api) {
      var hasApi = false;
      if (typeof api === 'string') {
        api = { url: api, location: null };
      }
      _this.defaults.apiServer.forEach(function (server) {
        if (server.url === api.url) {
          hasApi = true;
        }
      });

      if (!hasApi) {
        // 循环__graphene__defaults_v1.apiServer,如果this.defaults.apiServer里面没有,则添加到this.defaults.apiServer
        _this.defaults.apiServer.push(api);
      }
    });

    if (!savedDefaults || savedDefaults && (!savedDefaults.apiServer || !savedDefaults.apiServer.length)) {
      var _loop = function _loop(i) {
        var hasApi = false;
        _this.defaults.apiServer.forEach(function (api) {
          if (api.url === apiServer[i].url) {
            hasApi = true;
          }
        });
        if (!hasApi) {
          // 循环settingsAPIs.WS_NODE_LIST,如果如果this.defaults.apiServer里面没有,则插入到this.defaults.apiServer的头
          _this.defaults.apiServer.unshift(apiServer[i]);
        }
      };

      for (var i = apiServer.length - 1; i >= 0; i--) {
        _loop(i);
      }
    }

    this.viewSettings = _immutable2.default.Map(ss.get('viewSettings_v1'));

    this.marketDirections = _immutable2.default.Map(ss.get('marketDirections'));

    this.hiddenAssets = _immutable2.default.List(ss.get('hiddenAssets', []));
    this.hiddenMarkets = _immutable2.default.List(ss.get('hiddenMarkets', []));

    this.apiLatencies = ss.get('apiLatencies', {});

    this.mainnet_faucet = ss.get('mainnet_faucet', settingsAPIs.DEFAULT_FAUCET);
    this.testnet_faucet = ss.get('testnet_faucet', settingsAPIs.TESTNET_FAUCET);
  }

  _createClass(SettingsStore, [{
    key: 'init',
    value: function init() {
      var _this2 = this;

      return new Promise(function (resolve) {
        if (_this2.initDone) resolve();
        _this2.starredKey = _this2._getChainKey('markets');
        _this2.marketsKey = _this2._getChainKey('userMarkets');
        // Default markets setup
        var topMarkets = {
          markets_4018d784: [// 要修改 chain_id
          // ZOS MAIN NET
          'OPEN.MKR', 'ZOS', 'OPEN.ETH', 'ICOO', 'BTC', 'OPEN.LISK', 'BKT', 'OPEN.STEEM', 'OPEN.GAME', 'OCT', 'USD', 'CNY', 'BTSR', 'OBITS', 'OPEN.DGD', 'EUR', 'GOLD', 'SILVER', 'IOU.CNY', 'OPEN.DASH', 'OPEN.USDT', 'OPEN.EURT', 'OPEN.BTC', 'CADASTRAL', 'BLOCKPAY', 'BTWTY', 'OPEN.INCNT', 'KAPITAL', 'OPEN.MAID', 'OPEN.SBD', 'OPEN.GRC', 'YOYOW', 'HERO', 'RUBLE', 'SMOKE', 'STEALTH', 'BRIDGE.BCO', 'BRIDGE.BTC', 'KEXCOIN', 'PPY', 'OPEN.EOS', 'OPEN.OMG', 'CVCOIN', 'BRIDGE.ZNY', 'BRIDGE.MONA', 'OPEN.LTC', 'GDEX.BTC', 'GDEX.EOS', 'GDEX.ETH', 'GDEX.BTO', 'WIN.ETH', 'WIN.ETC', 'WIN.HSR', 'RUDEX.STEEM', 'RUDEX.SBD', 'RUDEX.KRM', 'RUDEX.GBG', 'RUDEX.GOLOS', 'RUDEX.MUSE', 'RUDEX.DCT'],
          markets_39f5e2ed: [
          // TESTNET
          'PEG.FAKEUSD', 'BTWTY']
        };

        var bases = {
          markets_4018d784: [
          // ZOS MAIN NET
          'USD', 'OPEN.BTC', 'CNY', 'ZOS', 'BTC'],
          markets_39f5e2ed: [
          // TESTNET
          'TEST']
        };

        var coreAssets = {
          markets_4018d784: 'ZOS',
          markets_39f5e2ed: 'TEST'
        };
        var coreAsset = coreAssets[_this2.starredKey] || 'ZOS';
        _this2.defaults.unit[0] = coreAsset;

        var chainBases = bases[_this2.starredKey] || bases.markets_4018d784;
        _this2.preferredBases = _immutable2.default.List(chainBases);

        function addMarkets(target, base, markets) {
          markets.filter(function (a) {
            return a !== base;
          }).forEach(function (market) {
            target.push([market + '_' + base, { quote: market, base: base }]);
          });
        }

        var defaultMarkets = [];
        var chainMarkets = topMarkets[_this2.starredKey] || [];
        _this2.preferredBases.forEach(function (base) {
          addMarkets(defaultMarkets, base, chainMarkets);
        });

        _this2.defaultMarkets = _immutable2.default.Map(defaultMarkets);
        _this2.starredMarkets = _immutable2.default.Map(ss.get(_this2.starredKey, []));
        _this2.userMarkets = _immutable2.default.Map(ss.get(_this2.marketsKey, {}));

        _this2.initDone = true;
        resolve();
      });
    }
  }, {
    key: 'getSetting',
    value: function getSetting(setting) {
      return this.settings.get(setting);
    }
  }, {
    key: 'onChangeSetting',
    value: function onChangeSetting(payload) {
      this.settings = this.settings.set(payload.setting, payload.value);

      switch (payload.setting) {
        case 'faucet_address':
          if (payload.value.indexOf('testnet') === -1) {
            this.mainnet_faucet = payload.value;
            ss.set('mainnet_faucet', payload.value);
          } else {
            this.testnet_faucet = payload.value;
            ss.set('testnet_faucet', payload.value);
          }
          break;

        case 'apiServer':
          var faucetUrl = payload.value.indexOf('testnet') !== -1 ? this.testnet_faucet : this.mainnet_faucet;
          this.settings = this.settings.set('faucet_address', faucetUrl);
          break;

        case 'walletLockTimeout':
          ss.set('lockTimeout', payload.value);
          break;

        default:
          break;
      }

      ss.set('settings_v3', this.settings.toJS());
    }
  }, {
    key: 'onChangeViewSetting',
    value: function onChangeViewSetting(payload) {
      for (var key in payload) {
        this.viewSettings = this.viewSettings.set(key, payload[key]);
      }

      ss.set('viewSettings_v1', this.viewSettings.toJS());
    }
  }, {
    key: 'onChangeMarketDirection',
    value: function onChangeMarketDirection(payload) {
      for (var key in payload) {
        this.marketDirections = this.marketDirections.set(key, payload[key]);
      }
      ss.set('marketDirections', this.marketDirections.toJS());
    }
  }, {
    key: 'onHideAsset',
    value: function onHideAsset(payload) {
      if (payload.id) {
        if (!payload.status) {
          this.hiddenAssets = this.hiddenAssets.delete(this.hiddenAssets.indexOf(payload.id));
        } else {
          this.hiddenAssets = this.hiddenAssets.push(payload.id);
        }
      }

      ss.set('hiddenAssets', this.hiddenAssets.toJS());
    }
  }, {
    key: 'onHideMarket',
    value: function onHideMarket(payload) {
      if (payload.id) {
        if (!payload.status) {
          this.hiddenMarkets = this.hiddenMarkets.delete(this.hiddenMarkets.indexOf(payload.id));
        } else {
          this.hiddenMarkets = this.hiddenMarkets.push(payload.id);
        }
      }

      ss.set('hiddenMarkets', this.hiddenMarkets.toJS());
    }
  }, {
    key: 'onAddStarMarket',
    value: function onAddStarMarket(market) {
      var marketID = market.quote + '_' + market.base;
      if (!this.starredMarkets.has(marketID)) {
        this.starredMarkets = this.starredMarkets.set(marketID, {
          quote: market.quote,
          base: market.base
        });

        ss.set(this.starredKey, this.starredMarkets.toJS());
      } else {
        return false;
      }
    }
  }, {
    key: 'onSetUserMarket',
    value: function onSetUserMarket(payload) {
      var marketID = payload.quote + '_' + payload.base;
      if (payload.value) {
        this.userMarkets = this.userMarkets.set(marketID, {
          quote: payload.quote,
          base: payload.base
        });
      } else {
        this.userMarkets = this.userMarkets.delete(marketID);
      }
      ss.set(this.marketsKey, this.userMarkets.toJS());
    }
  }, {
    key: 'onRemoveStarMarket',
    value: function onRemoveStarMarket(market) {
      var marketID = market.quote + '_' + market.base;

      this.starredMarkets = this.starredMarkets.delete(marketID);

      ss.set(this.starredKey, this.starredMarkets.toJS());
    }
  }, {
    key: 'onClearStarredMarkets',
    value: function onClearStarredMarkets() {
      this.starredMarkets = _immutable2.default.Map({});
      ss.set(this.starredKey, this.starredMarkets.toJS());
    }
  }, {
    key: 'onAddWS',
    value: function onAddWS(ws) {
      if (typeof ws === 'string') {
        ws = { url: ws, location: null };
      }
      this.defaults.apiServer.push(ws);
      ss.set('defaults_v1', this.defaults);
    }
  }, {
    key: 'onRemoveWS',
    value: function onRemoveWS(index) {
      this.defaults.apiServer.splice(index, 1);
      ss.set('defaults_v1', this.defaults);
    }
  }, {
    key: 'onHideWS',
    value: function onHideWS(url) {
      var node = this.defaults.apiServer.find(function (node) {
        return node.url === url;
      });
      node.hidden = true;
      ss.set('defaults_v1', this.defaults);
    }
  }, {
    key: 'onShowWS',
    value: function onShowWS(url) {
      var node = this.defaults.apiServer.find(function (node) {
        return node.url === url;
      });
      node.hidden = false;
      ss.set('defaults_v1', this.defaults);
    }
  }, {
    key: 'onClearSettings',
    value: function onClearSettings(resolve) {
      ss.remove('settings_v3');
      this.settings = this.defaultSettings;

      ss.set('settings_v3', this.settings.toJS());

      if (resolve) {
        resolve();
      }
    }
  }, {
    key: '_getChainKey',
    value: function _getChainKey(key) {
      var chainId = _zosjsWs.Apis.instance().chain_id;
      return key + (chainId ? '_' + chainId.substr(0, 8) : '');
    }
  }, {
    key: 'onUpdateLatencies',
    value: function onUpdateLatencies(latencies) {
      ss.set('apiLatencies', latencies);
      this.apiLatencies = latencies;
    }
  }, {
    key: 'getLastBudgetObject',
    value: function getLastBudgetObject() {
      return ss.get(this._getChainKey('lastBudgetObject'), '2.13.1');
    }
  }, {
    key: 'setLastBudgetObject',
    value: function setLastBudgetObject(value) {
      ss.set(this._getChainKey('lastBudgetObject'), value);
    }
  }], [{
    key: 'setKey',
    value: function setKey(ws) {
      extenkey = ws;
    }
  }]);

  return SettingsStore;
}();

exports.default = SettingsStore;