'use strict';

/**
 * Module dependencies.
 */
var express = require('express'),
    OAuth = require('oauth').OAuth,
    errorHandler = require('../errors.server.controller'),
    config = require('../../../config/config'),
    mongoose = require('mongoose'),
    Authentication = mongoose.model('Authentication'),
    uuid = require('uuid'),
    when = require('when'),
    defer = when.defer,
    mcapi = require('mailchimp-api');


/**
 * authenticate function
 *
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
exports.authenticate = function (req, res, next) {
    console.log(' [i] Incoming res header: ', res.req.headers);
    console.log(' [i] Incoming req body: ', req.body);

    if (req.body.api_key && req.body.corrId && req.body.queue) {
        var apiKey = String(req.body.api_key);
        var corrId = String(req.body.corrId);
        var queue = String(req.body.queue);
        var app = String(req.body.app);
        var redirect = String(req.body.redirect);
        var conn = req.conn;

        // setup mailchimp api key
        var mc = new mcapi.Mailchimp(apiKey);

        // ping to test connection
        mc.helper.ping(function (data) {

            // success
            // create new connection doc in db
            var auth = new Authentication();

            auth.conn = {
                apiKey: apiKey
            };
            auth.app = app;

            auth.save(function (err, auth) {
                if (err) {

                    console.log(' [e] Mailchimp authentication error : db transaction failed !');
                    return res.redirect('/#!/auth/' + req.params.service + '/fail');

                } else {

                    conn.createChannel().then(function (ch) {
                        var answer = defer();
                        var callbackCorrId = uuid();

                        var callback = function (msg) {
                            if (msg.properties.correlationId === callbackCorrId) {
                                if(msg.properties.type && msg.properties.type === 'error') {
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
                            console.log(' [e] Authentication succeed: %s', result);
                            return res.sendStatus(200);
                        }, function(err) {
                            console.log(' [e] Authentication failed: %s', err);
                            return res.send(500, err);
                        });
                    });

                }
            });

        }, function (err) {
            console.log(' [e] Mailchimp authentication error occured : ', err);
            //return res.redirect('/#!/auth/mailchimp/fail');
            return res.sendStatus(403);
        });

    } else {
        console.log(' [e] Parameters are not valid!');
        //return res.redirect('/#!/auth/' + req.params.service + '/fail');
        return res.sendStatus(400);

    }
};
