'use strict';

module.exports = function(request, reply) {
  try {
    request.auth.session.clear();
  }
  catch (e) {
    // Whatever.
  }
  return reply.redirect('/');
};
