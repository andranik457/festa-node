
/**
 * Modoule Dependencies
 */
const _             = require("underscore");
const winston       = require("winston");
const mongoRequests = require("../dbQueries/mongoRequests");
const successTexts  = require("../texts/successTexts");
const errorTexts    = require("../texts/errorTexts");
const ObjectID      = require('mongodb').ObjectID;

const classHelper = {
    asyncUsePlaces,
    asyncRemoveOnHoldPlaces
};

/**
 *
 * @param classId
 * @param placesCount
 * @returns {Promise<any>}
 */
async function asyncUsePlaces(classId, placesCount) {
    let documentInfo = {};
    documentInfo.collectionName = "classes";
    documentInfo.filterInfo = {_id: ObjectID(classId)};
    documentInfo.updateInfo = {
        $inc: {
            availableSeats: -placesCount,
        }
    };

    return new Promise((resolve, reject) => {
        mongoRequests.updateDocument(documentInfo)
            .then(docInfo => {
                // if (1 === docInfo.ok) {
                    resolve({
                        success: 1
                    })
                // }
                // reject(errorTexts.forEnyCase)
            })
            .catch(err => {
                winston.log('error', err);
                reject(errorTexts.forEnyCase)
            })
    });
}

async function asyncRemoveOnHoldPlaces(pnr) {
    let documentInfo = {};
    documentInfo.collectionName = "onHold";
    documentInfo.filterInfo = {pnr: pnr};

    return new Promise((resolve, reject) => {
        mongoRequests.removeDocument(documentInfo)
            .then(docInfo => {
                // if ((1 === docInfo.result.ok) && (0 < docInfo.result.n)){
                    resolve({
                        success: 1
                    })
                // }
                // reject(errorTexts.forEnyCase)
            })
            .catch(err => {
                winston.log('error', err);
                reject(errorTexts.forEnyCase)
            })
    });
}

module.exports = classHelper;