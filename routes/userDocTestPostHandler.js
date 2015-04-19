'use strict';
var db = require('../src/pgdb');
var Boom = require('boom');
var util = require('util');
var spreadsheet = require('google-spreadsheet-append-es5');
var checkAccess = require('../src/checkAccess');
var appendRow = require('../src/appendrow');
var sheets = {};
module.exports = function(config) {
  return function(request, reply) {
    if (request.auth.isAuthenticated) {
      request.params.user = request.auth.artifacts.sid;
      request.headers['x-sheeet'] = request.params.user;
      checkAccess(request, function(e, access, file) {
        var user = request.params.user;
        var id = request.params.id;
        if (!file) {
          return reply(Boom.create(404));
        }
        if (e) {
          return reply(Boom.create(500, 'Mass destruction.'));
        }
        if (!access) {
          return reply(Boom.create(401, 'Try harder plz.'));
        }
        var fileId = file.id;
        if (!sheets[id]) {
          sheets[id] = spreadsheet({
            auth: {
              email: config.mail,
              key: config.key
            },
            fileId: fileId
          });
        }
        appendRow(request.payload, sheets[id], function(err) {
          if (err) {
            console.log(err);
            return reply(Boom.create(500, 'Problemos'));
          }
          // Make sure we put a tag on the file, in case it is not marked as
          // already working.
          var key = util.format('%s:doc:%s', user, id);
          db.get(key, function(dbErr, doc) {
            if (dbErr) {
              // That is not good. But ignore for now.
              console.log(dbErr);
              return;
            }
            if (!doc.verified) {
              doc.verified = Date.now();
            }
            doc.updated = Date.now();
            db.set(key, doc, function(setErr) {
              if (setErr) {
                console.log(setErr);
              }
              // Holy nested monstrousity. All this way. Celebrate by
              // redirecting the user.
              return reply.redirect('/user');
            });
          });
        });
      });
    }
    else {
      reply.redirect('/login');
    }
  };
};
