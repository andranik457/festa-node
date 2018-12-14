
/**
 * Modoule Dependencies
 */
const _             = require("underscore");
const mongoRequests = require("../dbQueries/mongoRequests");
const successTexts  = require("../texts/successTexts");
const errorTexts    = require("../texts/errorTexts");
const ObjectID      = require('mongodb').ObjectID;

const flightHelper = {
    getFlight,
    getFlightAvailableSeats
};

/**
 *
 * @param data
 * @returns {Promise<any>}
 */
function getFlight(data) {
    let documentInfo = {};
    documentInfo.collectionName = "flights";
    documentInfo.filterInfo = {_id: ObjectID(data.flightId)};
    documentInfo.projectionInfo = {};

    return new Promise((resolve, reject) => {
        mongoRequests.findDocument(documentInfo)
            .then(docInfo => {
                if (null === docInfo) {
                    reject(errorTexts.incorrectFlightId)
                }
                else {
                    data.flightInfo = docInfo;
                    resolve(data)
                }
            })
            .catch(reject)
    });
}

function getFlightAvailableSeats(data) {
    let documentInfo = {};
    documentInfo.collectionName = "classes";
    documentInfo.filterInfo = {flightId: data.flightId};

    return new Promise((resolve, reject) => {
        mongoRequests.findDocuments(documentInfo)
            .then(classesInfo => {
                let classMainInfo = {};
                classMainInfo.class = [];
                classMainInfo.totalSeats = 0;

                _.each(classesInfo, classInfo => {
                    classMainInfo.class.push({
                        name: classInfo.className,
                        seats: classInfo.numberOfSeats
                    });

                    classMainInfo.totalSeats += classInfo.numberOfSeats;
                });

                data.existedClassesInfo = classMainInfo;

                resolve(data)
            })
            .catch(reject)
    });
}

module.exports = flightHelper;