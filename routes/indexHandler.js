module.exports = function(request, reply) {
  var user = false;
  if (request.auth.isAuthenticated) {
    user = request.auth.credentials;
  }

  return reply.view('index', {
    user: user,
    front: true
  });
}
