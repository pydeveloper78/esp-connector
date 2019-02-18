'use strict';

/**
 * Module dependencies.
 */
var express = require('express'),
    errorHandler = require('../errors.server.controller'),
    config = require('../../../config/config'),
    mongoose = require('mongoose'),
    Authentication = mongoose.model('Authentication'),
    uuid = require('uuid'),
    when = require('when'),
    defer = when.defer,
    request = require('request'),
    _ = require('lodash');


/**
 * authenticate function
 *
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
exports.authenticate = function (req, res, next) {

    if (req.body.api_key) {
        var apiKey = String(req.body.api_key);

        // ping to test connection
        request({
                method: 'GET',
                uri: 'https://rest.emaildirect.com/v1/Publications',
                json: true,
                headers: {
                    ApiKey: apiKey
                }
            }, function (error, response, body) {
                if (response.statusCode === 200) {

                    var publications = body.Publications;

                    console.log(' [x] Retrieved publications from Emaildirect : ', publications);

                    // prepare returning data
                    var result = {};
                    result.publications = _.map(publications, function (publication) {
                        var r = {};

                        r.id = publication.PublicationID;
                        r.name = publication.Name;

                        return r;
                    });

                    return res.send(200, result);

                } else {
                    console.log(' [e] Email direct authentication error occured : ', body);
                    return res.sendStatus(403);
                }
            }
        );

    } else {
        console.log(' [e] Parameters are not valid!');
        return res.sendStatus(400);
    }
};

/**
 * Save publication
 *
 * @param req
 * @param res
 * @param next
 */
exports.savePublication = function (req, res, next) {

    if (req.body.api_key && req.body.corrId && req.body.queue && req.body.publication) {
        var apiKey = String(req.body.api_key);
        var corrId = String(req.body.corrId);
        var queue = String(req.body.queue);
        var app = String(req.body.app);
        var conn = req.conn;
        var publication = req.body.publication;

        // ping to test connection

        var auth = new Authentication();

        auth.conn = {
            apiKey: apiKey
        };
        auth.meta = {
            publication: publication
        };
        auth.app = app;

        auth.save(function (err, auth) {
            if (err) {

                console.log(' [e] Emaildirect authentication error : db transaction failed !');
                return res.sendStatus(500);

            } else {

                conn.createChannel().then(function (ch) {
                    var answer = defer();
                    var callbackCorrId = uuid();

                    var callback = function (msg) {
                        if (msg.properties.correlationId) {
                            if (msg.properties.type && msg.properties.type === 'error') {
                                answer.reject(msg.content.toString());
                            } else {
                                answer.resolve(msg.content.toString());
                            }
                        }
                    };

                    var ok = ch.assertQueue('', {exclusive: true})
                        .then(function (qok) {
                            return qok.queue;
                        });

                    ok = ok.then(function (queue) {
                        return ch.consume(queue, callback, {noAck: true})
                            .then(function () {
                                return queue;
                            });
                    });

                    //ok = ch.assertQueue(queue, {durable: true, expires: 60 * 1000, autoDelete: true});
                    ok = ok.then(function (q) {
                        console.log(' [i] sending message : ', auth.id);
                        var data = {
                            corrId: corrId,
                            connection: auth.id
                        };
                        ch.sendToQueue(queue,
                            new Buffer(JSON.stringify(data)),
                            {correlationId: callbackCorrId, replyTo: q});
                        return answer.promise;
                    });

                    return ok.then(function (result) {

                        console.log(' [i] Authentication succeed: %s', result);
                        return res.sendStatus(200);

                    }, function (err) {

                        console.log(' [e] Authentication failed: %s', err);
                        return res.send(400, err);

                    });
                });

            }
        });

    } else {
        console.log(' [e] Parameters are not valid!');
        return res.sendStatus(400);
    }

};
