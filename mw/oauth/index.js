'use strict';

/**
 *
 * @param configuration
 * @returns {Function}
 */
module.exports = function (configuration) {

    configuration.soajs.oauthService = configuration.soajs.param.oauthService || {};
    configuration.soajs.oauthService.name = configuration.soajs.oauthService.name || "oauth";
    configuration.soajs.oauthService.tokenApi = configuration.soajs.oauthService.tokenApi || "/token";
    configuration.soajs.oauthService.authorizationApi = configuration.soajs.oauthService.authorizationApi || "/authorization";


    let oauthserver = require('oauth2-server');
    let oauthObj = oauthserver({
        model: configuration.model,
        grants: configuration.serviceConfig.oauth.grants,
        debug: configuration.serviceConfig.oauth.debug,
        accessTokenLifetime: configuration.serviceConfig.oauth.accessTokenLifetime,
        refreshTokenLifetime: configuration.serviceConfig.oauth.refreshTokenLifetime
    });

    let jwt = require('jsonwebtoken');

    return function (req, res, next) {

        let oauthServiceConfig = req.soajs.servicesConfig[configuration.soajs.oauthService.name] || {};

        let oauthType = 2;
        if (Object.hasOwnProperty.call(oauthServiceConfig, 'type')) {
            oauthType = oauthServiceConfig.type;
        }
        else if (Object.hasOwnProperty.call(req.soajs.registry.serviceConfig.oauth, 'type')) {
            oauthType = req.soajs.registry.serviceConfig.oauth.type
        }

        //0=oauth0, 2=oauth2
        if (2 === oauthType) {
            oauthObj.authorise()(req, res, next);
        }
        else {
            let algorithms = oauthServiceConfig.algorithms || req.soajs.registry.serviceConfig.oauth.algorithms;
            let audience = oauthServiceConfig.audience || req.soajs.registry.serviceConfig.oauth.audience;
            let secret = oauthServiceConfig.secret || req.soajs.registry.serviceConfig.oauth.secret;

            let headerToken = req.get('Authorization');
            if (headerToken) {
                var matches = headerToken.match(/Bearer\s(\S+)/);

                if (!matches)
                    return next(143);

                headerToken = matches[1];
                jwt.verify(headerToken, secret, {algorithms: algorithms, audience: audience}, (error, decoded) => {
                    if (error) {
                        next(error);
                    }
                    else {
                        req.oauth = {
                            bearerToken: decoded,
                            type: oauthType
                        };
                        next();
                    }
                });
            }
            else {
                next(143);
            }
        }
    };
};