'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

/**
 * Authenticator Schema
 */
var AuthenticationSchema = new Schema({
    conn: {},
    meta: {},
    created: {
        type: Date,
        default: Date.now
    },
    app: {
        type: String
    }
});

module.exports = mongoose.model('Authentication', AuthenticationSchema);
