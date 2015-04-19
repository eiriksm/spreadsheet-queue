'use strict';

module.exports = function(request, reply) {
  if (request.auth.isAuthenticated) {
    var user = request.auth.credentials;
    return reply.view('new_document', {
      user: user
    });
  }
  else {
    return reply.redirect('/login');
  }
};
