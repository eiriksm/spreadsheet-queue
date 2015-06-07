'use strict';
var db = require('../src/pgdb');
var Boom = require('boom');

var stripe;

module.exports = function(config) {
  stripe = require('stripe')(config.stripeSecretKey);
  return function(request, reply) {
    request.log.debug('Handling a cancellation of payment');
    var user = request.auth.credentials;
    // Find payment details.
    var dbKey = user.profile.id + ':stripe';

    db.get(dbKey, function(e, d) {
      if (e || !d.id) {
        request.log.warn('Either error or no id on cancel sub. Not good, not good', e, d);
        return reply(Boom.create(500, e));
      }
      stripe.customers.cancelSubscription(d.id, d.subId, function(se, sd) {
        // @todo. Needs more logic, no?
        if (sd.status === 'canceled') {
          db.del(dbKey, function() {
            reply.redirect('/user');
          });
        }
      });
    });
  };
};
