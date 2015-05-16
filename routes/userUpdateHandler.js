'use strict';

var async = require('async');
var bcrypt = require('bcrypt');

var db = require('../src/pgdb');
var cache = require('../src/cache');

module.exports = function(request, reply) {
  if (request.auth.isAuthenticated) {
    reply.redirect('/user');
    return;
  }
  // The password for the user should be passed along here.
  var pass = request.payload.password;
  var pass2 = request.payload.password2;
  if (pass !== pass2) {
    request.log.info('User used 2 passwords that did not match.');
    reply.redirect(request.info.referrer + '?stupid=true');
    return;
  }
  var user;// = request.auth.credentials;
  var id;// = user.profile.id;
  // Do some processing.
  var done = function(err) {
    reply.redirect('/user');
  };
  var hash;
  async.waterfall([
    // Find user
    function findUser(callback) {
      cache.get(request.payload.user, callback);
    },
    function createHash(result, callback) {
      user = result.account;
      id = user.profile.id;
      bcrypt.hash(pass, 8, callback);
    },
    function(h, callback) {
      hash = h;
      db.get(user.profile.email, callback);
    },
    function(data, callback) {
      data.pass = hash;
      db.set(user.profile.email, data, callback);
    },
    function doLogin(callback) {
      request.auth.session.set({
        sid: id
      });
      callback();
    }
  ], done);

};
