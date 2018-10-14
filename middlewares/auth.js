
/**
 * Module dependencies
 */

const platformConfigs= require("../config/config");
const mongoRequests  = require("../dbQueries/mongoRequests");
// const helperFunction = require("../modules/helpers");
const tokenFunction  = require("../modules/token");
const errTexts       = require("../texts/texts");
const async          = require("async");
// const moment         = require("moment");
const winston        = require("winston");


const auth = {

    /**
     * Check Token
     * @param {Object} req
     * @param {Object} res
     * @param {Function} next
     */
    isAuth : (req, res, next) => {
        if (!req.headers.authorization) {
            next({
                code: 401,
                status : "error",
                message : errTexts.unauthorized
            });
            return;
        }

        const decode = tokenFunction.decodeToken(req.headers.authorization);

        async.series([
            callback => {
                auth.mongoAuth(decode.bearer, (err, result) => {
                    err ? callback(err, null) : callback(null, result);
                });
            }
        ], (err, result) => {
            req.userInfo = result[0];

            if (err) return next(err);
            async.parallel([
                () => next()
            ]);
        });
    },

    /**
     * Check Token In MongoDB
     * @param {String} token
     * @param {Function} next
     */
    mongoAuth : (token, next) => {
        mongoRequests.findToken(token, (err, result) => next(err, result));
    }

};

module.exports = auth;