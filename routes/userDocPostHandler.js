'use strict';

var uuid = require('uuid');
var util = require('util');

var db = require('../src/pgdb');

module.exports = function(request, reply) {
  if (request.auth.isAuthenticated) {
    // Create a name for the document.
    var uid = request.auth.artifacts.sid;
    var id = uuid.v4();
    var key = util.format('%s:doc:%s', uid, id);
    var data = request.payload;
    data.uuid = id;
    db.set(key, data, function(e) {
      if (e) {
        // @todo. Handle better.
        request.log.warn('Error in db.set in userDocUpdateHandler', e);
      }
      reply.redirect('/user');
      return;
    });
  }
  else {
    reply.redirect('/login');
  }
};
