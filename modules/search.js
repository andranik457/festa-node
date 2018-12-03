
/**
 * Modoule Dependencies
 */

const _             = require("underscore");
const winston       = require("winston");
const ObjectID      = require('mongodb').ObjectID;
const mongoRequests = require("../dbQueries/mongoRequests");
const Helper        = require("../modules/helper");
const FlightHelper  = require("../modules/flightHelper");
const successTexts  = require("../texts/successTexts");
const errorTexts    = require("../texts/errorTexts");

const searchInfo = {

    search: req => {

        const possibleFields = {
            from: {
                name: "FROM (City & Airport)",
                type: "text",
                format: "latin",
                minLength: 3,
                maxLength: 64,
            },
            to: {
                name: "TO (City & Airport)",
                type: "text",
                format: "latin",
                minLength: 3,
                maxLength: 64,
            },
            startDate: {
                name: "Start Date (Local time)",
                type: "date",
                minLength: 3,
                maxLength: 64,
            },
            startDateTimeZone: {
                name: "Start Date TimeZone (Local time)",
                type: "timeZone",
                minLength: 3,
                maxLength: 64,
            },
            endDate: {
                name: "End Date (Local time)",
                type: "date",
                minLength: 3,
                maxLength: 64,
            },
            endDateTimeZone: {
                name: "End Date TimeZone (Local time)",
                type: "timeZone",
                minLength: 3,
                maxLength: 64,
            },
            tripType: {
                name: "Trip Type",
                type: "text",
                format: "latin",
                minLength: 3,
                maxLength: 64,
            },
            passengerType: {
                name: "Passenger Type",
                type: "text",
                format: "latin",
                minLength: 3,
                maxLength: 64,
            }
        };

        let data = {
            body: req.body,
            userInfo: req.userInfo,
            possibleForm: possibleFields,
            editableFields: possibleFields,
            editableFieldsValues: req.body
        };

        return new Promise((resolve, reject) => {
            return new Promise((resolve, reject) => {
                Helper.getEditableFields(data)
                    .then(Helper.getEditableFieldsValues)
                    .then(Helper.validateData)
                    .then(resolve)
                    .catch(reject)
            })
                .then(createSearchFilter)
                .then(data => {
                    resolve({
                        code: 200,
                        status: "Success",
                        message: "Search info successfully goten!",
                        data: data.result
                    })
                })
                .catch(reject)
        });
    }

};

module.exports = searchInfo;

function createSearchFilter(data) {
    let filter = {status: "upcoming"};

    if (!_.isEmpty(data.editableFieldsValues)) {
        filter = {
            "$and": [
                {status: "upcoming"}
            ]
        };

        _.each(data.editableFieldsValues, (value, key) => {
            filter["$and"].push({
                [key]: value
            });
        });
    }

    let documentInfo = {};
    documentInfo.collectionName = "flights";
    documentInfo.filterInfo = filter;
    documentInfo.optionInfo = {sort: {createdAt: -1}};
    documentInfo.projectionInfo = {
        from: 1,
        to: 1,
        startDate: 1,
        endDate: 1,
        startDateTimeZone: 1,
        endDateTimeZone: 1,
        flightNumber: 1,
        airline: 1,
        numberOfSeats: 1,
        currency: 1,
        duration: 1,
        createdAt: 1,
        updatedAt: 1,
        deletedAt: 1
    };

    return new Promise((resolve, reject) => {
        mongoRequests.findDocuments(documentInfo)
            .then(docInfo => {
                data.result = docInfo;

                resolve(data)
            })
            .catch(reject)
    });
}