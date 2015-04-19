'use strict';
var db = require('../src/pgdb');

module.exports = function(request, reply) {
  if (request.auth.isAuthenticated) {
    var user = request.auth.credentials;
    db.getAll(request.auth.artifacts.sid + ':doc%', function(e, f, g) {
      db.get(user.profile.id + ':stripe', function(e, d) {
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
