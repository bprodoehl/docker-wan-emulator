/*jslint node:true*/

exports.ping = function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.send('{\n\"test\": \"test\"\n}\n');
};
