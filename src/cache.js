'use strict';
var cache = {};
var db = require('./pgdb');

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
      d = d || {};
      cache[cid] = d;
      callback(e, d.data);
    };
    if (cache[cid]) {
      var d = cache[cid];
      try {
        d.data = JSON.parse(d.data);
      }
      catch (er) {
        // Just ignore that. Probably means the object is parsed.
      }
      _callback(null, d);
      return;
    }
    // Then try "db".
    db.get(cid, function(e, d) {
      if (e) {
        _callback(e);
        return;
      }
      if (d && d.data) {
        try {
          d.data = JSON.parse(d.data);
        }
        catch (er) {
          _callback(er);
          return;
        }
      }
      _callback(e, d);
    });
  },
  set: function(cid, data, expire, callback) {
    // First to "db".
    var d = new Cache(data, expire);
    try {
      d.data = JSON.stringify(d.data);
    }
    catch (err) {
      callback(err);
      return;
    }
    db.set(cid, d, function(e) {
      // Then write to in-mem.
      if (!e) {
        cache[cid] = d;
      }
      callback(e);
    });
  }
};
