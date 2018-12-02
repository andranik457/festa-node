
/**
 * Modoule Dependencies
 */

const _             = require("underscore");
const winston       = require("winston");
const mongoRequests = require("../dbQueries/mongoRequests");
const Helper        = require("../modules/helper");
const successTexts  = require("../texts/successTexts");
const errorTexts    = require("../texts/errorTexts");
const ObjectID      = require('mongodb').ObjectID;

const flight = {

    /**
     *
     * @param req
     * @returns {Promise<any>}
     */
    create: req => {
        const editableFields = {
            from: {
                name: "FROM (City & Airport)",
                type: "text",
                format: "latin",
                minLength: 3,
                maxLength: 64,
                required: true
            },
            to: {
                name: "TO (City & Airport)",
                type: "text",
                format: "latin",
                minLength: 3,
                maxLength: 64,
                required: true
            },
            startDate: {
                name: "Start Date (Local time)",
                type: "date",
                minLength: 3,
                maxLength: 64,
                required: true
            },
            startDateTimeZone: {
                name: "Start Date TimeZone (Local time)",
                type: "timeZone",
                minLength: 3,
                maxLength: 64,
                required: true
            },
            endDate: {
                name: "End Date (Local time)",
                type: "date",
                minLength: 3,
                maxLength: 64,
                required: true
            },
            endDateTimeZone: {
                name: "End Date TimeZone (Local time)",
                type: "timeZone",
                minLength: 3,
                maxLength: 64,
                required: true
            },
            flightNumber: {
                name: "Flight Number",
                type: "number",
                minLength: 3,
                maxLength: 64,
                required: true
            },
            airline: {
                name: "Airline",
                type: "text",
                format: "latin",
                minLength: 3,
                length: 64,
                required: true
            },
            numberOfSeats: {
                name: "Number of seats",
                type: "number",
                minLength: 3,
                length: 64,
                required: true
            },
            currency: {
                name: "Currency",
                type: "text",
                minLength: 3,
                length: 64,
                required: true
            }
        };

        let data = {
            body: req.body,
            userInfo: req.userInfo,
            editableFields: editableFields,
            editableFieldsValues: req.body
        };


        return new Promise((resolve, reject) => {
            if ("Admin" !== data.userInfo.role) {
                reject(errorTexts.userRole)
            }

            Helper.validateData(data)
                .then(Helper.calculateFlightDuration)
                .then(saveFlight)
                .then(data => {
                    resolve(successTexts.flightCreated)
                })
                .catch(reject)
        });
    },

    /**
     *
     * @param req
     * @returns {Promise<any>}
     */
    edit: req => {
        const possibleForm = {
            from: {
                name: "FROM (City & Airport)",
                type: "text",
                format: "latin",
                minLength: 3,
                maxLength: 64,
                required: true
            },
            to: {
                name: "TO (City & Airport)",
                type: "text",
                format: "latin",
                minLength: 3,
                maxLength: 64,
                required: true
            },
            startDate: {
                name: "Start Date (Local time)",
                type: "date",
                minLength: 3,
                maxLength: 64,
                required: true
            },
            startDateTimeZone: {
                name: "Start Date TimeZone (Local time)",
                type: "timeZone",
                minLength: 3,
                maxLength: 64,
                required: true
            },
            endDate: {
                name: "End Date (Local time)",
                type: "date",
                minLength: 3,
                maxLength: 64,
                required: true
            },
            endDateTimeZone: {
                name: "End Date TimeZone (Local time)",
                type: "timeZone",
                minLength: 3,
                maxLength: 64,
                required: true
            },
            flightNumber: {
                name: "Flight Number",
                type: "number",
                minLength: 3,
                maxLength: 64,
                required: true
            },
            airline: {
                name: "Airline",
                type: "text",
                format: "latin",
                minLength: 3,
                length: 64,
                required: true
            },
            numberOfSeats: {
                name: "Number of seats",
                type: "number",
                minLength: 3,
                length: 64,
                required: true
            },
            currency: {
                name: "Currency",
                type: "text",
                minLength: 3,
                length: 64,
                required: true
            }
        };

        let data = {
            body: req.body,
            userInfo: req.userInfo,
            flightId: req.params.flightId.toString(),
            possibleForm: possibleForm
        };

        return new Promise((resolve, reject) => {
            if ("Admin" !== data.userInfo.role) {
                reject(errorTexts.userRole)
            }

            if (!ObjectID.isValid(data.flightId)) {
                reject(errorTexts.mongId)
            }

            return new Promise((resolve, reject) => {
                Helper.getEditableFields(data)
                    .then(Helper.getEditableFieldsValues)
                    .then(Helper.validateData)
                    .then(resolve)
                    .catch(reject)
            })
                .then(updateFlight)
                .then(data => {
                    resolve(successTexts.flightUpdated)
                })
                .catch(reject)
        })
    },

    /**
     *
     * @param req
     * @returns {Promise<any>}
     */
    delete: req => {
        let data = {
            userInfo: req.userInfo,
            flightId: req.params.flightId.toString(),
        };

        return new Promise((resolve, reject) => {
            if ("Admin" !== data.userInfo.role) {
                reject(errorTexts.userRole)
            }

            if (!ObjectID.isValid(data.flightId)) {
                reject(errorTexts.mongId)
            }

            removeFlight(data)
                .then(data => {
                    resolve(successTexts.flightDeleted)
                })
                .catch(reject)
        })
    },

    /**
     *
     * @param req
     * @returns {Promise<any>}
     */
    getFlights: req => {
        let data = {
            userInfo: req.userInfo,
            body: req.body
        };

        return new Promise((resolve, reject) => {
            if ("Admin" !== data.userInfo.role) {
                reject(errorTexts.userRole)
            }

            getFlights(data)
                .then(data => {
                    resolve({
                        code: 200,
                        status: "Success",
                        message: "Flights info successfully goten!",
                        data: data.result
                    })
                })
                .catch(reject)
        })
    },

    /**
     *
     * @param req
     * @returns {Promise<any>}
     */
    getFlight: req => {
        let data = {
            userInfo: req.userInfo,
            flightId: req.params.flightId.toString()
        };

        return new Promise((resolve, reject) => {
            if ("Admin" !== data.userInfo.role) {
                reject(errorTexts.userRole)
            }

            if (!ObjectID.isValid(data.flightId)) {
                reject(errorTexts.mongId)
            }

            getFlight(data)
                .then(data => {
                    resolve({
                        code: 200,
                        status: "Success",
                        message: "Flight info successfully goten!",
                        data: data.result
                    })
                })
                .catch(reject)
        })
    }

};

