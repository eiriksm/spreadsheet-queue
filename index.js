'use strict';
var path = require('path');
var bunyan = require('bunyan');
var git = require('git-rev');
var logger = bunyan.createLogger({
  name: 'sheet-queue',
  level: process.env.LOG_LEVEL || 'debug'
});
var Hapi = require('hapi');
var Joi = require('joi');
var hapiSwagger = require('hapi-swagger');
var pack = require('./package');
var swaggerOptions = {
  apiVersion: pack.version
};
var gitRev;

var config;
try {
  config = require('./config');
}
catch (err) {
  config = {};
}
var db = require('./src/pgdb');
var routes = require('./routes');
process.env.clientId = process.env.clientId || config.clientId;
process.env.clientSecret = process.env.clientSecret || config.clientSecret;
process.env.cookiePass = process.env.cookiePass || config.cookiePass;
process.env.redirectUri = process.env.redirectUri || config.redirectUri;

config.pgUrl = config.pgUrl || process.env.DATABASE_URL;
config.stripeKey = config.stripeKey || process.env.stripeKey;
config.stripeSecretKey = config.stripeSecretKey || process.env.stripeSecretKey;
config.mail = config.mail || process.env.SHEET_EMAIL;
config.key = config.key || process.env.PRIVATE_KEY;
config.mandrillUser = config.mandrillUser || process.env.MANDRILL_USER;
config.mandrillPass = config.mandrillPass || process.env.MANDRILL_PASS;
config.baseUrl = config.baseUrl || process.env.BASE_URL;

var server = new Hapi.Server();
var port = process.env.PORT || 8000;
server.connection({ port: port });
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
var secure = false;
if (process.env.NODE_ENV === 'production') {
  secure = true;
}
server.ext('onPreResponse', function (request, reply) {
  var response = request.response;
  if (!response.isBoom) {
    return reply.continue();
  }

  // Replace error with friendly HTML

  var error = response;
  var ctx = {
    message: (error.output.statusCode === 404 ? 'page not found' : 'Something went wrong'),
    code: error.output.statusCode,
    error: error.output.payload.error
  };

  var r = reply.view('error', ctx).hold();
  r.code(error.output.statusCode)
  .send();
});

