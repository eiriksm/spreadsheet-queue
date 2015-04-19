'use strict';

var async = require('async');
var bcrypt = require('bcrypt');

var db = require('../src/pgdb');

module.exports = function(request, reply) {
  // The password for the user should be passed along here.
  var pass = request.payload.password;
  var user = request.auth.credentials;
  var id = user.profile.id;
  // Do some processing.
  var done = function(err, result) {
    reply.redirect('/user');
  };
  var hash;
  async.waterfall([
    function(callback) {
      bcrypt.hash(pass, 8, callback);
    },
    function(h, callback) {
      hash = h;
      db.get(user.profile.email, callback);
    },
    function(data, callback) {
      data.pass = hash;
      db.set(user.profile.email, data, callback);
    }
  ], done);

};
