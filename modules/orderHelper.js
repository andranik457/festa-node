
/**
 * Modoule Dependencies
 */
const _             = require("underscore");
const winston       = require("winston");
const mongoRequests = require("../dbQueries/mongoRequests");
const successTexts  = require("../texts/successTexts");
const errorTexts    = require("../texts/errorTexts");
const ObjectID      = require('mongodb').ObjectID;

const orderHelper = {
    getOrdersByFlightId,
    getPreOrdersByFlightId,
    getOrdersByClassId,
    getPreOrdersByClassId,
    removePreOrdersByPnr
};

async function getOrdersByFlightId(flightId) {
    let documentInfo = {};
    documentInfo.collectionName = "orders";
    documentInfo.filterInfo = {
        "$or": [
            {"travelInfo.departureFlightInfo._id": ObjectID(flightId)},
            {"travelInfo.returnFlightInfo._id": ObjectID(flightId)},
        ]
    };
    documentInfo.projectionInfo = {};

    return new Promise((resolve, reject) => {
        mongoRequests.countDocuments(documentInfo)
            .then(documentsCount => {
                resolve(documentsCount)
            })
            .catch(reject)
    });
}

async function getPreOrdersByFlightId(flightId) {
    let documentInfo = {};
    documentInfo.collectionName = "preOrders";
    documentInfo.filterInfo = {
        "$or": [
            {"departureFlightInfo._id": ObjectID(flightId)},
            {"returnFlightInfo._id": ObjectID(flightId)},
        ]
    };
    documentInfo.projectionInfo = {};

    return new Promise((resolve, reject) => {
        mongoRequests.countDocuments(documentInfo)
            .then(documentsCount => {
                resolve(documentsCount)
            })
            .catch(reject)
    });
}

async function getOrdersByClassId(classId) {
    let documentInfo = {};
    documentInfo.collectionName = "orders";
    documentInfo.filterInfo = {
        "$or": [
            {"travelInfo.departureClassInfo._id": ObjectID(classId)},
            {"travelInfo.returnClassInfo._id": ObjectID(classId)},
        ]
    };

    return new Promise((resolve, reject) => {
        mongoRequests.countDocuments(documentInfo)
            .then(documentsCount => {
                resolve(documentsCount)
            })
            .catch(reject)
    });
}

async function getPreOrdersByClassId(classId) {
    let documentInfo = {};
    documentInfo.collectionName = "preOrders";
    documentInfo.filterInfo = {
        "$or": [
            {"departureClassInfo._id": ObjectID(classId)},
            {"returnClassInfo._id": ObjectID(classId)},
        ]
    };
    documentInfo.projectionInfo = {};

    return new Promise((resolve, reject) => {
        mongoRequests.countDocuments(documentInfo)
            .then(documentsCount => {
                resolve(documentsCount)
            })
            .catch(reject)
    });
}

async function removePreOrdersByPnr(pnr) {
    let documentInfo = {};
    documentInfo.collectionName = "preOrders";
    documentInfo.filterInfo = {pnr: pnr};

    return new Promise((resolve, reject) => {
        mongoRequests.removeDocument(documentInfo)
            .then(docInfo => {
                resolve({
                    success: 1
                })
            })
            .catch(err => {
                winston.log('error', err);
                reject(errorTexts.forEnyCase)
            })
    });
}

module.exports = orderHelper;