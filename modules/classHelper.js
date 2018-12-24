
/**
 * Modoule Dependencies
 */
const _             = require("underscore");
const winston       = require("winston");
const mongoRequests = require("../dbQueries/mongoRequests");
const flightHelper  = require("../modules/flightHelper");
const successTexts  = require("../texts/successTexts");
const errorTexts    = require("../texts/errorTexts");
const ObjectID      = require('mongodb').ObjectID;

const classHelper = {
    asyncUsePlaces,
    getClassesByFlightId,
    getClassByClassId,
    asyncRemoveOnHoldPlaces,
    checkIsPossibleSeatsCount
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

async function getClassOnHoldSeatsCountByClassId(classId) {
    let documentInfo = {};
    documentInfo.collectionName = "onHold";
    documentInfo.filterInfo = {
        classId: classId
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

async function checkIsPossibleSeatsCount(checkedClassId, newSeatsCount) {
    newSeatsCount = parseInt(newSeatsCount);

    // get flightId by classId
    let flightInfo = await flightHelper.getFlightByClassId(checkedClassId);
    if (flightInfo.numberOfSeats < newSeatsCount) {
        return Promise.reject({
            code: 400,
            status: "error",
            message: "Class seats count can't be greater than flight seats"
        })
    }

    // get selected class used seats count
    let checkedClassInfo = await getClassByClassId(checkedClassId);
    let seatsInOrders = checkedClassInfo.numberOfSeats - checkedClassInfo.availableSeats;

    // get onHold seats count for this class
    let checkedClassOnHoldSeats = await getClassOnHoldSeatsCountByClassId(checkedClassId);
    let onHoldSeats = 0;
    for (let i in checkedClassOnHoldSeats) {
        onHoldSeats += checkedClassOnHoldSeats[i].count;
    }

    if ((onHoldSeats + seatsInOrders) > newSeatsCount) {
        return Promise.reject({
            code: 400,
            status: "error",
            message: "Class seats count can't be less than used seats (in orders: "+ seatsInOrders +" in onHold: "+ onHoldSeats +")"
        })
    }

    // check other classes seats count in this flight
    let classesSeats = 0;
    let classes = await getClassesByFlightId(checkedClassInfo.flightId);
    for (let j in classes) {
        if (checkedClassId !== classes[j]._id.toString()) {
            classesSeats += classes[j].numberOfSeats
        }
    }

    if ((classesSeats + newSeatsCount) > flightInfo.numberOfSeats) {
        return Promise.reject({
            code: 400,
            status: "error",
            message: "Classes total seats count can't be greater than flight seats"
        })
    }

    return {
        userSeatsInOrders: seatsInOrders
    }
}

module.exports = classHelper;