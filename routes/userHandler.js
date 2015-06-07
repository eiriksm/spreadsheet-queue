'use strict';
var db = require('../src/pgdb');

module.exports = function(request, reply) {
  if (request.auth.isAuthenticated) {
    var user = request.auth.credentials;
    db.getAll(request.auth.artifacts.sid + ':doc%', function(e, f) {
      // @todo Handle error.
      db.get(user.profile.id + ':stripe', function(dbgErr, d) {
        // @todo Handle error.
        // See actual saved payment data on user.
        user.pro = false;
        if (d && d.id) {
          user.pro = true;
        }
        reply.view('user', {
          user: user,
          documents: f
        });
      });
    });
    return;
  }
  else {
    reply.redirect('/login');
  }
};
