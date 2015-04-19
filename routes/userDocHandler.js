'use strict';
var db = require('../src/pgdb');
var Boom = require('boom');
var util = require('util');

module.exports = function(request, reply) {
  if (request.auth.isAuthenticated) {
    var user = request.auth.credentials;
    var key = util.format('%s:doc:%s',
                          request.auth.artifacts.sid,
                          encodeURIComponent(request.params.doc)
    );
    db.get(key, function(e, d) {
      if (e) {
        reply(Boom.create(500, '', e));
        return;
      }
      if (!d || !d.id) {
        reply(Boom.create(404));
        return;
      }
      reply.view('document', {
        user: user,
        document: d
      });
    });
  }
  else {
    reply.redirect('/login');
  }
};
