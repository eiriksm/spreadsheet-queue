'use strict';

module.exports = function(request, reply) {
  if (request.auth.isAuthenticated) {
    reply.redirect('/user');
    return;
  }
  reply.view('user_register');
};
