
/**
 * Modoule Dependencies
 */
const _             = require("underscore");
const winston       = require("winston");
const mongoRequests = require("../dbQueries/mongoRequests");
const successTexts  = require("../texts/successTexts");
const errorTexts    = require("../texts/errorTexts");
const ObjectID      = require('mongodb').ObjectID;

const userHelper = {
    asyncGetUserInfoById
};

/**
 *
 * @param userId
 * @returns {Promise<any>}
 */
async function asyncGetUserInfoById(userId) {
    let documentInfo = {};
    documentInfo.collectionName = "users";
    documentInfo.filterInfo = {userId: userId.toString()};
    documentInfo.projectionInfo = {};

    return new Promise((resolve, reject) => {
        mongoRequests.findDocument(documentInfo)
            .then(docInfo => {
                resolve(docInfo)
            })
            .catch(err => {
                winston('error', err);
                reject(errorTexts.forEnyCase)
            })
    });
}

module.exports = userHelper;