server.register({
    register: hapiSwagger,
    options: swaggerOptions
}, function (err) {
    if (err) {
        server.log(['error'], 'hapi-swagger load error: ' + err);
    }else{
        server.log(['start'], 'hapi-swagger interface loaded');
    }
});
server.register({
  register: require('crumb'),
  options: {
    cookieOptions: {
      isSecure: secure
    },
    skip: function (request) {
      if (request.route.path === '/message/{user}/{id}') {
        return true;
      }
      return false;
    }
  }
}, function (err) {
  if (err) {
    throw err;
  }
});
server.register([
  {register: require('hapi-auth-cookie')},
  {register: require('bell')},
  {register: require('./src/auth')}], function(err) {
    if (err) {
      throw err;
    }
});
server.route({
  method: 'GET',
  path: '/pricing',
  config: {
    auth: {
      strategy: 'session',
      mode: 'try'
    },
    plugins: { 'hapi-auth-cookie': { redirectTo: false } }
  },
  handler: function (request, reply) {
    var user = false;
    if (request.auth.isAuthenticated) {
      user = request.auth.credentials;
    }
    return reply.view('pricing', {
      user: user
    });
  }
});
server.route({
  method: 'GET',
  path: '/about',
  config: {
    auth: {
      strategy: 'session',
      mode: 'try'
    },
    plugins: { 'hapi-auth-cookie': { redirectTo: false } }
  },
  handler: function (request, reply) {
    var user = false;
    if (request.auth.isAuthenticated) {
      user = request.auth.credentials;
    }
    return reply.view('about', {
      user: user
    });
  }
});
server.route({
  method: 'GET',
  path: '/sheeet-docs',
  handler: function (request, reply) {
    return reply.view('swagger', {}, {
      layout: false
    });
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
  handler: routes.index
});

server.route({
  path: "/logout",
  method: "GET",
  config: {
    handler: routes.logout,
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
  handler: routes.user
});
server.route({
  method: 'GET',
  path: '/user/docs/{doc}',
  config: {
    auth: 'session'
  },
  handler: routes.userDoc(config)
});
server.route({
  method: 'GET',
  path: '/user/docs/{doc}/test',
  config: {
    auth: 'session'
  },
  handler: routes.userDocTest
});
server.route({
  method: 'POST',
  path: '/message/{user}/{id}',
  config: {
    validate: {
      payload: Joi.object({
        time: Joi.number().integer().optional()
          .description('A UNIX timestamp. Defaults to current timestamp of server if not specified. This will be added only if you have specified a "time" column in your spreadsheet.'),
        value: Joi.any().optional()
          .description('The value of the message. This can be nothing or anything. It has to correspond to a column in your spreadsheet. You can have as many values as you want, IE: {"value": 123,"tag": "temperature"}')
        }).options({allowUnknown: true}),
      params: {
        user: Joi
          .string()
          .min(1)
          .required()
          .description('Your user ID.'),
        id: Joi
          .string()
          .min(1)
          .required()
          .description('The document ID. This is the sheeet document id, and not the google docs id.')
      },
      headers: Joi.object({
        'x-sheeet': Joi
          .string()
          .min(1)
          .required()
        }).options({
          allowUnknown: true
        })
    },
    tags: ['api']
  },
  handler: routes.messagePost(config)
});
server.route({
  method: 'POST',
  path: '/user/docs/{id}/test',
  config: {
    auth: 'session'
  },
  handler: routes.userDocTestPost(config)
});
server.route({
  method: 'GET',
  path: '/user/docs/{doc}/delete',
  config: {
    auth: 'session'
  },
  handler: routes.userDocDelete
});
server.route({
  method: 'POST',
  path: '/user/docs/{doc}/delete',
  config: {
    auth: 'session'
  },
  handler: routes.userDocDeletePost
});
server.route({
  method: 'GET',
  path: '/user/payment',
  config: {
    auth: 'session'
  },
  handler: routes.userPayment(config)
});
server.route({
  method: 'POST',
  path: '/user/payment',
  config: {
    auth: 'session'
  },
  handler: routes.userPaymentPost(config)
});
server.route({
  method: 'POST',
  path: '/user/payment/cancel',
  config: {
    auth: 'session'
  },
  handler: routes.userPaymentCancelPost(config)
});
server.route({
  method: 'GET',
  path: '/documents/new',
  config: {
    auth: 'session'
  },
  handler: routes.userDocNew
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
  handler: routes.userDocPost
});
server.route({
  method: 'POST',
  path: '/document/{doc}',
  config: {
    auth: 'session',
    validate: {
      payload: {
        title: Joi.string().min(1).required(),
        id: Joi.string().min(1).required()
      }
    }
  },
  handler: routes.userDocUpdate
});
server.route({
  method: 'POST',
  path: '/user',
  config: {
    validate: {
      payload: {
        email: Joi.string().email().required(),
        forgot: Joi.boolean()
      }
    }
  },
  handler: routes.userPost(config)
});
server.route({
  method: 'POST',
  path: '/user/update',
  config: {
    auth: {
      strategy: 'session',
      mode: 'try'
    },
    validate: {
      payload: {
        password: Joi.string().required(),
        password2: Joi.string().required(),
        user: Joi.string().required()
      }
    },
    plugins: { 'hapi-auth-cookie': { redirectTo: false } }
  },
  handler: routes.userUpdate
});
server.route({
  method: 'GET',
  path: '/user/register',
  config: {
    auth: {
      strategy: 'session',
      mode: 'try'
    },
    plugins: { 'hapi-auth-cookie': { redirectTo: false } }
  },
  handler: routes.userRegister
});
server.route({
  method: 'GET',
  path: '/user/login',
  config: {
    auth: {
      strategy: 'session',
      mode: 'try'
    },
    plugins: { 'hapi-auth-cookie': { redirectTo: false } }
  },
  handler: routes.userLogin
});
server.route({
  method: 'POST',
  path: '/user/login',
  config: {
    auth: {
      strategy: 'session',
      mode: 'try'
    },
    plugins: { 'hapi-auth-cookie': { redirectTo: false } }
  },
  handler: routes.userLoginPost
});
server.route({
  method: 'GET',
  path: '/user_pending',
  handler: function(request, reply) {
    return reply.view('user_pending', {
      mail: request.query.mail
    });
  }
});
server.route({
  method: 'GET',
  path: '/verify/{uid}/{timestamp}/{hash*}',
  config: {
    auth: {
      strategy: 'session',
      mode: 'try'
    },
    plugins: { 'hapi-auth-cookie': { redirectTo: false } }
  },
  handler: routes.userValidate(config)
});
server.route({
  path: '/public/{path*}',
  method: 'GET',
  config: {
    cache: {
      privacy: 'public',
      expiresIn: 24 * 60 * 60 * 1000 // 1 day
    }
  },
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

  return reply.continue();
});
// Get git version first.
git.short(function (str) {
  gitRev = str;
  if (!gitRev) {
    gitRev = process.env.GIT_HASH;
  }
  server.views({
    engines: {
      html: require('handlebars')
    },
    path: path.join(__dirname, 'templates'),
    partialsPath: path.join(__dirname, 'templates', 'partials'),
    layoutPath: path.join(__dirname, 'templates', 'layout'),
    layout: true,
    helpersPath: path.join(__dirname, 'templates', 'helpers'),
    isCached: (process.env.NODE_ENV === 'production'),
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
