'use strict';
var cache = {};
var db = require('./db');

function Cache(data, expire) {
  this.data = data;
  this.expire = expire;
}

module.exports = {
  get: function(cid, callback) {
    // First try in-mem.
    var _callback = function(e, d) {
      if (!e & d && d.expire && d.expire > Date.now()) {
        callback();
        return;
      }
      callback(e, d.data);
    };
    if (cache[cid]) {
      _callback(null, cache[cid]);
      return;
    }
    // Then try "db".
    db.get(cid, _callback);
  },
  set: function(cid, data, expire, callback) {
    // First to "db".
    var d = new Cache(data, expire);
    db.set(cid, d, function(e) {
      // Then write to in-mem.
      if (!e) {
        cache[cid] = new Cache(data, expire);
      }
      callback(e);
    });
  }
};
