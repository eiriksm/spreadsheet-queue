'use strict';
var cache = {};
var db = require('./pgdb');

function Cache(data, expire) {
  this.data = data;
  this.expire = expire;
}

module.exports = {
  get: function(cid, callback) {
    var d;
    // First try in-mem.
    var cb = function(e, data) {
      if (!e & d && data.expire && data.expire > Date.now()) {
        callback();
        return;
      }
      data = data || {};
      cache[cid] = data;
      callback(e, data.data);
    };
    if (cache[cid]) {
      d = cache[cid];
      try {
        d.data = JSON.parse(d.data);
      }
      catch (er) {
        // Just ignore that. Probably means the object is parsed.
      }
      cb(null, d);
      return;
    }
    // Then try "db".
    db.get(cid, function(e, data) {
      if (e) {
        cb(e);
        return;
      }
      if (data && data.data) {
        try {
          data.data = JSON.parse(data.data);
        }
        catch (er) {
          cb(er);
          return;
        }
      }
      cb(e, data);
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
