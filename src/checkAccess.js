'use strict';
var util = require('util');
var db = require('./pgdb');

function checkIfHeaderIsCorrect(h, id, callback) {
  callback(null, true);
}

module.exports = function(request, callback) {
  var id = request.params.id;
  var user = request.params.user;
  // See if the user has access to the doc id. First check header.
  var headers = request.headers;
  if (!headers || !headers['x-sheeet']) {
    request.log.debug('The headers are not correct. Headers are:', headers);
    callback(null, false);
    return;
  }
  checkIfHeaderIsCorrect(headers['x-sheet'], id, function(he, valid) {
    if (he) {
      request.log.debug('Had a header error', he);
      callback(he);
      return;
    }
    if (!valid) {
      request.log.debug('The header is not valid, so the user is not allowed access.');
      callback(null, false);
      return;
    }
    var key = util.format('%s:doc:%s', user, id);
    db.get(key, function(err, result) {
      if (err) {
        callback(err);
        return;
      }
      if (!result || !result.id) {
        callback(null, false);
        return;
      }
      callback(null, true, result);
    });
  });
};
