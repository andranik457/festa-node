
/**
 * Modoule Dependencies
 */

const _             = require("underscore");
const winston       = require("winston");
const mongoRequests = require("../dbQueries/mongoRequests");
const Helper        = require("../modules/helper");
const FlightHelper  = require("../modules/flightHelper");
const successTexts  = require("../texts/successTexts");
const errorTexts    = require("../texts/errorTexts");
const ObjectID      = require('mongodb').ObjectID;

const classInfo = {

    /**
     *
     * @param req
     * @returns {Promise<any>}
     */
    create: req => {

        const possibleFields = {
            className: {
                name: "Class Name",
                type: "text",
                format: "latin",
                minLength: 2,
                maxLength: 3,
                required: true
            },
            classType: {
                name: "classType",
                type: "text",
                format: "latin",
                minLength: 3,
                maxLength: 64,
                required: true
            },
            numberOfSeats: {
                name: "Number Of Seats",
                type: "number",
                minLength: 1,
                maxLength: 4,
                required: true
            },
            fareRules: {
                name: "Fare Rules",
                type: "number",
                minLength: 1,
                maxLength: 5,
                required: true
            },
            fareAdult: {
                name: "Fare ADULT",
                type: "number",
                minLength: 1,
                maxLength: 5,
                required: true
            },
            fareChd: {
                name: "Fare CHD",
                type: "number",
                minLength: 1,
                maxLength: 5,
                required: true
            },
            fareInf: {
                name: "Fare INF",
                type: "number",
                minLength: 1,
                maxLength: 5,
                required: true
            },
            taxXAdult: {
                name: "Tax X ADULT",
                type: "number",
                minLength: 1,
                maxLength: 5,
                required: true
            },
            taxYAdult: {
                name: "Tax Y ADULT",
                type: "number",
                minLength: 1,
                maxLength: 5,
                required: true
            },
            taxXChd: {
                name: "Tax X CHD",
                type: "number",
                minLength: 1,
                maxLength: 5,
                required: true
            },
            taxYChd: {
                name: "Tax Y CHD",
                type: "number",
                minLength: 1,
                maxLength: 5,
                required: true
            },
            cat: {
                name: "CAT",
                type: "number",
                minLength: 1,
                maxLength: 5,
                required: true
            },
            surchargeMultiDestination: {
                name: "Surcharge MULTIDEST",
                type: "number",
                minLength: 1,
                maxLength: 5,
                required: true
            },
            surchargeLongRange: {
                name: "Surcharge LONG RANGE",
                type: "number",
                minLength: 1,
                maxLength: 5,
                required: true
            },
            surchargeShortRange: {
                name: "Surcharge SHORT RANGE",
                type: "number",
                minLength: 1,
                maxLength: 5,
                required: true
            },
            commAdult: {
                name: "Comm ADULT",
                type: "number",
                minLength: 1,
                maxLength: 5,
                required: true
            },
            commChd: {
                name: "Comm CHD",
                type: "number",
                minLength: 1,
                maxLength: 5,
                required: true
            }
        };

        let data = {
            body: req.body,
            userInfo: req.userInfo,
            editableFields: possibleFields,
            editableFieldsValues: req.body,
            flightId: req.params.flightId.toString(),
        };

        return new Promise((resolve, reject) => {
            if ("Admin" !== data.userInfo.role) {
                reject(errorTexts.userRole)
            }

            if (!ObjectID.isValid(data.flightId)) {
                reject(errorTexts.mongId)
            }

            Helper.validateData(data)
                .then(FlightHelper.getFlight)
                .then(FlightHelper.getFlightAvailableSeats)
                .then(validateNumberOfSeats)
                .then(checkClassName)
                .then(saveClass)
                .then(data => {
                    resolve({
                        code: 200,
                        status: "success",
                        message: "Class successfully created"
                    })
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

        const possibleFields = {
            className: {
                name: "Class Name",
                type: "text",
                format: "latin",
                minLength: 2,
                maxLength: 3,
                required: true
            },
            classType: {
                name: "classType",
                type: "text",
                format: "latin",
                minLength: 3,
                maxLength: 64,
                required: true
            },
            numberOfSeats: {
                name: "Number Of Seats",
                type: "number",
                minLength: 1,
                maxLength: 4,
                required: true
            },
            fareRules: {
                name: "Fare Rules",
                type: "number",
                minLength: 1,
                maxLength: 5,
                required: true
            },
            fareAdult: {
                name: "Fare ADULT",
                type: "number",
                minLength: 1,
                maxLength: 5,
                required: true
            },
            fareChd: {
                name: "Fare CHD",
                type: "number",
                minLength: 1,
                maxLength: 5,
                required: true
            },
            fareInf: {
                name: "Fare INF",
                type: "number",
                minLength: 1,
                maxLength: 5,
                required: true
            },
            taxXAdult: {
                name: "Tax X ADULT",
                type: "number",
                minLength: 1,
                maxLength: 5,
                required: true
            },
            taxYAdult: {
                name: "Tax Y ADULT",
                type: "number",
                minLength: 1,
                maxLength: 5,
                required: true
            },
            taxXChd: {
                name: "Tax X CHD",
                type: "number",
                minLength: 1,
                maxLength: 5,
                required: true
            },
            taxYChd: {
                name: "Tax Y CHD",
                type: "number",
                minLength: 1,
                maxLength: 5,
                required: true
            },
            cat: {
                name: "CAT",
                type: "number",
                minLength: 1,
                maxLength: 5,
                required: true
            },
            surchargeMultiDestination: {
                name: "Surcharge MULTIDEST",
                type: "number",
                minLength: 1,
                maxLength: 5,
                required: true
            },
            surchargeLongRange: {
                name: "Surcharge LONG RANGE",
                type: "number",
                minLength: 1,
                maxLength: 5,
                required: true
            },
            surchargeShortRange: {
                name: "Surcharge SHORT RANGE",
                type: "number",
                minLength: 1,
                maxLength: 5,
                required: true
            },
            commAdult: {
                name: "Comm ADULT",
                type: "number",
                minLength: 1,
                maxLength: 5,
                required: true
            },
            commChd: {
                name: "Comm CHD",
                type: "number",
                minLength: 1,
                maxLength: 5,
                required: true
            }
        };

        let data = {
            body: req.body,
            userInfo: req.userInfo,
            possibleForm: possibleFields,
            editableFields: possibleFields,
            editableFieldsValues: req.body,
            classId: req.params.classId.toString(),
        };

        return new Promise((resolve, reject) => {
            if ("Admin" !== data.userInfo.role) {
                reject(errorTexts.userRole)
            }

            if (!ObjectID.isValid(data.classId)) {
                reject(errorTexts.mongId)
            }

            return new Promise((resolve, reject) => {
                Helper.getEditableFields(data)
                    .then(Helper.getEditableFieldsValues)
                    .then(Helper.validateData)
                    .then(resolve)
                    .catch(reject)
            })
                .then(updateClass)
                .then(data => {
                    resolve(successTexts.classUpdated)
                })
                .catch(reject)
        });

    },

    /**
     *
     * @param req
     * @returns {Promise<any>}
     */
    delete: req => {
        let data = {
            userInfo: req.userInfo,
            classId: req.params.classId.toString(),
        };

        return new Promise((resolve, reject) => {
            if ("Admin" !== data.userInfo.role) {
                reject(errorTexts.userRole)
            }

            if (!ObjectID.isValid(data.classId)) {
                reject(errorTexts.mongId)
            }

            removeClass(data)
                .then(data => {
                    resolve(successTexts.classDeleted)
                })
                .catch(reject)
        })
    },

};

module.exports = classInfo;

/**
 *
 * @param data
 * @returns {Promise<any>}
 */
function saveClass(data) {
    let currentTime = Math.floor(Date.now() / 1000);

    let classInfo = {
        flightId:                   data.flightId,
        className:                  data.body.className,
        classType:                  data.body.classType,
        numberOfSeats:              Number(data.body.numberOfSeats),
        fareRules:                  data.body.fareRules,
        fareAdult:                  data.body.fareAdult,
        fareChd:                    data.body.fareChd,
        fareInf:                    data.body.fareInf,
        taxXAdult:                  data.body.taxXAdult,
        taxYAdult:                  data.body.taxYAdult,
        taxXChd:                    data.body.taxXChd,
        taxYChd:                    data.body.taxYChd,
        cat:                        data.body.cat,
        surchargeMultiDestination:  data.body.surchargeMultiDestination,
        surchargeLongRange:         data.body.surchargeLongRange,
        surchargeShortRange:        data.body.surchargeShortRange,
        commChd:                    data.body.commChd,
        commAdult:                  data.body.commAdult,
        updatedAt:                  currentTime,
        createdAt:                  currentTime
    };

    data.classDocumetInfo = classInfo;

    let documentInfo = {};
    documentInfo.collectionName = "classes";
    documentInfo.documentInfo = classInfo;

    return new Promise((resolve, reject) => {
        mongoRequests.insertDocument(documentInfo)
            .then(insertRes => {
                insertRes.insertedCount === 1
                    ? resolve(data)
                    : reject(errorTexts.cantSaveDocumentToMongo)
            })
    });
}

/**
 *
 * @param data
 * @returns {Promise<any>}
 */
function validateNumberOfSeats(data) {
    let usedSeats = data.existedClassesInfo.totalSeats;
    let totalSeats = data.flightInfo.numberOfSeats;
    let requestedSeats = Number(data.body.numberOfSeats);

    // console.log(totalSeats, usedSeats, requestedSeats);body

    return new Promise((resolve, reject) => {
        if (totalSeats < (usedSeats + requestedSeats)) {
            let availableSeatsCount = totalSeats - usedSeats;

            reject({
                code: 401,
                status: "error",
                message: "There is no enough space: You can add only "+ availableSeatsCount
            })
        }
        else {
            resolve(data)
        }
    })

}

/**
 *
 * @param data
 * @returns {Promise<any>}
 */
function checkClassName(data) {
    return new Promise((resolve, reject) => {
        _.each(data.existedClassesInfo.class, existedClass => {
            if (data.body.className === existedClass.name) {
                reject({
                    code: 401,
                    status: "error",
                    message: "Class with this name already exists!"
                })
            }
        });

        resolve(data)
    });
}

/**
 *
 * @param data
 * @returns {Promise<any>}
 */
function updateClass(data) {
    let currentTime = Math.floor(Date.now() / 1000);

    let updateInfo = data.editableFieldsValues;
    updateInfo.updatedAt = currentTime;

    let documentInfo = {};
    documentInfo.collectionName = "classes";
    documentInfo.filterInfo = {_id: ObjectID(data.classId)};
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

function removeClass(data) {
    let currentTime = Math.floor(Date.now() / 1000);

    let updateInfo = {
        status: "deleted",
        updatedAt: currentTime,
        deletedAt: currentTime
    };

    let documentInfo = {};
    documentInfo.collectionName = "classes";
    documentInfo.filterInfo = {_id: ObjectID(data.classId)};
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