/*jslint node:true*/

var async = require('async');
var exec = require('child_process').exec;
var sprintf = require("sprintf-js").sprintf;


var Netem = require('../lib/netem');

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
            execHelper('sudo iptables -t nat -A POSTROUTING -o '+wanIface+' -j MASQUERADE && '+
'sudo iptables -A FORWARD -i '+wanIface+' -o '+lanIface+' -m state --state RELATED,ESTABLISHED -j ACCEPT && ' +
'sudo iptables -A FORWARD -i '+lanIface+' -o '+wanIface+' -j ACCEPT && ' +
'echo interface='+lanIface+' > /etc/dnsmasq.d/'+lanIface+'.conf && ' +
'ip addr show dev '+lanIface+' | awk -F\'[ /]*\' \'/inet /{print $3}\' | awk -F\'.\' \'{print "dhcp-range="$1"."$2"."$3".50,"$1"."$2"."$3".150,1h"}\' >> /etc/dnsmasq.d/'+lanIface+'.conf && ' +
'sudo sv restart dnsmasq', callback);
        }
    ],
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
    
//    { "id": 2,
//      "ifname": "eth1",
//      "ratecontrol": "1",
//      "ratecontrol_rate": "1000",
//      "delay": "1",
//      "delay_ms": "20",
//      "delay_var": "0",
//      "delay_corr": "0",
//      "reordering": "1",
//      "reordering_immed_pct": "0",
//      "reordering_corr": "0",
//      "loss": "1",
//      "loss_pct": "0",
//      "loss_corr": "0",
//      "duplication": "1",
//      "duplication_pct": "0",
//      "corruption": "0",
//      "corruption_pct": "0"
//    }
    
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
