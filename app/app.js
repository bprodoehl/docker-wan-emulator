/* jshint node:true */

var express = require('express');
var bodyParser = require('body-parser');

var netemRoute = require('./routes/netem.js');
var pingRoute = require('./routes/ping.js');
var versionRoute = require('./routes/version.js');

var app = express();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded());

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

var server = app.listen(3000, function() {
    // under Phusion Passenger. server.address() blows up
    //console.log('Listening on port %d', server.address().port);
    console.log('express.js app is listening...');
});