module.exports = flight;

/**
 *
 * @param data
 * @returns {Promise<any>}
 */
function saveFlight(data) {
    let currentTime = Math.floor(Date.now() / 1000);

    let flightInfo = {
        from:               data.body.from,
        to:                 data.body.to,
        startDate:          data.body.startDate,
        startDateTimeZone:  data.body.startDateTimeZone,
        endDate:            data.body.endDate,
        endDateTimeZone:    data.body.endDateTimeZone,
        flightNumber:       data.body.flightNumber,
        airline:            data.body.airline,
        numberOfSeats:      Number(data.body.numberOfSeats),
        currency:           data.body.currency,
        duration:           data.body.duration,
        status:             "upcoming",
        updatedAt:          currentTime,
        createdAt:          currentTime
    };

    data.flightDocumetInfo = flightInfo;

    let documentInfo = {};
    documentInfo.collectionName = "flights";
    documentInfo.documentInfo = flightInfo;

    return new Promise((resolve, reject) => {
        mongoRequests.insertDocument(documentInfo)
            .then(insertRes => {
                insertRes.insertedCount === 1
                    ? resolve(data)
                    : reject(errTexts.cantSaveDocumentToMongo)
            })
    });

}

/**
 *
 * @param data
 * @returns {Promise<any>}
 */
function updateFlight(data) {
    let currentTime = Math.floor(Date.now() / 1000);

    let updateInfo = data.editableFieldsValues;
    updateInfo.updatedAt = currentTime;

    let documentInfo = {};
    documentInfo.collectionName = "flights";
    documentInfo.filterInfo = {_id: ObjectID(data.flightId)};
    documentInfo.updateInfo = {'$set': updateInfo};

    return new Promise((resolve, reject) => {
        mongoRequests.updateDocument(documentInfo)
            .then(updateRes => {
                updateRes.ok === 1
                    ? resolve(data)
                    : reject(errorTexts.cantUpdateMongoDocument)
            })
    });
}

/**
 *
 * @param data
 * @returns {Promise<any>}
 */
function removeFlight(data) {
    let currentTime = Math.floor(Date.now() / 1000);

    let updateInfo = {
        status: "deleted",
        updatedAt: currentTime,
        deletedAt: currentTime
    };

    let documentInfo = {};
    documentInfo.collectionName = "flights";
    documentInfo.filterInfo = {_id: ObjectID(data.flightId)};
    documentInfo.updateInfo = {'$set': updateInfo};

    return new Promise((resolve, reject) => {
        mongoRequests.updateDocument(documentInfo)
            .then(updateRes => {
                updateRes.ok === 1
                    ? resolve(data)
                    : reject(errTexts.cantUpdateMongoDocument)
            })
    });
}

/**
 *
 * @param data
 * @returns {Promise<any>}
 */
function getFlights(data) {
    let documentInfo = {};
    documentInfo.collectionName = "flights";
    documentInfo.filterInfo = {status: data.body.status || {$exists: true}};
    documentInfo.optionInfo = {sort: {createdAt: -1}};
    documentInfo.projectionInfo = {
        from: 1,
        to: 1,
        startDate: 1,
        endDate: 1,
        flightNumber: 1,
        airline: 1,
        numberOfSeats: 1,
        currency: 1,
        duration: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1,
        deletedAt: 1
    };

    return new Promise((resolve, reject) => {
        mongoRequests.findDocuments(documentInfo)
            .then(docInfo => {
                console.log(docInfo);
                data.result = docInfo;

                resolve(data)
            })
            .catch(reject)
    });
}

/**
 *
 * @param data
 * @returns {Promise<any>}
 */
function getFlight(data) {
    let documentInfo = {};
    documentInfo.collectionName = "flights";
    documentInfo.filterInfo = {_id: ObjectID(data.flightId)};
    documentInfo.projectionInfo = {
        _id: 0,
        from: 1,
        to: 1,
        startDate: 1,
        endDate: 1,
        flightNumber: 1,
        airline: 1,
        numberOfSeats: 1,
        currency: 1,
        duration: 1,
        createdAt: 1
    };

    return new Promise((resolve, reject) => {
        mongoRequests.findDocument(documentInfo)
            .then(docInfo => {
                data.result = docInfo

                resolve(data)
            })
            .catch(reject)
    });
}