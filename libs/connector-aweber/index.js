/**
 * Module dependencies.
 */
var Connector = require('../connector'),
    _ = require('lodash'),
    config = require('../../config/config'),
    OAuth = require('oauth').OAuth,
    async = require('async');

/**
 * Setup aweber api
 *
 * @param conn
 */
exports.setup = function (conn) {

    // create aweber-connector instance
    var connector = new Connector('aweber', conn);

    // oAuth consumer
    var oauth = new OAuth(
        'https://auth.aweber.com/1.0/oauth/request_token',
        'https://auth.aweber.com/1.0/oauth/access_token',
        String(config.connectors.aweber.consumerKey),
        String(config.connectors.aweber.consumerSecret),
        '1.0',
        null,
        'HMAC-SHA1'
    );

    /**
     * api handler - field.query
     */
    connector.use('field.query', function (data, callback) {

        console.log(' [x] Handling API - field.query : ', data);

        if (!data.auth || !data.auth.conn || !data.auth.conn.accessToken || !data.auth.conn.accessTokenSecret) {
            return callback('Invalid input data');
        }

        var accessToken = data.auth.conn.accessToken,
            accessTokenSecret = data.auth.conn.accessTokenSecret;

        // get account
        oauth.get('https://api.aweber.com/1.0/accounts', accessToken, accessTokenSecret, function (err, account, response) {
            if (err) {
                console.log(' [e] Aweber error : ', err.data);
                return callback('Error is occured during calling Aweber API');
            }

            // parse response data
            account = JSON.parse(account);

            // get lists
            oauth.get(account.entries[0].lists_collection_link, accessToken, accessTokenSecret, function (err, lists, response) {
                if (err) {
                    return callback(err);
                }

                lists = JSON.parse(lists);
                console.log(' [i] aweber received lists : ', lists);

                async.map(lists.entries, function (list, cb) {
                    oauth.get(list.custom_fields_collection_link, accessToken, accessTokenSecret, function (err, fields, response) {
                        if (err) {
                            return cb(err);
                        }

                        fields = JSON.parse(fields);

                        var result = {};

                        result.listId = list.id;
                        result.listName = list.name;
                        result.fields = _.map(fields.entries, function (field) {
                            var f = {};
                            f.id = field.id;
                            f.fieldName = field.name;
                            f.fieldType = 'text';
                            f.required = false;
                            return f;
                        });
                        result.fields.push({
                            id: 'email',
                            fieldName: 'email',
                            fieldType: 'email',
                            required: true
                        }, {
                            id: 'name',
                            fieldName: 'name',
                            fieldType: 'text',
                            required: false
                        });

                        return cb(null, result);
                    });
                }, function (err, fields) {
                    if (err) {
                        console.log(' [e] Aweber error : ', err.data);
                        return callback('Error is occured during calling Aweber API');
                    }

                    console.log(' [x] aweber returning retrieved fieldsets : ', fields);
                    return callback(null, fields);
                });
            });

        });

    });

    /**
     * api handler - list.query
     */
    connector.use('list.query', function (data, callback) {

        console.log(' [x] Handling API - list.query : ', data);

        if (!data.auth || !data.auth.conn || !data.auth.conn.accessToken || !data.auth.conn.accessTokenSecret) {
            return callback('Invalid input data');
        }

        var accessToken = data.auth.conn.accessToken,
            accessTokenSecret = data.auth.conn.accessTokenSecret;

        // get account
        oauth.get('https://api.aweber.com/1.0/accounts', accessToken, accessTokenSecret, function (err, account, response) {
            if (err) {
                console.log(' [e] Aweber error : ', err.data);
                return callback('Error is occured during calling Aweber API');
            }

            // parse response data
            account = JSON.parse(account);

            // get lists
            oauth.get(account.entries[0].lists_collection_link, accessToken, accessTokenSecret, function (err, lists, response) {
                if (err) {
                    console.log(' [e] Aweber error : ', err.data);
                    return callback('Error is occured during calling Aweber API');
                }

                lists = JSON.parse(lists);

                var results = _.map(lists.entries, function (list) {
                    var r = {};

                    r.id = list.id;
                    r.listName = list.name;

                    return r;
                });

                console.log(' [x] aweber return retrieved lists : ', results);

                return callback(null, results);

            });

        });

    });

    /**
     * api handler - subscriber.create
     */
    connector.use('subscriber.create', function (data, callback) {

        console.log(' [x] Handling API - subscriber.create : ', data);

        if (!data.params || !data.params.fields || !data.params.list || !data.params.list.id) {
            console.log(' [e] Aweber error occured : Invalid parameter');
            return callback('Invalid parameter');
        }

        if (!data.auth || !data.auth.conn || !data.auth.conn.accessToken || !data.auth.conn.accessTokenSecret) {
            return callback('Invalid input data');
        }

        var accessToken = data.auth.conn.accessToken,
            accessTokenSecret = data.auth.conn.accessTokenSecret;

        // email
        var email = _.find(data.params.fields, {name: 'email'});

        if (!email || !email.value) {
            console.log(' [e] Aweber error occured : Email is not provided!');
            return callback('Email is not provided');
        }

        // name field
        var name = _.find(data.params.fields, {name: 'name'});

        // custom fields
        var customFields = [];
        _.forEach(data.params.fields, function (field) {
            if (field.name != 'email' && field.name != 'name') {
                customFields[field.name] = field.value;
            }
        });

        console.log(" [i] Custom fields : ", customFields );

        // request body
        var reqBody = {
            'ws.op': 'create',
            'custom_fields': customFields,
            'email': email.value
        };
        if (name && name.value) {
            reqBody.name = name.value
        }

        // get account
        oauth.get('https://api.aweber.com/1.0/accounts', accessToken, accessTokenSecret, function (err, account, response) {
            if (err) {
                console.log(' [e] Aweber error : ', err.data);
                return callback('Error is occured during calling Aweber API');
            }

            // parse response data
            account = JSON.parse(account);

            // post subscriber
            oauth.post(account.entries[0].self_link + '/lists/' + data.params.list.id + '/subscribers', accessToken, accessTokenSecret, reqBody, 'application/json', function (err, data, response) {
                if (response.statusCode === 201) {
                    console.log(data);
                    return callback(null, data);
                } else {
                    console.log(' [e] Aweber error : ', err.data);
                    return callback('Error is occured during calling Aweber API');
                }
            });

        });

    });

    /**
     * api handler - field.create
     */
    connector.use('field.create', function (data, callback) {

        console.log(' [x] Aweber Handling API - field.create : ', data);

        if (!data.auth || !data.auth.conn || !data.auth.conn.accessToken || !data.auth.conn.accessTokenSecret) {
            return callback('Invalid access token and secret');
        }
        // parameter validation
        if (!data.params || !data.params.list || !data.params.name || !data.params.label || !data.params.type) {
            console.log(' [e] Aweber error occured : Invalid parameter');
            return callback('Invalid parameter');
        }

        if (data.params.name.length > 100) {
            console.log(' [e] Aweber error occured : field name is too long. max - 100!');
            return callback('Field name is too long. The length should be less than equal to 100.');
        }

        var accessToken = data.auth.conn.accessToken,
            accessTokenSecret = data.auth.conn.accessTokenSecret;

        var list = data.params.list,
            name = data.params.name;

        // request body
        var reqBody = {
            'ws.op': 'create',
            'name': name
        };

        // call aweber api to create new field
        oauth.get('https://api.aweber.com/1.0/accounts', accessToken, accessTokenSecret, function (err, account, response) {
            if (err) {
                console.log(' [e] Aweber error : ', err.data);
                return callback('Error is occured during calling Aweber API');
            }

            // parse response data
            account = JSON.parse(account);

            // send post request to create new field
            oauth.post(account.entries[0].self_link + '/lists/' + list.listId + '/custom_fields', accessToken, accessTokenSecret, reqBody, 'application/json', function (err, data, response) {
                if (response.statusCode === 201) {
                    oauth.get(response.headers.location, accessToken, accessTokenSecret, function (err, espField, response) {
                        if(err) {
                            console.log(' [e] Aweber error : ', err.data);
                            return callback('Error is occured during calling Aweber API');
                        }

                        espField = JSON.parse(espField);

                        var field = {
                            list: list,
                            id: espField.id,
                            fieldName: espField.name,
                            fieldType: 'text',
                            required: false
                        };

                        return callback(null, field);
                    });
                } else {
                    console.log(' [e] Aweber error : ', err.data);
                    return callback('Error is occured during calling Aweber API. Please double check that field names are not repeated.');
                }
            });

        });

    });


};
