'use strict';
var db = require('../src/pgdb');
var Boom = require('boom');
var util = require('util');

module.exports = function(request, reply) {
  if (request.auth.isAuthenticated) {
    var key = util.format('%s:doc:%s',
                          request.auth.artifacts.sid,
                          encodeURIComponent(request.params.doc)
    );
    db.get(key, function(e, d) {
      if (e) {
        reply(Boom.create(500, '', e));
        return;
      }
      reply.view('delete_document', {
        document: d
      });
    });
  }
  else {
    reply.redirect('/login');
  }
};
