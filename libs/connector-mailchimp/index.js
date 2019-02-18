/**
 * Module dependencies.
 */
var Connector = require('../connector'),
    MailChimpAPI = require('mailchimp').MailChimpAPI,
    _ = require('lodash');

/**
 * Setup mailchimp api
 *
 * @param conn
 */
exports.setup = function (conn) {

    // create mailchimp-connector instance
    var connector = new Connector('mailchimp', conn);

    /**
     * api handler - field.query
     */
    connector.use('field.query', function (data, callback) {

        console.log(' [x] Handling API - field.query : ', data);

        // create instance of mailchimp api wrapper
        var mc;

        try {
            mc = new MailChimpAPI(data.auth.conn.apiKey, {version: '2.0'});
        } catch (err) {
            console.log(' [e] Mailchimp error occured : ' + err.message);
            return callback(err.message);
        }

        // read lists from mailchimp
        mc.call('lists', 'list', {}, function (err, lists) {
            if (err) {
                console.log(' [e] Mailchimp error occured : ' + err.message);
                return callback(err.message);
            }

            console.log(' [x] Retrieved lists from Mailchimp : ', lists);

            // read merge vars from mailchimp
            mc.call('lists', 'merge-vars', {id: _.pluck(lists.data, 'id')}, function (err, vars) {
                if (err) {
                    console.log(' [e] Mailchimp error occured : ' + err.message);
                    return callback(err.message);
                }

                console.log(' [x] Retrieved merge-vars from Mailchimp : ', vars);

                // compose returning results
                var results = _.map(vars.data, function (data) {
                    var r = {};

                    r.listId = data.id;
                    r.listName = data.name;
                    r.fields = _.map(data.merge_vars, function (mergeVar) {
                        var f = {};
                        f.id = mergeVar.id;
                        f.fieldName = mergeVar.tag;
                        f.fieldType = mergeVar.field_type;
                        f.required = mergeVar.req;
                        return f;
                    });

                    return r;
                });

                return callback(null, results);
            });

        });

    });

    /**
     * api handler - list.query
     */
    connector.use('list.query', function (data, callback) {

        console.log(' [x] Handling API - list.query : ', data);

        // create instance of mailchimp api wrapper
        var mc;

        try {
            mc = new MailChimpAPI(data.auth.conn.apiKey, {version: '2.0'});
        } catch (err) {
            console.log(' [e] Mailchimp error occured : ' + err.message);
            return callback(err.message);
        }

        // read lists from mailchimp
        mc.call('lists', 'list', {}, function (err, lists) {
            if (err) {
                console.log(' [e] Mailchimp error occured : ' + err.message);
                return callback(err.message);
            }

            console.log(' [x] Retrieved lists from Mailchimp : ', lists);

            // prepare returning data

            var results = _.map(lists.data, function (list) {
                var r = {};

                r.id = list.id;
                r.listName = list.name;

                return r;
            });

            return callback(null, results);

        });

    });

    /**
     * api handler - subscriber.create
     */
    connector.use('subscriber.create', function (data, callback) {

        console.log(' [x] Handling API - subscriber.create : ', data);

        if (!data.params || !data.params.fields || !data.params.list || !data.params.list.id) {
            console.log(' [e] Mailchimp error occured : Invalid parameter');
            return callback('Invalid parameter');
        }

        // create instance of mailchimp api wrapper
        var mc;

        try {
            mc = new MailChimpAPI(data.auth.conn.apiKey, {version: '2.0'});
        } catch (err) {
            console.log(' [e] Mailchimp error occured : ' + err.message);
            return callback(err.message);
        }

        var email = _.find(data.params.fields, {name: 'EMAIL'});

        if (!email || !email.value) {
            console.log(' [e] Mailchimp error occured : Email is not provided!');
            return callback('Email is not provided');
        }

        var merge_vars = {};
        _.forEach(data.params.fields, function (field) {
            if (field.name != 'EMAIL') {
                merge_vars[field.name] = field.value;
            }
        });

        // create a new subscriber
        mc.call('lists', 'subscribe', {
            id: data.params.list.id,
            email: {
                email: email.value
            },
            merge_vars: merge_vars
        }, function (err, subscriber) {
            if (err) {
                console.log(' [e] Mailchimp error occured : ' + err.message);
                return callback(err.message);
            }

            console.log(' [x] Creating subscriber result : ', subscriber);

            return callback(null, subscriber);

        });

    });

    /**
     * api handler - field.create
     */
    connector.use('field.create', function (data, callback) {

        console.log(' [x] Handling API - field.create : ', data);

        // parameter validation
        if (!data.params || !data.params.list || !data.params.name || !data.params.label || !data.params.type) {
            console.log(' [e] Mailchimp error occured : Invalid parameter');
            return callback('Invalid parameter');
        }

        if (data.params.name.length > 10) {
            console.log(' [e] Mailchimp error occured : field name is too long. max - 10 bytes!');
            return callback('Field name is too long. The length should be less than equal to 10.');
        }

        if (data.params.name.match(/[^A-Za-z0-9_]/)) {
            console.log(' [e] Mailchimp error : field name must be A-Z 0-9 _');
            return callback('Field name must be letters in [A-Z a-z 0-9 _]');
        }

        var list = data.params.list,
            tag = data.params.name.toUpperCase(),
            name = data.params.label,
            required = data.params.required || false;

        var fieldType;
        switch (data.params.type) {
            case 'textarea', 'text':
                fieldType = 'text';
                break;
            case 'number':
                fieldType = 'number';
                break;
            default:
                fieldType = 'text';
        }

        // create instance of mailchimp api wrapper
        var mc;

        try {
            mc = new MailChimpAPI(data.auth.conn.apiKey, {version: '2.0'});
        } catch (err) {
            console.log(' [e] Mailchimp error occured : ' + err.message);
            return callback(err.message);
        }

        // create a new field
        mc.call('lists', 'merge-var-add', {
            id: list.listId,
            tag: tag,
            name: name,
            options: {
                field_type: fieldType,
                req: required
            }
        }, function (err, mergeVar) {
            if (err) {
                console.log(' [e] Mailchimp error occured : ' + err.message);
                return callback(err.message);
            }

            console.log(' [x] Mailchimp created new field : ', mergeVar);

            var field = {
                list: list,
                id: mergeVar.id,
                fieldName: mergeVar.tag,
                fieldType: mergeVar.field_type,
                required: mergeVar.req
            };

            return callback(null, field);

        });

    });

};
