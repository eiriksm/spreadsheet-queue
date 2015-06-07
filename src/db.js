'use strict';
var fs = require('fs');
var path = require('path');
var glob = require('glob');
var async = require('async');

function getPath(key) {
  return path.join('.data', key + '.json');
}

module.exports = {
  getAll: function(pattern, callback) {
    var p = path.join('.data', '**' + pattern + '-**');
    glob(p, function(e, files) {
      var fsutf8 = function(file, cb) {
        fs.readFile(file, 'utf8', function(er, res) {
          var d = {};
          try {
            d = JSON.parse(res);
          }
          catch (error) {
            cb(error);
            return;
          }
          cb(er, d);
        });
      };
      async.map(files, fsutf8, callback);
    });
  },
  get: function(key, callback) {
    var filepath = getPath(key);
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
  set: function(key, data, callback) {
    // First to file system.
    var filepath = getPath(key);
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
  },
  del: function(key, callback) {
    var filepath = getPath(key);
    fs.unlink(filepath, callback);
  }
};

