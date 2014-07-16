/*jslint node:true*/

var async = require('async');
var exec = require('child_process').exec;
var sprintf = require("sprintf-js").sprintf;

var execHelper = function (cmd, cb) {
    var child = exec(cmd,
        function (error, stdout, stderr) {
            console.log('stdout: ' + stdout);
            console.log('stderr: ' + stderr);
            if (error !== null) {
                console.log('exec error: ' + error);
                cb(error);
            }
            cb(null);
        }
    );
};

function createBridge (bridgeName, interfaces, response) {
    async.series([
        function(callback) {
            console.log('Creating bridge');
            execHelper('sudo brctl addbr ' + bridgeName, callback);
        },
        function(callback) {
            console.log('Adding interfaces');
            var cmdStr = '';
            for (var ifIndex=0; ifIndex < interfaces.length; ifIndex++) {
                if (ifIndex > 0)
                    cmdStr = cmdStr + ' && ';
                cmdStr = cmdStr + 'sudo brctl addif ' + bridgeName + ' ' + interfaces[ifIndex];
            }
            execHelper(cmdStr, callback);
        },
        function(callback) {
            console.log('Bringing bridge up');
            execHelper('sudo ifconfig ' + bridgeName + ' up', callback);
        }
    ],
    function(error, results) {
        console.log('All done!');
        if (typeof(error) !== 'undefined' && error !== null)
            response.send(400, 'failure: ' + error);
        else
            response.send(200, 'success');
    });
}

function createNat (natName, lanIface, wanIface, response) {
    async.series([
        function(callback) {
            console.log('Creating NAT');
            execHelper(sprintf('sudo iptables -t nat -A POSTROUTING -o %s -j MASQUERADE && '+
'sudo iptables -A FORWARD -i %s -o %s -m state --state RELATED,ESTABLISHED -j ACCEPT && ' +
'sudo iptables -A FORWARD -i %s -o %s -j ACCEPT', wanIface, wanIface, lanIface, lanIface, wanIface), callback);
        }
    ],
    function(error, results) {
        console.log('All done!');
        if (typeof(error) !== 'undefined' && error !== null)
            response.send(400, 'failure: ' + error);
        else
            response.send(200, 'success');
    });
}

function configurePort (name, params, response) {
    console.log('Configuring port ' + name + ' with ' + JSON.stringify(params));
    response.send(200, 'success');
}

exports.get_ports = function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.send('get_ports\n');
};

exports.get_port = function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.send('get_port ' + req.params.id + '\n');
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
    res.send('get_bridges\n');
};

exports.get_bridge = function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.send('get_bridge ' + req.params.id + '\n');
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
    res.send('get_nats\n');
};

exports.get_nat = function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.send('get_nat ' + req.params.id + '\n');
};

exports.post_nat = function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    
    var natName = req.params.id;
    var lanIface = req.body.lan;
    var wanIface = req.body.wan;
    createNat(natName, lanIface, wanIface, res);
};
