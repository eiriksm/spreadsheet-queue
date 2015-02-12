'use strict';
var fs = require('fs');
var path = require('path');

module.exports = {
  get: function(cid, callback) {
    var filepath = path.join('.data', cid + '.json');
    fs.readFile(filepath, 'utf8', function(e, d) {
      var data;
      try {
        data = JSON.parse(d);
      }
      catch (err) {
        callback(err);
        return;
      }
      callback(e, data);
    });
  },
  set: function(cid, data, callback) {
    // First to file system.
    var filepath = path.join('.data', cid + '.json');
    var d = '';
    try {
      d = JSON.stringify(data);
    }
    catch (err) {
      callback(err);
      return;
    }
    fs.writeFile(filepath, d, 'utf8', function(e) {
      // Then write to in-mem.
      callback(e);
    });
  }
};
