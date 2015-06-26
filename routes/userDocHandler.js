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
        var url = util.format('%s/message/%s/%s', config.baseUrl, request.auth.artifacts.sid, encodeURIComponent(request.params.doc));
        var curlExample = util.format('curl -i "%s" \\%s' +
                                      '-H "Content-Type: application/json" \\%s' +
                                      '-H "x-sheeet: %s"  \\%s' +
                                      '--data "{\\"value\\": 123}"',
                                      url, '\n',
                                      '\n',
                                      header, '\n');
        reply.view('document', {
          user: user,
          document: d,
          curlExample: curlExample,
          header: header,
          url: url
        });
      });
    }
    else {
      reply.redirect('/login');
    }
  };
};
