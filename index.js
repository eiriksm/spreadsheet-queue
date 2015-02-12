var bunyan = require('bunyan');
var logger = bunyan.createLogger({
  name: 'sheet-queue',
  level: process.env.LOG_LEVEL || 'debug'
});
var Hapi = require('hapi');
var Boom = require('boom');
var util = require('util');
var Spreadsheet = require('google-spreadsheet-append-es5');
var sheets = {};

var config;
try {
  config = require('./config');
}
catch (err) {
  config = {};
}
process.env.clientId = process.env.clientId || config.clientId;
process.env.clientSecret = process.env.clientSecret || config.clientSecret;
process.env.cookiePass = process.env.cookiePass || config.cookiePass;
process.env.redirectUri = process.env.redirectUri || config.redirectUri;

var appendRow = require('./src/appendrow');
var server = new Hapi.Server();
server.views({
  engines: {
    html: require('handlebars')
  },
  path: __dirname + '/templates',
  partialsPath: __dirname + '/templates',
  layout: true
});
var port = process.env.PORT || 8000;
server.connection({ port: port });
var access = {
  1: {
    '1oEww5nwNpkvbeNYPs_QpxPfbEGBit05zjLd4iN7siDY': true
  }
};
var conf = {
  register: require('hapi-bunyan'),
  options: {
    logger: logger
  }
};
server.register(conf, function(err) {
  if (err) {
    throw err;
  }
});
server.register([
  {register: require('hapi-auth-cookie')},
  {register: require('bell')},
  {register: require('./src/auth')}], function(err) {
    if (err) {
      throw(err);
    }
});
server.route({
  method: 'GET',
  path: '/',
  config: {
    auth: {
      strategy: 'session',
      mode: 'try'
    },
    plugins: { 'hapi-auth-cookie': { redirectTo: false } }
  },
  handler: function(request, reply) {
    var user = false;
    if (request.auth.isAuthenticated) {
      user = request.auth.credentials;
    }
    console.log(user);

    return reply.view('index', {
      user: user
    });
  }
});

server.route({
  method: 'POST',
  path: '/message/{user}/{id}',
  handler: function (request, reply) {
    var id = request.params.id;
    var user = request.params.user;
    if (!id) {
      // Not something we want to log. Just return as fast as possible.
      return reply(Boom.create(400, 'Realities of war.'));
    }
    if (!access[user] || !access[user][id]) {
      request.log.info(util.format('User %s tried to access %s, but I said no', user, id));
      return reply(Boom.create(401, 'Mass destruction.'));
    }
    if (!sheets[id]) {
      sheets[id] = Spreadsheet({
        auth: {
          email: process.env.SHEET_EMAIL,
          keyFile: 'nokey.pem'
        },
        fileId: id
      });
    }
    appendRow(request.payload, sheets[id]);
    return reply('ok');
  }
});
server.route({
  path: '/public/{path*}',
  method: 'GET',
  handler: {
    directory: {
      path: './public',
      listing: false,
      index: true
    }
  }
});
server.ext('onRequest', function (request, reply) {
  if (process.env.NODE_ENV === 'production') {
    request.connection.info.protocol = 'https';
  }

  return reply['continue']();
});

server.start(
  logger.info('Started server on port ' + port)
);
