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
    defer = when.defer;


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

    if (req.body.corrId && req.body.queue) {
        var consumerKey = String(config.connectors.aweber.consumerKey);
        var consumerSecret = String(config.connectors.aweber.consumerSecret);
        var corrId = String(req.body.corrId);
        var queue = String(req.body.queue);
        var app = String(req.body.app);
        var redirect = String(req.body.redirect);

        var oauth = new OAuth(
            'https://auth.aweber.com/1.0/oauth/request_token',
            'https://auth.aweber.com/1.0/oauth/access_token',
            consumerKey,
            consumerSecret,
            '1.0',
            'http://54.86.58.63:3000' + config.connectors[req.params.service].callbackURL,
            'HMAC-SHA1'
        );

        oauth.getOAuthRequestToken(function (error, oauth_token, oauth_token_secret, results) {
            if (error) {
                console.log(' [e] Authentication failed!');
                return res.redirect('/#!/auth/' + req.params.service + '/fail');
            }
            else {
                req.session.oauth = {
                    token: oauth_token,
                    token_secret: oauth_token_secret,
                    corr_id: corrId,
                    queue: queue,
                    app: app,
                    redirect: redirect
                };
                res.json({
                    redirectUrl: 'https://auth.aweber.com/1.0/oauth/authorize?oauth_token=' + oauth_token
                });
            }
        });
    } else {
        console.log(' [e] Parameters are not valid!');
        return res.sendStatus(403);
    }
};

/**
 * oauth callback function
 *
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
exports.callback = function (req, res, next) {
    console.log(' [i] oauth callback handler - oauth session data : ', req.session.oauth);

    var conn = req.conn;

    // check necessary session data is exist
    if (req.session.oauth) {
        req.session.oauth.verifier = req.query.oauth_verifier;
        var oauth_data = req.session.oauth;
        var consumerKey = String(config.connectors.aweber.consumerKey);
        var consumerSecret = String(config.connectors.aweber.consumerSecret);

        var oauth = new OAuth(
            'https://auth.aweber.com/1.0/oauth/request_token',
            'https://auth.aweber.com/1.0/oauth/access_token',
            consumerKey,
            consumerSecret,
            '1.0',
            'http://54.86.58.63:3000' + config.connectors[req.params.service].callbackURL,
            'HMAC-SHA1'
        );

        // get oauth access token
        oauth.getOAuthAccessToken(
            oauth_data.token,
            oauth_data.token_secret,
            oauth_data.verifier,
            function (error, oauth_access_token, oauth_access_token_secret, results) {
                if (error) {
                    console.log(' [e] Authentication failed!');
                    return res.redirect('/#!/auth/' + req.params.service + '/fail');
                }
                else {
                    // got the token. save it and send token back.
                    conn.createChannel().then(function (ch) {
                        // create exchange
                        var queue = oauth_data.queue;

                        // save data to db
                        var auth = new Authentication();
                        auth.conn = {
                            accessToken: oauth_access_token,
                            accessTokenSecret: oauth_access_token_secret
                        };
                        auth.app = oauth_data.app;
                        auth.save(function (err, auth) {
                            if (err) {
                                console.log(' [e] Authentication failed!');
                                return res.redirect('/#!/auth/' + req.params.service + '/fail');
                            } else {
                                // send back to queue.
                                var answer = defer();
                                var corrId = uuid();

                                var callback = function (msg) {
                                    if (msg.properties.correlationId === corrId) {
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
                                        corrId: oauth_data.corr_id,
                                        connection: auth.id
                                    };
                                    ch.sendToQueue(queue,
                                        new Buffer(JSON.stringify(data)),
                                        {correlationId: corrId, replyTo: q});
                                    return answer.promise;
                                });

                                return ok.then(function(result) {
                                    console.log(' [i] authentication succeed: %s', result);
                                    return res.redirect('/#!/auth/' + req.params.service + '/success' + '?redirectUrl=' + oauth_data.redirect);
                                }, function(err) {
                                    console.log(' [i] authentication failed: %s', err);
                                    return res.redirect('/#!/auth/' + req.params.service + '/fail' + '?redirectUrl=' + oauth_data.redirect);
                                });
                            }
                        });
                    });
                }
            }
        );
    } else {
        console.log(' [e] Session data does not exist!');
        return res.redirect('/#!/auth/' + req.params.service + '/fail');
    }
};
