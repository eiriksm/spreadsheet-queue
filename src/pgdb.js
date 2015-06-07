'use strict';
var Sequelize = require('sequelize');
var Data;

function get(key, callback) {
  Data.find({where: {key: key}})
  .then(function gotKey(data) {
    data = data || {};
    data.dataValues = data.dataValues || {};
    data.dataValues.value = data.dataValues.value || {};
    callback(null, data.dataValues.value);
  })
  .catch(function getError(e) {
    callback(e);
  });
}

function set(key, value, callback) {
  Data.findOrCreate({
    where: {
      key: key
    }
  })
  .spread(function(data) {
    data.set('value', value);
    data.save()
    .then(function() {
      callback();
    })
    .catch(function(e) {
      callback(e);
    });
  });
}

function del(key, callback) {
  Data.destroy({
    where:
      { key: key }
    }
  )
  .then(function() {
    callback();
  })
  .catch(function(e) {
    callback(e);
  });
}

function getAll(pattern, callback) {
  Data.findAll({
    where: {
      key: {
        $like: pattern + '-%'
      }
    }
  })
  .then(function(data) {
    var docs = [];
    var fullDoc = [];
    for (var prop in data) {
      if (data.hasOwnProperty(prop)) {
        docs.push(data[prop].dataValues.value);
        fullDoc.push(data[prop].dataValues);
      }
    }
    callback(null, docs, fullDoc);
  })
  .catch(function(e) {
    callback(e);
  });
}

module.exports = {
  get: get,
  getAll: getAll,
  set: set,
  del: del,
  init: function(config, callback) {
    var sequelize = new Sequelize(config.pgUrl, {
      logging: false
    });

    Data = sequelize.define('data', {
      key: {
        type: Sequelize.STRING
      },
      value: {
        type: Sequelize.HSTORE
      }
    }, {
      freezeTableName: true
    });
    Data.sync().then(function() {
      callback();
    });
  }
};
