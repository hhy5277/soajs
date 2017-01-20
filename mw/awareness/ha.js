'use strict';

var drivers = require('soajs.core.drivers');

function checkError(error, code, cb) {
    if(error)
        return cb({
            "error": error,
            "code": code,
            "msg": errorFile[code]
        });
    else
        return cb();
}

module.exports = {
    "init" : function (param){},
    "getServiceHost" : function (serviceName, version, env, cb){
        var options = {
            "params" : {
                "serviceNane": serviceName,
                "version": version,
                "env": env
            }
        }

        drivers.getServiceHost(options, cb);
    }
};