/*jslint node:true*/

var async = require('async');
var exec = require('child_process').exec;

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
    res.send('post_port ' + req.params.id + '\n');
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
    var responseBody = 'post_bridge ' + req.params.id + '\n';
    
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
    res.send('post_nat ' + req.params.id + '\n');
};
