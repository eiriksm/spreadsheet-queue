'use strict';
exports.register = function(plugin, options, next) {
  var cache = plugin.cache({
    expiresIn: 3 * 24 * 60 * 60 * 1000
  });
  plugin.app.cache = cache;
  var secure = false;

  if (process.env.NODE_ENV === 'production') {
    console.log('will use secure');

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
    providerParams: {
      redirect_uri: process.env.redirectUri
    }
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
          }
          request.auth.session.set({
            sid: sid
          });
          return reply.redirect('/');
        });
      }
    }
  });
  next();
};

exports.register.attributes = {
  name: 'googleAuth'
};
