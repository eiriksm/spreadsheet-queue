'use strict';
var util = require('util');
var Boom = require('boom');
var spreadsheet = require('google-spreadsheet-append-es5');
var checkAccess = require('../src/checkAccess');
var appendRow = require('../src/appendrow');
var db = require('../src/pgdb');
var sheets = {};

module.exports = function(config) {
  return function(request, reply) {
    var id = request.params.id;
    var user = request.params.user;
    if (!id || !user) {
      // Not something we want to log. Just return as fast as possible.
      return reply(Boom.create(400, 'Realities of war.'));
    }
    checkAccess(request, function(e, access, file) {
      if (!access) {
        return reply(Boom.create(401, 'Try harder plz.'));
      }
      if (!file) {
        return reply(Boom.create(404));
      }
      if (e) {
        return reply(Boom.create(500, 'Mass destruction.'));
      }
      var fileId = file.id;
      if (!sheets[id]) {
        try {
          sheets[id] = spreadsheet({
            auth: {
              email: config.mail,
              key: config.key
            },
            fileId: fileId
          });
        }
        catch (err) {
          return reply(Boom.create(500, 'Had problems connecting to the google docs.', err));
        }
      }
      // Reply this early, to let the user know the request was queued.
      reply(JSON.stringify({
        status: 'OK',
        message: 'Value queued'
      }, null, 4))
      .code(201);
      appendRow(request.payload, sheets[id], function(err) {
        if (err) {
          request.log.error(err);
          return reply(Boom.create(500, 'Problemos'));
        }
        // Make sure we put a tag on the file, in case it is not marked as
        // already working.
        var key = util.format('%s:doc:%s', user, id);
        db.get(key, function(dbErr, doc) {
          if (dbErr) {
            // That is not good. But ignore for now.
            request.log.error(dbErr);
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
          });
        });
      });

    });
  };
};
