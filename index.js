'use strict';
var bunyan = require('bunyan');
var git = require('git-rev');
var logger = bunyan.createLogger({
  name: 'sheet-queue',
  level: process.env.LOG_LEVEL || 'debug'
});
var Hapi = require('hapi');
var Boom = require('boom');
var util = require('util');
var Joi = require('joi');
var uuid = require('uuid');
var spreadsheet = require('google-spreadsheet-append-es5');
var sheets = {};
var gitRev;

var config;
try {
  config = require('./config');
}
catch (err) {
  config = {};
}
var db = require('./src/pgdb');
process.env.clientId = process.env.clientId || config.clientId;
process.env.clientSecret = process.env.clientSecret || config.clientSecret;
process.env.cookiePass = process.env.cookiePass || config.cookiePass;
process.env.redirectUri = process.env.redirectUri || config.redirectUri;

config.pgUrl = config.pgUrl || process.env.DATABASE_URL;

var appendRow = require('./src/appendrow');
var server = new Hapi.Server();
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

    return reply.view('index', {
      user: user,
      front: true
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
      sheets[id] = spreadsheet({
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
  path: "/logout",
  method: "GET",
  config: {
    handler: function(request, reply) {
      try {
        request.auth.session.clear();
      }
      catch (e) {
        // Whatever.
      }
      return reply.redirect('/');
    },
    auth: 'session'
  }
});
server.route({
  method: 'GET',
  path: '/user',
  config: {
    auth: {
      strategy: 'session',
      mode: 'try'
    },
    plugins: { 'hapi-auth-cookie': { redirectTo: false } }
  },
  handler: function(request, reply) {
    if (request.auth.isAuthenticated) {
      var user = request.auth.credentials;
      db.getAll(request.auth.artifacts.sid, function(e, f) {
        console.log(f)
        reply.view('user', {
          user: user,
          documents: f
        });
      });
      return;
    }
    else {
      reply.redirect('/login');
    }
  }
});
server.route({
  method: 'GET',
  path: '/user/docs/{doc}',
  config: {
    auth: 'session'
  },
  handler: function(request, reply) {
    if (request.auth.isAuthenticated) {
      var user = request.auth.credentials;
      var key = util.format('%s-%s',
                            request.auth.artifacts.sid,
                            encodeURIComponent(request.params.doc)
      );
      db.get(key, function(e, d) {
        if (e) {
          reply(Boom.create(500, '', e));
          return;
        }
        if (!d) {
          reply(Boom.create(404));
          return;
        }
        reply.view('document', {
          user: user,
          document: d
        });
      });
    }
    else {
      reply.redirect('/login');
    }
  }
});
server.route({
  method: 'GET',
  path: '/user/docs/{doc}/delete',
  config: {
    auth: 'session'
  },
  handler: function(request, reply) {
    if (request.auth.isAuthenticated) {
      var key = util.format('%s-%s',
                            request.auth.artifacts.sid,
                            encodeURIComponent(request.params.doc)
      );
      db.del(key, function(e) {
        if (e) {
          reply(Boom.create(500, '', e));
          return;
        }
        reply.redirect('/user');
      });
    }
    else {
      reply.redirect('/login');
    }
  }
});
server.route({
  method: 'GET',
  path: '/documents/new',
  config: {
    auth: 'session'
  },
  handler: function(request, reply) {
    if (request.auth.isAuthenticated) {
      var user = request.auth.credentials;
      return reply.view('new_document', {
        user: user
      });
    }
    else {
      return reply.redirect('/login');
    }
  }
});
server.route({
  method: 'POST',
  path: '/document',
  config: {
    auth: 'session',
    validate: {
      payload: {
        title: Joi.string().min(1).required(),
        id: Joi.string().min(1).required()
      }
    }
  },

  handler: function(request, reply) {
    if (request.auth.isAuthenticated) {
      // Create a name for the document.
      var uid = request.auth.artifacts.sid;
      var id = uuid.v4();
      var key = util.format('%s-%s', uid, id);
      var data = request.payload;
      data.uuid = id;
      db.set(key, data, function(e) {
        reply.redirect('/user');
        return;
      });
    }
    else {
      reply.redirect('/login');
    }
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
// Get git version first.
git.short(function (str) {
  gitRev = str;
  server.views({
    engines: {
      html: require('handlebars')
    },
    path: __dirname + '/templates',
    partialsPath: __dirname + '/templates/partials',
    layoutPath: __dirname + '/templates/layout',
    layout: true,
    isCached: false,
    context: {
      rev: gitRev,
      front: false
    }
  });
  db.init(config, function() {
    server.start(function(err) {
      if (!err) {
        logger.info('Started server on port ' + port);
        logger.info('Git revision is ' + gitRev);
      }
      else {
        throw err;
      }
    });
  });
});
