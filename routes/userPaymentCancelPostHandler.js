'use strict';
var db = require('../src/pgdb');

var stripe;

module.exports = function(config) {
  stripe = require('stripe')(config.stripeSecretKey);
  return function(request, reply) {
    request.log.debug('Handling a cancellation of payment');
    var user = request.auth.credentials;
    // Find payment details.
    var dbKey = user.profile.id + ':stripe';

    db.get(dbKey, function(e, d) {
      stripe.customers.cancelSubscription(d.id, d.subId, function(se, sd) {
        console.log(se, sd);
        if (sd.status === 'canceled') {
          db.del(dbKey, function(de) {
            reply.redirect('/user');
          });
        }
      });
    });
  };
};
