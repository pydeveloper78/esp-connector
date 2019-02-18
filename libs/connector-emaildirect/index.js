/**
 * Module dependencies.
 */
var Connector = require('../connector'),
    _ = require('lodash'),
    request = require('request');

/**
 * Setup email-direct api
 *
 * @param conn
 */
exports.setup = function (conn) {

    // create emaildirect-connector instance
    var connector = new Connector('emaildirect', conn);

    /**
     * api handler - field.query
     */
    connector.use('field.query', function (data, callback) {

        console.log(' [x] Handling API - field.query : ', data);

        request({
            method: 'GET',
            uri: 'https://rest.emaildirect.com/v1/Database',
            json: true,
            headers: {
                ApiKey: data.auth.conn.apiKey
            }
        }, function (error, response, body) {

            if (response.statusCode === 200) {

                var databaseColumns = body.DatabaseColumns;

                request({
                    method: 'GET',
                    uri: 'https://rest.emaildirect.com/v1/Lists',
                    json: true,
                    headers: {
                        ApiKey: data.auth.conn.apiKey
                    }
                }, function (error, response, body) {

                    if (response.statusCode === 200) {

                        var results = _.map(body.Lists, function (list) {

                            var r = {};

                            r.listId = list.ListID;
                            r.listName = list.Name;
                            r.fields = _.map(databaseColumns, function (column) {
                                var f = {};
                                f.id = column.ColumnName;
                                f.fieldName = column.ColumnName;
                                f.fieldType = column.ColumnType;
                                f.required = false;
                                return f;
                            });

                            return r;

                        });

                        return callback(null, results);

                    } else {

                        return callback(body);

                    }

                });

            } else {

                return callback(body);

            }

        });

    });

    /**
     * api handler - list.query
     */
    connector.use('list.query', function (data, callback) {

        console.log(' [x] Handling API - list.query : ', data);

        request({
            method: 'GET',
            uri: 'https://rest.emaildirect.com/v1/Lists',
            json: true,
            headers: {
                ApiKey: data.auth.conn.apiKey
            }
        }, function (error, response, body) {

            if (response.statusCode === 200) {

                var lists = body.Lists;

                console.log(' [x] Retrieved lists from Emaildirect : ', lists);

                // prepare returning data
                var results = _.map(lists, function (list) {
                    var r = {};

                    r.id = list.ListID;
                    r.listName = list.Name;

                    return r;
                });

                return callback(null, results);

            } else {

                return callback(body);

            }

        });

    });

    /**
     * api handler - subscriber.create
     */
    connector.use('subscriber.create', function (data, callback) {

        console.log(' [x] Handling API - subscriber.create : ', data);

        if (!data.params || !data.params.fields || !data.params.list || !data.params.list.id) {
            console.log(' [e] Emaildirect error occured : Invalid parameter');
            return callback('Invalid parameter');
        }

        // email
        var email = _.find(data.params.fields, {name: 'Email'});

        if (!email || !email.value) {
            console.log(' [e] Emaildirect error occured : Email is not provided!');
            return callback('Email is not provided');
        }

        // custom fields
        var customFields = [];
        _.forEach(data.params.fields, function (field) {
            if (field.name != 'Email') {
                var f = {
                    'FieldName': field.name,
                    'Value': field.value
                };
                customFields.push(f);
            }
        });

        // subscriber list
        var lists = [];
        lists.push(data.params.list.id);

        // publications
        var publications = [];
        publications.push(data.auth.meta.publication.id);

        request({
            method: 'POST',
            uri: 'https://rest.emaildirect.com/v1/Subscribers',
            json: true,
            headers: {
                ApiKey: data.auth.conn.apiKey
            },
            body: {
                'EmailAddress': email.value,
                'CustomFields': customFields,
                'Lists': lists,
                'Publications': publications
            }
        }, function (error, response, body) {

            if (response.statusCode === 201) {
                console.log(' [i] Emaildirect subscriber added : ', body);
                return callback(null, body);
            } else {
                console.log(' [e] Emaildirect error occured : ', body);
                return callback(body);
            }

        });

    });

    /**
     * api handler - field.create
     */
    connector.use('field.create', function (data, callback) {

        console.log(' [x] Email-direct Handling API - field.create : ', data);

        if (!data.auth || !data.auth.conn || !data.auth.conn.apiKey) {
            return callback('Invalid email-direct API key');
        }
        // parameter validation
        if (!data.params || !data.params.list || !data.params.name || !data.params.label || !data.params.type) {
            console.log(' [e] Email-direct error occured : Invalid parameter');
            return callback('Invalid parameter');
        }

        var name = data.params.name.replace(/_/g,'');

        if (name.length > 30) {
            console.log(' [e] Email-direct error occured : field name is too long. max - 30!');
            return callback('Field name is too long. The length should be less than equal to 30.');
        }

        if (name.match(/[^A-Za-z0-9]/)) {
            console.log(' [e] Email-direct error : field name must be A-Z 0-9');
            return callback('Field name must be letters in [A-Z a-z 0-9]');
        }

        var apiKey = data.auth.conn.apiKey;

        var list = data.params.list;

        var fieldType, size;
        switch (data.params.type) {
            case 'textarea':
                fieldType = 'text';
                size = 2000;
                break;
            case 'text':
                fieldType = 'text';
                size = 200;
            case 'number':
                fieldType = 'Int';
                break;
            default:
                fieldType = 'text';
        }

        // request body
        var reqBody = {
            'ColumnName': name,
            'ColumnType': fieldType
        };

        if(fieldType == 'text') {
            reqBody.ColumnSize = size;
        }

        // send post request to create new custom field
        request({
            method: 'POST',
            uri: 'https://rest.emaildirect.com/v1/Database',
            json: true,
            headers: {
                ApiKey: apiKey
            },
            body: reqBody
        }, function (error, response, body) {

            if (response.statusCode === 201) {
                console.log(' [i] Emaildirect subscriber added : ', body);

                var field = {
                    list: list,
                    id: body.ColumnName,
                    fieldName: body.ColumnName,
                    fieldType: body.ColumnType,
                    required: false
                };

                return callback(null, field);
            } else {
                console.log(' [e] Emaildirect error occured : ', body);
                return callback(body.Message);
            }

        });

    });

};
