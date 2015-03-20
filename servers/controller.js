'use strict';

var http = require('http');
var core = require('./../modules/soajs.core/index.js');

var registry = core.getRegistry();
var log = null;

var cors_mw = require('./../mw/cors/index');
var soajs_mw = require('./../mw/soajs/index');
var response_mw = require('./../mw/response/index');
var controller_mw = require('./../mw/controller/index');

/**
 *
 */
function controller() {
    log = core.getLogger("controller", registry.serviceConfig.logger);
    this.server = http.createServer(function (req, res) {
        if (req.url === '/favicon.ico') {
            res.writeHead(200, {'Content-Type': 'image/x-icon'});
            res.end();
            return;
        }
        soajs_mw({"serviceName": "controller", "log": log, "registry": registry})(req, res, function () {
            cors_mw()(req, res, function () {
                response_mw({"controllerResponse": true})(req, res, function () {
                    controller_mw()(req, res, function () {
                        var body = '';

                        req.on("data", function (chunk) {
                            body += chunk;
                        });

                        /* Close the connection */
                        req.on("end", function () {
                            process.nextTick(function () {
                                try {
                                    req.soajs.controller.gotoservice(req, res, body);
                                } catch (err) {
                                    return req.soajs.controllerResponse(core.error.getError(136));
                                }
                            });
                        });


                        req.on("error", function (error) {
                            req.soajs.log.error("Error @ controller:", error);
                            if (req.soajs.controller.redirectedRequest) {
                                req.soajs.controller.redirectedRequest.abort();
                            }
                        });

                        req.on("close", function () {
                            if (req.soajs.controller.redirectedRequest) {
                                req.soajs.log.info("Request aborted:", req.url);
                                req.soajs.controller.redirectedRequest.abort();
                            }
                        });
                    });
                });
            });
        });
    });

    this.serverMaintenance = http.createServer(function (req, res) {
        if (req.url === '/reloadRegistry') {
            registry = core.reloadRegistry();
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify(registry));
            return;
        }

        if (req.url === '/heartbeat') {
            res.writeHead(200, {'Content-Type': 'application/json'});
            var response = {
                'result': true,
                'ts': Date.now(),
                'service': {
                    'service': 'CONTROLLER',
                    'type': 'rest',
                    'route': '/heartbeat'
                }
            };
            res.end(JSON.stringify(response));
            return;
        }

        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end("nothing to do!");
    });
}

/**
 *
 */
controller.prototype.start = function (cb) {
    this.server.on('error', function (err) {
        if (err.code === 'EADDRINUSE') {
            log.error('Address [port: ' + registry.services.controller.port + '] in use by another service, exiting');
        }
        else
            log.error(err);
    });
    this.server.listen(registry.services.controller.port, function (err) {
        if (err) {
            log.error(err);
        }
        if (cb) {
            cb(err);
        }
    });
    this.serverMaintenance.on('error', function (err) {
        if (err.code === 'EADDRINUSE') {
            log.error('Address [port: ' + (registry.services.controller.port + registry.serviceConfig.maintenancePortInc) + '] in use by another service, exiting');
        }
        else
            log.error(err);
    });
    this.serverMaintenance.listen(registry.services.controller.port + registry.serviceConfig.maintenancePortInc, function (err) {
        if (err) {
            log.error(err);
        }
    });

};


controller.prototype.stop = function (cb) {
    log.info('stopping controllerServer on port:', registry.services.controller.port);
    var self = this;
    this.server.close(function (err) {
        self.serverMaintenance.close(function (err) {
            if (cb) {
                cb(err);
            }
        });
    });
};

module.exports = controller;