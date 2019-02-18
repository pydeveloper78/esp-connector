'use strict';

/**
 * Module dependencies.
 */
var errorHandler = require('./errors.server.controller'),
    config = require('../../config/config'),
    _ = require('lodash');

/**
 * Authenticate service
 */
exports.authenticate = function(req, res, next) {
    var service = req.params.service || '';

    console.log(' [i] esp authentication - service : ', service);

    if(service === '' || !config.connectors[service]) {
        return res.status(404).send({
            message: 'service name is incorrect!'
        });
    } else {
        require('./authenticators/' + service + '.server.controller').authenticate(req, res, next);
    }
};

/**
 * OAuth Callback
 * @param req
 * @param res
 * @param next
 */
exports.oauthCallback = function(req, res, next) {
    var service = req.params.service || '';

    if(service === '' || !config.connectors[service]) {
        return res.status(404).send({
            message: 'service name is incorrect!'
        });
    } else {
        require('./authenticators/' + service + '.server.controller').callback(req, res, next);
    }
};

/**
 * Get Authentication fields
 * @param req
 * @param res
 */
exports.getAuthFormData = function(req, res) {
    var service = req.params.service || '';

    if(service === '' || !config.connectors[service]) {
        return res.status(404).send({
            message: 'service name is incorrect!'
        });
    } else {
        console.log(' [i] Returning auth fields : ', config.connectors[service].form);
        return res.json(config.connectors[service].form);
    }

};

/**
 * Save publication
 *
 * @param req
 * @param res
 * @returns {*}
 */
exports.savePublication = function(req, res, next) {
    var service = req.params.service || '';

    console.log(' [i] esp set publiction - service : ', service);

    if(service === '' || !config.connectors[service]) {
        return res.status(404).send({
            message: 'service name is incorrect!'
        });
    } else {
        require('./authenticators/' + service + '.server.controller').savePublication(req, res, next);
    }
};
