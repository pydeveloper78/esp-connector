'use strict';

/**
 * Module dependencies.
 */

module.exports = function(app, conn) {
    // Aweber Routes
    var authenticator = require('../../app/controllers/authenticator.server.controller');
    var amqpConn = function (req, res, next) {
        req.conn = conn;
        next();
    };

    // Setting up the aweber authenticate api
    app.route('/esp/:service/auth').post(amqpConn, authenticator.authenticate);
    app.route('/esp/:service/oauthCallback').get(amqpConn, authenticator.oauthCallback);

    // Setting up api to get authentication fields
    app.route('/esp/:service/form').get(authenticator.getAuthFormData);

    // Save publication
    app.route('/esp/:service/publication').post(amqpConn, authenticator.savePublication);
};
