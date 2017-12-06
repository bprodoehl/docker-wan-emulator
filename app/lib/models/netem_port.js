/*jslint node:true*/

var redis = require('redis');
var db = redis.createClient();

module.exports = NetemPort;

var REDIS_KEY='netem-port';

var base_obj = {
  ifname: '',
  enabled: true,
  ratecontrol: false,
  ratecontrol_rate: 0,
  ratecontrol_burst: 0,
  queue_delay_ms: 0,
  delay: false,
  delay_ms: 0,
  delay_var: 0,
  delay_corr: 0,
  delay_dist: 'normal',
  reordering: false,
  reordering_immed_pct: 0,
  reordering_corr: 0,
  loss: false,
  loss_pct: 0,
  loss_corr: 0,
  duplication: false,
  duplication_pct: 0,
  corruption: false,
  corruption_pct: 0
};

function NetemPort(obj) {
    for (var base_key in base_obj) {
        this[base_key] = base_obj[base_key];
    }
    for (var obj_key in obj) {
        this[obj_key] = obj[obj_key];
    }
}

NetemPort.prototype.save = function (fn) {
    var entryJSON = JSON.stringify(this);
    //console.log("Saving ", this);
    db.hset(REDIS_KEY, this.name, entryJSON);
};

NetemPort.getRange = function (from, to, fn) {
    db.lrange(REDIS_KEY, from, to, function (err, items) {
        if (err) return fn(err);
        var entries = [];
        items.forEach(function (item) {
            entries.push(JSON.parse(item));
        });
        fn(null, entries);
    });
};

NetemPort.getAll = function (fn) {
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

NetemPort.getByName = function (name, fn) {
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
NetemPort.flushAll = function (fn) {
    db.del(REDIS_KEY, function (err, items) {
        if (err) return fn(err);
        if (fn) fn(null, null);
    });
};
