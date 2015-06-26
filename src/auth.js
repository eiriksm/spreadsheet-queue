'use strict';

var cache = require('./cache');
var async = require('async');
var Boom = require('boom');
var db = require('./pgdb');

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
    validateFunc: function(request, session, callback) {
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
        var done = function(err) {
          if (err) {
            reply(Boom.create(503, '', err));
            request.log.error(err);
            return;
          }
          reply.redirect('/user');
        };
        var email = account.profile.email;
        async.waterfall([
          function(callback) {
            db.get(sid, callback);
          },
          function(data, callback) {
            if (!data || !data.profile) {
              // See if email adress is taken.
              db.get(email, callback);
              return;
            }
            callback(null, {});
          },
          function(data, callback) {
            cache.set(sid, {
              account: account
            }, 0, callback);
          },
          function(callback) {
            request.auth.session.set({
              sid: sid
            });
            // Also make sure the email address is taken.
            db.set(email, {email: email, id: sid}, callback);
          }
        ], done);
      }
    }
  });
  next();
};

exports.register.attributes = {
  name: 'googleAuth'
};
