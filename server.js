'use strict';
/**
 * Module dependencies.
 */
var init = require('./config/init')(),
    config = require('./config/config'),
    mongoose = require('mongoose'),
    chalk = require('chalk'),
    amqp = require('amqplib');

/**
 * Main application entry file.
 * Please note that the order of loading is important.
 */

// Bootstrap db connection
var db = mongoose.connect(config.db, function (err) {
    if (err) {
        console.error(chalk.red('Could not connect to MongoDB!'));
        console.log(chalk.red(err));
    }
});

// Connect to rabbitMQ Server.
amqp.connect(config.rabbitmq.uri).then(function (conn) {
    console.log('RabbitMQ connection success');

    // Setup esp-connectors
    require('./libs/connector-mailchimp').setup(conn);
    require('./libs/connector-emaildirect').setup(conn);
    require('./libs/connector-aweber').setup(conn);

    // Init the express application
    var app = require('./config/express')(db, conn);

    // Bootstrap passport config
    require('./config/passport')();

    // Start the app by listening on <port>
    app.listen(config.port);

    // Expose app
    exports = module.exports = app;

    // Logging initialization
    console.log('MEAN.JS application started on port ' + config.port);

}, function(err) {
    console.log('Could not connect RabbitMQ server. Server will not start');
});
