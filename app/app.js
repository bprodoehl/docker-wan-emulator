/* jshint node:true */

var express = require('express');
var app = express();

app.get('/hello.txt', function(req, res) {
    res.send('Hello World');
});

var server = app.listen(3000, function() {
    // under Phusion Passenger. server.address() blows up
    //console.log('Listening on port %d', server.address().port);
    console.log('express.js app is listening...');
});
