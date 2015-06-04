/*jslint node:true*/

var pkginfo = require('pkginfo')(module, 'name', 'version');

// careful not to collide with the version property!
exports.getVersion = function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.json({name: module.exports.name,
              version: module.exports.version});
};
