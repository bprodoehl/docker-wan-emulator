/*jslint node:true*/

var async = require('async');
var exec = require('child_process').exec;
var sprintf = require("sprintf-js").sprintf;

/* Express models */
var Bridge = require('../models/bridge');
var Nat = require('../models/nat');
var NetemPort = require('../models/netem_port');

var NetemCommands = require('../netem_commands');

var execHelper = function (cmdObj, cb) {
    console.log('Executing "'+cmdObj.cmd+'"');
    var child = exec(cmdObj.cmd,
        function (error, stdout, stderr) {
            if (stdout.length)
              console.log('stdout: ' + stdout);
            if (stderr.length)
              console.log('stderr: ' + stderr);
            if (error !== null && !cmdObj.ignoreError) {
                console.log('exec error: ' + error);
                cb(error);
                return;
            }
            cb(null);
        }
    );
};

function createBridge (bridgeName, interfaces, response) {
    async.series([
        function(callback) {
            console.log('Creating bridge');
            execHelper({cmd:'sudo brctl addbr ' + bridgeName}, callback);
        },
        function(callback) {
            console.log('Adding interfaces');
            var cmdStr = '';
            for (var ifIndex=0; ifIndex < interfaces.length; ifIndex++) {
                if (ifIndex > 0)
                    cmdStr = cmdStr + ' && ';
                cmdStr = cmdStr + 'sudo brctl addif ' + bridgeName + ' ' +
                         interfaces[ifIndex];
            }
            execHelper({cmd: cmdStr}, callback);
        },
        function(callback) {
            console.log('Bringing bridge up');
            execHelper({cmd: 'sudo ifconfig ' + bridgeName + ' up'}, callback);
        }
    ],
    function(error, results) {
        console.log('All done!');
        if (typeof(error) !== 'undefined' && error !== null) {
            response.status(400).send('failure: ' + error);
        } else {
            new Bridge({name: bridgeName, interfaces: interfaces}).save();
            response.status(200).send('success');
        }
    });
}

function createNat (natName, lanIface, wanIface, response) {
    var commands = [];
    commands.push({cmd: 'sudo iptables -t nat -A POSTROUTING -o '+wanIface+
                        ' -j MASQUERADE'});
    commands.push({cmd: 'sudo iptables -A FORWARD -i '+wanIface+' -o '+
                        lanIface+' -m state --state RELATED,ESTABLISHED -j '+
                        'ACCEPT'});
    commands.push({cmd: 'sudo iptables -A FORWARD -i '+lanIface+' -o '+
                        wanIface+' -j ACCEPT'});
    commands.push({cmd: 'echo interface='+lanIface+' > /etc/dnsmasq.d/'+
                        lanIface+'.conf'});
    commands.push({cmd: 'ip addr show dev '+lanIface+' | '+
                        'awk -F\'[ /]*\' \'/inet /{print $3}\' | '+
                        'awk -F\'.\' \'{print "dhcp-range="$1"."$2"."$3".50,'+
                        '"$1"."$2"."$3".150,1h"}\' >> /etc/dnsmasq.d/'+
                        lanIface+'.conf'});
    commands.push({cmd: 'sudo sv restart dnsmasq'});
    async.eachSeries(commands, execHelper,
    function(error, results) {
        console.log('All done!');
        if (typeof(error) !== 'undefined' && error !== null)
            response.status(400).send('failure: ' + error);
        else
            response.status(200).send('success');
    });
}

function configurePort (name, params, response) {
    console.log('Configuring port ' + name + ' with ' + JSON.stringify(params));

    var netemCommands = [];
    NetemPort.getByName(name, function(err, netemPort) {
      if (err) {
        res.status(400).send('ERROR');
        return;
      } else if (!netemPort) {
        // create a new port
        console.log('Creating a new Netem port');
        netemPort = new NetemPort(params);
        netemPort.name = name;
        netemPort.save();
        netemCommands = NetemCommands.build(netemPort, 'add');
      } else {
        // update an existing port
        console.log('Updating an existing Netem port');
        // not sure if this should just update the params that are included,
        // over the top of what is already set, or set them back to defaults
        netemPort = new NetemPort(params);
        netemPort.name = name;
        netemPort.save();
        netemCommands = NetemCommands.build(netemPort, 'change');
      }

      console.log('Running:\n'+JSON.stringify(netemCommands));

      async.eachSeries(netemCommands, execHelper,
        function(error, results) {
            console.log('All done!');
            if (typeof(error) !== 'undefined' && error !== null) {
                response.status(400).send('failure: ' + error);
            } else {
                response.send('success');
            }
        });
    });
}

exports.get_ports = function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    NetemPort.getAll(function (err, ports) {
      if (err) return next(err);
        res.json(ports);
      });
    return;
};

exports.get_port = function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    NetemPort.getByName(req.params.id, function(err, obj) {
      if (err || !obj) {
        res.status(400).send('ERROR');
      } else {
        res.status(200).json(obj);
      }
    });
};

exports.post_port = function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    var portName = req.params.id;
    var portParams = req.body;
    configurePort(portName, portParams, res);
};

exports.get_bridges = function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    Bridge.getAll(function (err, bridges) {
      if (err) return next(err);
        res.json(bridges);
      });
    return;
};

exports.get_bridge = function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    Bridge.getByName(req.params.id, function(err, obj) {
      if (err || !obj) {
        res.status(400).send('ERROR');
      } else {
        res.status(200).json(obj);
      }
    });
};

exports.post_bridge = function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    var bridgeName = req.params.id;
    var interfaces = req.body.ifaces;
    createBridge(bridgeName, interfaces, res);
};

exports.get_nats = function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    Nat.getAll(function (err, nats) {
      if (err) return next(err);
        res.json(nats);
      });
    return;
};

exports.get_nat = function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    Nat.getByName(req.params.id, function(err, obj) {
      if (err || !obj) {
        res.status(400).send('ERROR');
      } else {
        res.status(200).json(obj);
      }
    });
};

exports.post_nat = function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    var natName = req.params.id;
    var lanIface = req.body.lan;
    var wanIface = req.body.wan;
    createNat(natName, lanIface, wanIface, res);
};
