'use strict';
var db = require('../src/pgdb');

var stripe;

module.exports = function(config) {
  stripe = require('stripe')(config.stripeSecretKey);

  return function(request, reply) {
    var stripeToken = request.payload.stripeToken;
    stripe.customers.create({
      card: stripeToken,
      plan: 'pro',
      email: request.payload.stripeEmail
    }, function(err, customer) {
      if (!err && customer) {
        // Billing was complete. Save stuff.
        var user = request.auth.credentials;
        var subId = '';
        if (customer.subscriptions &&
            customer.subscriptions.data &&
            customer.subscriptions.data[0] &&
            customer.subscriptions.data[0].id) {
          subId = customer.subscriptions.data[0].id;
        }
        db.set(user.profile.id + ':stripe', {
          default_card: customer.default_card,
          id: customer.id,
          subId: subId
        }, function(dbSetErr) {
          if (dbSetErr) {
            request.log.error(dbSetErr);
          }
          return reply.redirect('/user');
        });
      }
    });
  };
};
