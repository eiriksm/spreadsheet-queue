var bunyan = require('bunyan');
var logger = bunyan.createLogger({
  name: 'sheet-queue',
  level: process.env.LOG_LEVEL || 'debug'
});
var Hapi = require('hapi');
var util = require('util');
var Spreadsheet = require('google-spreadsheet-append-es5');
var sheets = {};

var appendRow = require('./src/appendrow');
var server = new Hapi.Server();
var port = process.env.PORT || 8000;
server.connection({ port: port });
var access = {
  1: {
    '1oEww5nwNpkvbeNYPs_QpxPfbEGBit05zjLd4iN7siDY': true
  }
};

server.route({
  method: 'POST',
  path: '/message/{user}/{id}',
  handler: function (request, reply) {
    var id = request.params.id;
    var user = request.params.user;
    if (!id) {
      // Not something we want to log. Just return as fast as possible.
      return reply('Realities of war.');
    }
    if (!access[user] || !access[user][id]) {
      request.log.info(util.format('User %s tried to access %s, but I said no', user, id));
      return reply('Mass destruction.');
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

var config = {
  register: require('hapi-bunyan'),
  options: {
    logger: logger
  }
};

server.register(config, function(err) {
  if (err) {
    throw err;
  }
});

server.start(
  logger.info('Started server on port ' + port)
);

