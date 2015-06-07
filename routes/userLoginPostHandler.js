'use strict';
var async = require('async');
var bcrypt = require('bcrypt');
var Boom = require('boom');

var db = require('../src/pgdb');

module.exports = function(request, reply) {
  if (request.auth.isAuthenticated) {
    reply.redirect('/user');
    return;
  }
  var pass = request.payload.pass;
  var user = request.payload.user;
  // Check the login against the actual credentials.
  var done = function(err, ok, userData) {
    if (err) {
      reply(Boom.create(403, err));
      return;
    }
    var sid = userData.id;
    async.waterfall([
      function(callback) {
        request.auth.session.set({
          sid: sid
        });
        callback();
      }
    ], function () {
      if (err) {
        reply(Boom.create(503, '', err));
        request.log.error(err);
        return;
      }
      reply.redirect('/user');
    });
  };
  async.waterfall([
    function getUserData(callback) {
      // Check the database.
      db.get(user, callback);
    },
    function gotUserData(data, callback) {
      if (!data || !data.pass) {
        // Either we do not know the user, or the password was wrong.
        callback(new Error('ENOPASS'));
        return;
      }
      bcrypt.compare(pass, data.pass, function(err, res) {
        return callback(err, res, data);
      });
    }
  ], done);

};
