
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
    getClassesByFlightId,
    getClassByClassId,
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

async function getClassesByFlightId(flightId) {
    let documentInfo = {};
    documentInfo.collectionName = "classes";
    documentInfo.filterInfo = {
        flightId: flightId
    };
    documentInfo.projectionInfo = {};

    return new Promise((resolve, reject) => {
        mongoRequests.findDocuments(documentInfo)
            .then(documentsInfo => {
                resolve(documentsInfo)
            })
            .catch(reject)
    });
}

async function getClassByClassId(classId) {
    let documentInfo = {};
    documentInfo.collectionName = "classes";
    documentInfo.filterInfo = {
        _id: ObjectID(classId)
    };
    documentInfo.projectionInfo = {};

    return new Promise((resolve, reject) => {
        mongoRequests.findDocument(documentInfo)
            .then(documentsInfo => {
                resolve(documentsInfo)
            })
            .catch(reject)
    });
}

module.exports = classHelper;