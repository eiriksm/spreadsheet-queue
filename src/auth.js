'use strict';

var cache = require('./cache');

exports.register = function(plugin, options, next) {
  var secure = false;

  if (process.env.NODE_ENV === 'production') {
    secure = true;
  }
  plugin.auth.strategy('session', 'cookie', {
    password: process.env.cookiePass,
    cookie: 'sid-sheets',
    redirectTo: '/',
    isSecure: secure,
    validateFunc: function(session, callback) {
      cache.get(session.sid, function(err, cached) {
        if (err) {
          return callback(err, false);
        }

        if (!cached) {
          return callback(null, false);
        }

        return callback(null, true, cached.account);
      });
    }
  });
  plugin.auth.strategy('google', 'bell', {
    provider: 'google',
    password: process.env.cookiePass,
    clientId: process.env.clientId,
    clientSecret: process.env.clientSecret,
    isSecure: secure,
    forceHttps: secure
  });
  plugin.route({
    method: '*',
    path: '/login',
    config: {
      auth: 'google',
      handler: function(request, reply) {
        var account = request.auth.credentials;
        var sid = account.profile.id;
        cache.set(sid, {
          account: account
        }, 0, function(err) {
          if (err) {
            reply(err);
            return;
          }
          request.auth.session.set({
            sid: sid
          });
          reply.redirect('/');
        });
      }
    }
  });
  next();
};

exports.register.attributes = {
  name: 'googleAuth'
};
