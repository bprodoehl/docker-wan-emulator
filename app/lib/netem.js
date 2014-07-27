/*jslint node:true*/

var redis = require('redis');
var db = redis.createClient();

module.exports = Netem;

function Netem(obj) {
    for (var key in obj) {
        this[key] = obj[key];
    }
}

Netem.prototype.save = function (fn) {
    var entryJSON = JSON.stringify(this);
//    db.lpush(
//        'speedservers',
//        entryJSON,
//        function (err) {
//            if (err) return fn(err);
//            fn();
//        }
//    );
    //console.log("Saving ", this);
    db.hset('netem', this.id, entryJSON);
};

Netem.getRange = function (from, to, fn) {
    db.lrange('netem', from, to, function (err, items) {
        if (err) return fn(err);
        var entries = [];
        items.forEach(function (item) {
            entries.push(JSON.parse(item));
        });
        fn(null, entries);
    });
};

Netem.getAll = function (fn) {
  var netemList = [];
  db.hgetall('netem', function(err, netems) {
    for(var netem in netems) {
        var entryJSON = JSON.parse(netems[netem]);
        //console.log("Getting ", entryJSON);
      netemList.push(entryJSON);
    }
    fn(null, netemList);
  });
};

// this is potentially dangerous, but should be helpful during development
Netem.flushAll = function (fn) {
    db.del('netem', function (err, items) {
        if (err) return fn(err);
        fn(null, null);
    });
};
