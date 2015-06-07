'use strict';

var util = require('util');

var Boom = require('boom');
var bcrypt = require('bcrypt');
var async = require('async');

var db = require('../src/pgdb');
var cache = require('../src/cache');


module.exports = function(config) {
  return function(request, reply) {
    if (request.auth.isAuthenticated) {
      reply.redirect('/user');
      return;
    }
    // Compare hash and what we are expecting.
    var id = request.params.uid;
    var timestamp = parseInt(request.params.timestamp, 10);
    // Make sure the link is not older than 1 hour.
    if (!timestamp || timestamp < (Date.now() - 3600000)) {
      request.log.info('Old timestamp requested for uid ' + id);
      reply.view('user_verify', {
        verified: false
      });
      return;
    }
    var expectedHash = util.format('%s-to-the-%d-to-the%s', id, timestamp, config.mandrillUser);
    var usedHash = request.params.hash;
    var done = function(err, result) {
      if (err) {
        if (err === true) {
          // Hack to override 500 when we respond early.
          return;
        }
        reply(Boom.create(500, '', err));
        request.log.error(err);
        return;
      }
      console.log(result);
      reply.view('user_verify', {
        verified: true,
        account: result
      });
    };
    async.waterfall([
      function(callback) {
        bcrypt.compare(expectedHash, usedHash, function(err, result) {
          if (err) {
            callback(err);
            return;
          }
          if (result) {
            callback();
          }
          else {
            request.log.error('User used a hash that did not compare to the original.', usedHash, expectedHash);
            reply.view('user_verify', {
              verified: false
            });
            callback(true);
          }
        });
      },
      function(callback) {
        // Assemble what we know about the guy.
        db.get('verify-' + id, callback);
      },
      function(data, callback) {
        if (!data || !data.email) {
          reply.view('user_verify', {
            verified: false
          });
          callback(true);
          return;
        }
        callback(null, data);
      },
      function(data, callback) {
        // Save the user as logged in.
        var account = {
          profile: {
            email: data.email,
            id: id
          }
        };
        cache.set(id, {
          account: account
        }, 0, function(err) {
          callback(err, account);
        });
      },
      function(data, callback) {
        // Delete the verify object.
        db.del('verify-' + id, function(err) {
          callback(err, data);
        });
      }
    ], done);

  };
};
