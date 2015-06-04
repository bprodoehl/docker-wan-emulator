/*jslint node:true*/

var redis = require('redis');
var db = redis.createClient();

module.exports = Nat;

var REDIS_KEY='nat';

function Nat(obj) {
    for (var key in obj) {
        this[key] = obj[key];
    }
}

Nat.prototype.save = function (fn) {
    var entryJSON = JSON.stringify(this);
    //console.log("Saving ", this);
    db.hset(REDIS_KEY, this.id, entryJSON);
};

Nat.getRange = function (from, to, fn) {
    db.lrange(REDIS_KEY, from, to, function (err, items) {
        if (err) return fn(err);
        var entries = [];
        items.forEach(function (item) {
            entries.push(JSON.parse(item));
        });
        fn(null, entries);
    });
};

Nat.getAll = function (fn) {
  var objList = [];
  db.hgetall(REDIS_KEY, function(err, objs) {
    for(var obj in objs) {
        var entryJSON = JSON.parse(objs[obj]);
        //console.log("Getting ", entryJSON);
      objList.push(entryJSON);
    }
    fn(null, objList);
  });
};

Nat.getByName = function (name, fn) {
  var match;
  db.hgetall(REDIS_KEY, function(err, objs) {
    for(var obj in objs) {
      var entryJSON = JSON.parse(objs[obj]);
      if (entryJSON.name == name) {
        match = entryJSON;
        fn(null, match);
        break;
      }
    }
    if (!match) fn(null, null);
  });
};

// this is potentially dangerous, but should be helpful during development
Nat.flushAll = function (fn) {
    db.del(REDIS_KEY, function (err, items) {
        if (err) return fn(err);
        if (fn) fn(null, null);
    });
};
