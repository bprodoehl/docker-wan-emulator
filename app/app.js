/* jshint node:true */

var express = require('express');
var bodyParser = require('body-parser');

var Bridge = require('./lib/models/bridge');
var Nat = require('./lib/models/nat');
var NetemPort = require('./lib/models/netem_port');

var netemRoute = require('./lib/routes/netem');
var pingRoute = require('./lib/routes/ping');
var versionRoute = require('./lib/routes/version');

var app = express();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: true}));

// parse application/json
app.use(bodyParser.json());

app.get('/ping', pingRoute.ping);
app.get('/version', versionRoute.getVersion);

app.get('/ports', netemRoute.get_ports);
app.get('/port/:id', netemRoute.get_port);
app.post('/port/:id', netemRoute.post_port);

app.get('/bridges', netemRoute.get_bridges);
app.get('/bridge/:id', netemRoute.get_bridge);
app.post('/bridge/:id', netemRoute.post_bridge);

app.get('/nats', netemRoute.get_nats);
app.get('/nat/:id', netemRoute.get_nat);
app.post('/nat/:id', netemRoute.post_nat);

Bridge.flushAll();
Nat.flushAll();
NetemPort.flushAll();

var server = app.listen(3000, function() {
  console.log('web app is listening...');
});
