angular.module('ngSockethubClient', ['ngRemoteStorageClient']).
factory('SH', ['$rootScope', '$q', 'RS',
function ($rootScope, $q, RS) {

  var sc;

  var config = {
    host: '',
    port: '',
    secret: ''
  };

  function existsConfig() {
    if ((config.host !== '') &&
        (config.port !== '') &&
        (config.secret !== '')) {
      return true;
    } else {
      return false;
    }
  }

  function setConfig(host, port, secret) {
    var defer = $q.defer();

    console.log('SH.setConfig: '+host+', '+port+', '+secret);
    config.host = host;
    config.port = port;
    config.secret = secret;

    RS.call('sockethub', 'writeConfig', [config]).then(defer.resolve, defer.reject);

    return defer.promise;
  }

  function getConfig() {
    var defer = $q.defer();
    if (!existsConfig()) {
      RS.call('sockethub', 'getConfig', []).then(function (cfg) {
        config.host = cfg.host;
        config.port = cfg.port;
        config.secret = cfg.secret;
        defer.resolve(cfg);
      }, defer.reject);
    } else {
      defer.resolve(config);
    }
    return defer.promise;
  }

  function isConnected() {
    if (sc) {
      return sc.isConnected();
    } else {
      return false;
    }
  }

  function isRegistered() {
    if (sc) {
      return sc.isRegistered();
    } else {
      return false;
    }
  }

  function register() {
    var defer = $q.defer();
    sc.register({
      secret: config.secret
    }).then(function () {
      //console.log('ngSockethubClient.register: registration success ['+sc.isConnected()+']');
      $rootScope.$apply(defer.resolve);
    }, function (err) { // sockethub registration fail
      console.log('ngSockethubClient.register: registration failed: ', err);
      $rootScope.$apply(function () {
        defer.reject(err.message);
      });
    });
    return defer.promise;
  }

  function connect() {
    var defer = $q.defer();
    SockethubClient.connect({
      host: 'ws://' + config.host + ':' + config.port + '/sockethub',
      confirmationTimeout: 3000,   // timeout in miliseconds to wait for confirm
      enablePings: true            // good for keepalive
    }).then(function (connection) {
      sc = connection;
      sc.on('message', function (data) {
        console.log('SH received message: ', data);
      });
      sc.on('error', function (data) {
        console.log('SH received error: ', data);
      });
      sc.on('response', function (data) {
        console.log('SH received response: ', data);
      });
      sc.on('close', function (data) {
        console.log('SH received close: ', data);
      });
      $rootScope.$apply(function () {
        defer.resolve();
      });
    }, function (err) { // sockethub connection failed
      $rootScope.$apply(function () {
        //console.log('ngSockethubClient.connect: received error on connect: ', err);
        defer.reject(err);
      });
    });
    return defer.promise;
  }

  function sendSet(platform, type, index, object) {
    var defer = $q.defer();
    var data = {};
    data[type] = {};
    data[type][index] = object;
    sc.set(platform, data).then(function () {
      $rootScope.$apply(function () {
        defer.resolve();
      });
    }, function () {
      $rootScope.$apply(function () {
        defer.reject();
      });
    });

    return defer.promise;
  }

  function sendSubmit(obj, timeout) {
    var defer = $q.defer();

    sc.submit(obj, timeout).then(function () {
      $rootScope.$apply(function () {
        defer.resolve();
      });

    }, function (resp) {
      console.log('ngSockethubClient submit rejection response: ', resp);
      $rootScope.$apply(function () {
        defer.reject(resp.message);
      });
    });

    return defer.promise;
  }

  function on(type, func) {
    sc.on(type, function (data) {
      //console.log('SH passing onmessage ', data);
      $rootScope.$apply(func(data));
    });
  }

  var configFuncs = {
    get: getConfig,
    set: setConfig,
    exists: existsConfig,
    data: config
  };

  return {
    config: configFuncs,
    connect: connect,
    register: register,
    isConnected: isConnected,
    isRegistered: isRegistered,
    set: sendSet,
    submit: sendSubmit,
    on: on
  };
}]);