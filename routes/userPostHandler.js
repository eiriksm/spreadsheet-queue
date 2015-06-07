'use strict';
var util = require('util');
var db = require('../src/pgdb');
var uuid = require('uuid');
var Boom = require('boom');
var nodemailer = require('nodemailer');
require('nodemailer-wellknown');
var bcrypt = require('bcrypt');

module.exports = function(config) {
  var transporter = nodemailer.createTransport({
    service: 'mandrill',
    auth: {
      user: config.mandrillUser,
      pass: config.mandrillPass
    }
  });
  return function(request, reply) {
    if (request.auth.isAuthenticated) {
      reply.redirect('/user');
      return;
    }
    var email = request.payload.email;
    var forgot = request.payload.forgot;
    db.get(email, function(dbErr, dbRes) {
      if (dbErr) {
        reply(Boom.create(500, '', dbErr));
        request.log.error(dbErr);
        return;
      }
      if (dbRes && dbRes.email && !forgot) {
        reply.view('forgot_password', {
          email: email
        });
        return;
      }
      // Generate a UUID for this user.
      var id = uuid.v4();
      // Save email in database.
      if (dbRes && dbRes.id) {
        id = dbRes.id;
      }
      db.set(email, {email: email, id: id}, function(setErr) {
        if (setErr) {
          reply(Boom.create(500, '', setErr));
          request.log.error(setErr);
          return;
        }
        db.set('verify-' + id, {email: email}, function(set2Err) {
          if (set2Err) {
            reply(Boom.create(500, '', set2Err));
            request.log.error(set2Err);
            return;
          }
          // Then send an email.
          var timestamp = Date.now();
          var hashBase = util.format('%s-to-the-%d-to-the%s', id, timestamp, config.mandrillUser);
          bcrypt.hash(hashBase, 8, function(bErr, hash) {
            var verifyLink = util.format(config.baseUrl + '/verify/%s/%d/%s', id, timestamp, hash);
            var mailOpts = {
              from: 'Noreply sheeeet <eirik@e-o.no>',
              to: email,
              subject: 'Please verify your account on sheeet',
              text: 'Please click this link: ' + verifyLink
            };
            transporter.sendMail(mailOpts, function(mailErr) {
              if (mailErr) {
                reply(Boom.create(500, 'A problem', mailErr));
                return;
              }
              request.log.info('Mail is sent to ' + email);
              reply.redirect('/user_pending');
            });
          });
        });
      });
    });
  };
};
