///**
// * Module dependencies.
// */
//var config = require('../../config/config'),
//    amqp = require('amqplib');
//
///**
// * Connector constructor.
// *
// * @param name
// * @param service
// * @constructor
// */
//function Connector(conn) {
//    this._strategies = {};
//    this._connection = conn || null;
//    this._channel = null;
//    this._exchange = 'esp';
//
//    this.createChannel();
//}
//
//Connector.prototype.createChannel = function () {
//    conn = conn || createConnection();
//    var self = this;
//
//    conn.createChannel().then(function (ch) {
//        self._channel = ch;
//    });
//};
//
///**
// * Add new strategy to connector.
// *
// * @param name
// * @param strategy
// */
//Connector.prototype.use = function (name, strategy) {
//    var self = this;
//
//    if (!strategy) {
//        throw new Error(' [e] ' + name + ' strategy is not defined!');
//    }
//
//    // Add new strategy
//    this._strategies[name] = strategy;
//
//    // Assert exchange
//    var ok = ch.assertExchange(self._exchange, 'topic', {durable: true});
//
//    // Create a queue : field.query
//    ok = ok.then(function () {
//        ch.assertQueue('', {exclusive: true, durable: true}).then(function (qok) {
//            var queue = qok.queue;
//            ch.bindQueue(queue, self._exchange, name + '.field.query');
//            return ch.consume(queue, strategy.queryField);
//        });
//    });
//};
//
//Connector.prototype.createConnection = function () {
//    var self = this;
//
//    amqp.connect(config.rabbitmq.uri).then(function (conn) {
//        self._connection = conn;
//    });
//}
//
///**
// * Expose `Connector`.
// */
//module.exports = Connector;


/**
 * Module dependencies.
 */
var config = require('../../config/config'),
    Authentication = require('../../app/models/authentication.server.model'),
    amqp = require('amqplib'),
    when = require('when'),
    defer = when.defer;

/**
 * Private variables
 */

/**
 * Connector constructor.
 *
 * @param name
 * @param service
 * @constructor
 */
function Connector(name, conn) {
    this._name = name || '';
    this._connection = conn || null;
    this._channel = null;
    this._exchange = 'esp';
    this._api = {};

    var self = this;

    this.createConnection().then(function () {
        return self.createChannel();
    }).then(function () {
        self.init();
    });
}

/**
 * Create new connection to rabbitmq server
 *
 * @returns {*|Promise}
 */
Connector.prototype.createConnection = function () {
    var self = this;
    var deferred = defer();

    if (self._connection === null) {
        amqp.connect(config.rabbitmq.uri).then(function (conn) {
            self._connection = conn;
            return deferred.resolve();
        }, function () {
            return deferred.reject();
        });
    } else {
        deferred.resolve();
    }

    return deferred.promise;
};

/**
 * Create amqp channel.
 *
 * @returns {*|Promise}
 */
Connector.prototype.createChannel = function () {
    var self = this;

    if (self._connection === null) {
        throw new Error(' [e] ' + self._name + ' error occured : connection is not defined');
    }

    return self._connection.createChannel().then(function (ch) {
        return self._channel = ch;
    });
};

/**
 * Add new strategy to connector.
 *
 * @param name
 * @param strategy
 */
Connector.prototype.init = function () {
    var self = this;
    var ch = self._channel;

    // parse message
    function parse(msg) {
        var parsed = JSON.parse(msg.content.toString());

        console.log(' [x] data parsed : ', parsed);

        var deferred = defer();

        if( !parsed.id ) {
            deferred.reject('Parameter id is not provided');
        } else {

            // attach connection key.
            Authentication.findById(parsed.id, function (err, conn) {
                if (err) {
                    //throw new Error(' [e] ' + self._name + ' error occured : cannot read connection from db');
                    deferred.reject(err);
                }
                if (!conn) {
                    deferred.reject('No connections found');
                } else {
                    parsed.auth = conn;
                    deferred.resolve(parsed);
                }
            });

        }

        return deferred.promise;
    };

    // define consumer
    function consumer(msg) {

        console.log(" [x] %s:'%s'", msg.fields.routingKey, msg.content.toString());

        // check whether route is valid
        var routes = msg.fields.routingKey.split('.');
        if (!routes[0] || !routes[1] || !routes[2]) {
            return handleErrors('Invalid rabbitmq route');
        }

        var key = routes[1] + '.' + routes[2];
        if (!self._api[key]) {
            return handleErrors('The route specified does not exist!');
        }

        // parse message before handle
        parse(msg).then(function (data) {

            // call api
            self._api[key](data, function (err, data) {
                if (err) {
                    return handleErrors(err);
                } else {
                    data = data ? data : {};
                    ch.sendToQueue(msg.properties.replyTo,
                        new Buffer(JSON.stringify(data)),
                        {correlationId: msg.properties.correlationId});
                    return ch.ack(msg);
                }
            });

        }, function (err) {
            return handleErrors(err);
        });

        // error handler
        function handleErrors(err) {

            // return error message
            ch.sendToQueue(msg.properties.replyTo,
                new Buffer(JSON.stringify(err)),
                {correlationId: msg.properties.correlationId, type: 'error'});
            return ch.ack(msg);

        }

    }

    if (ch === null) {
        throw new Error(' [e] ' + self._name + ' error occured : channel is not defined');
    }

    // Assert exchange
    var ok = ch.assertExchange(self._exchange, 'topic', {durable: true});

    // Create a queue : field.query
    return ok.then(function () {
        ch.assertQueue('', {exclusive: true, durable: true}).then(function (qok) {
            var queue = qok.queue;

            console.log(' [i] ' + self._name + ' connector created queue : ', queue);

            ch.bindQueue(queue, self._exchange, self._name + '.*.*');
            return ch.consume(queue, consumer);
        });
    });
};

/**
 * Set api functions
 *
 * @param apiKey
 * @param func
 * @returns {boolean}
 */
Connector.prototype.use = function (apiKey, func) {
    var self = this;

    if (!func || !apiKey) {
        throw new Error(' [e] ' + self._name + ' error occured : parameter is empty in connector.use');
        return false;
    }

    self._api[apiKey] = func;
};

/**
 * Expose `Connector`.
 */
module.exports = Connector;
