'use strict';
var db = require('../src/pgdb');

module.exports = function(config) {
  return function(request, reply) {
    if (request.auth.isAuthenticated) {
      var user = request.auth.credentials;
      db.get(user.profile.id + ':stripe', function(e, d) {
        // See actual saved payment data on user.
        reply.view('pay', {
          user: user,
          payment: d,
          stripeKey: config.stripeKey
        });
      });
    }
    else {
      return reply.redirect('/login');
    }
  };
};
