'use strict';
var db = require('../src/pgdb');
var Boom = require('boom');
var util = require('util');
var crypto = require('crypto');

module.exports = function(config) {
  return function(request, reply) {
    if (request.auth.isAuthenticated) {
      var user = request.auth.credentials;
      var key = util.format('%s:doc:%s',
                            request.auth.artifacts.sid,
                            encodeURIComponent(request.params.doc)
      );
      db.get(key, function(e, d) {
        if (e) {
          request.log.warn('Error in getting doc for user.', e);
          reply(Boom.create(500, '', e));
          return;
        }
        if (!d || !d.id) {
          reply(Boom.create(404));
          return;
        }
        var header = crypto.createHash('sha1')
        .update(key)
        .digest('hex');
        var curlExample = util.format('curl -i -H "Content-Type: application/json" -H "x-sheeet: %s" "%s/message/%s/%s" --data "{\\"value\\": 123}"',
                                      header, config.baseUrl, request.auth.artifacts.sid, encodeURIComponent(request.params.doc));
        reply.view('document', {
          user: user,
          document: d,
          curlExample: curlExample
        });
      });
    }
    else {
      reply.redirect('/login');
    }
  };
};
