
/**
 * Modoule Dependencies
 */

const _             = require("underscore");
const winston       = require("winston");
const ObjectID      = require('mongodb').ObjectID;
const mongoRequests = require("../dbQueries/mongoRequests");
const Helper        = require("../modules/helper");
const FlightHelper  = require("../modules/flightHelper");
const flightFunc    = require("../modules/flight");
const classFunc     = require("../modules/class");
const successTexts  = require("../texts/successTexts");
const errorTexts    = require("../texts/errorTexts");
const travelTypes = {
    oneWay: "One Way",
    roundTrip: "Round Trip",
    multiDestination: "Multi Destination"
};

const orderInfo = {

    async preOrder (req) {

        let possibleFields = await createValidateFormDependTravelType(req.body);
        if (400 === possibleFields.code) {
            return possibleFields;
        }

        let data = {
            body: req.body,
            userInfo: req.userInfo,
            possibleForm: possibleFields,
            editableFields: possibleFields,
            editableFieldsValues: req.body
        };

        data = await Helper.validateData(data);

        // calculate passengers count | if greater 9 return error
        let passengersCount = await calculatePassengersCount(data);
        if (passengersCount > 9) {
            return errorTexts.incorrectPassengersCount;
        }
        else {
            data.passengersCount = passengersCount;
        }

        // check travel type
        if (data.body.travelType === travelTypes.oneWay) {
            data.tripInfo = await oneWayTripData(data);

            // save info and return data
            return await createOneWayPreOrder(data);
        }
        else if ((data.body.travelType === travelTypes.roundTrip) || (data.body.travelType === travelTypes.multiDestination)) {
            data.tripInfo = await twoWayTripData(data);

            if (_.has(data.tripInfo, "code")) {
                return data.tripInfo;
            }

            // create two way pre-order
            return await createTwoWayPreOrder(data);
        }
        else {
            return errorTexts.incorrectTravelType
        }

    },

    async order (req) {

        // validate data
        let possibleFields = {
            agentId: {
                name: "AgentId",
                type: "number",
                minLength: 1,
                maxLength: 10,
                required: true
            },
            pnr: {
                name: "PNR",
                type: "text",
                minLength: 5,
                maxLength: 24,
                required: true
            },
            ticketStatus: {
                name: "Ticket Status",
                type: "text",
                minLength: 5,
                maxLength: 24,
                required: true
            },
            comment: {
                name: "Comment",
                type: "text",
                minLength: 1,
                maxLength: 128,
                required: true
            },
            contactPersonName: {
                name: "Contact Person name",
                type: "text",
                minLength: 3,
                maxLength: 64,
                required: true
            },
            contactPersonSurname: {
                name: "Contact Person surname",
                type: "text",
                minLength: 3,
                maxLength: 64,
                required: true
            },
            contactPersonEmail: {
                name: "Contact Person email",
                type: "email",
                minLength: 3,
                maxLength: 64,
                required: true
            },
            contactPersonTelephone: {
                name: "Contact Person telephone",
                type: "telephone",
                minLength: 3,
                maxLength: 64,
                required: true
            },
            passengersInfo: {
                name: "Passengers Info",
                type: "text",
                minLength: 3,
                maxLength: 512,
                required: true
            }
        };

        let data = {
            body: req.body,
            userInfo: req.userInfo,
            possibleForm: possibleFields,
            editableFields: possibleFields,
            editableFieldsValues: req.body
        };

        data = await Helper.validateData(data);

        let passengersInfo = JSON.parse(Buffer.from(req.body.passengersInfo, 'base64').toString('utf8'));

        let passengerInfo = [];
        for (let i in passengersInfo) {
            let passengerValidateInfo = await createValidateFormDependPassengerType(passengersInfo[i]);

            if (_.has(passengerValidateInfo, "code")) {
                return passengerValidateInfo;
            }
            else {
                possibleFields = passengerValidateInfo;

                let data = {
                    body: passengersInfo[i],
                    userInfo: req.userInfo,
                    possibleForm: possibleFields,
                    editableFields: possibleFields,
                    editableFieldsValues: passengersInfo[i]
                };

                // validate passenger data
                await Helper.validateData(data);

                passengerInfo.push(passengersInfo[i]);
            }
        }

        // check pnr
        let pnrInfo = await getPnrInfo(req.body.pnr);

        // check ticket value
        if (!(req.body.ticketStatus === "Booking" || req.body.ticketStatus === "Ticketing")) {
            return errorTexts.incorrectTicketValue
        }

        let orderInfo = {
            pnr:                    req.body.pnr,
            travelInfo:             pnrInfo,
            ticketStatus:           req.body.ticketStatus,
            comment:                req.body.comment,
            contactPersonInfo:      {
                name:      req.body.contactPersonName,
                surname:   req.body.contactPersonSurname,
                email:     req.body.contactPersonEmail,
                telephone: req.body.contactPersonTelephone,
            },
            passengerInfo:          passengerInfo
        };

        return Promise.resolve({
            code: 200,
            status: "Success",
            message: "",
            data: orderInfo
        });

    }

};


module.exports = orderInfo;


/**
 *
 * @param body
 * @returns {Promise<*>}
 */
async function createValidateFormDependTravelType(body) {

    if (_.isUndefined(body.travelType)) {
        return errorTexts.incorrectTravelType;
    }
    else if (body.travelType === travelTypes.oneWay) {
        return {
            departureFlightId: {
                name: "Departure FlightId",
                type: "text",
                minLength: 24,
                maxLength: 24,
                required: true
            },
            departureClassId: {
                name: "Departure ClassId",
                type: "text",
                minLength: 24,
                maxLength: 24,
                required: true
            },
            travelType: {
                name: "Travel Type",
                type: "text",
                minLength: 3,
                maxLength: 24,
                required: true
            },
            passengerTypeAdults: {
                name: "Passenger Type Adults",
                type: "number",
                minLength: 1,
                maxLength: 1,
            },
            passengerTypeChild: {
                name: "Passenger Type Child",
                type: "number",
                minLength: 1,
                maxLength: 1,
            },
            passengerTypeInfant: {
                name: "Passenger Type Infant",
                type: "number",
                minLength: 1,
                maxLength: 1,
            }
        };
    }
    else if (body.travelType === travelTypes.roundTrip) {
        return {
            departureFlightId: {
                name: "Departure FlightId",
                type: "text",
                minLength: 24,
                maxLength: 24,
                required: true
            },
            departureClassId: {
                name: "Departure ClassId",
                type: "text",
                minLength: 24,
                maxLength: 24,
                required: true
            },
            returnFlightId: {
                name: "Destination FlightId",
                type: "text",
                minLength: 24,
                maxLength: 24,
                required: true
            },
            returnClassId: {
                name: "Destination ClassId",
                type: "text",
                minLength: 24,
                maxLength: 24,
                required: true
            },
            travelType: {
                name: "Travel Type",
                type: "text",
                minLength: 3,
                maxLength: 24,
                required: true
            },
            passengerTypeAdults: {
                name: "Passenger Type Adults",
                type: "number",
                minLength: 1,
                maxLength: 1,
            },
            passengerTypeChild: {
                name: "Passenger Type Child",
                type: "number",
                minLength: 1,
                maxLength: 1,
            },
            passengerTypeInfant: {
                name: "Passenger Type Infant",
                type: "number",
                minLength: 1,
                maxLength: 1,
            }
        };
    }
    else if (body.travelType === travelTypes.multiDestination) {
        return {
            departureFlightId: {
                name: "Departure FlightId",
                type: "text",
                minLength: 24,
                maxLength: 24,
                required: true
            },
            departureClassId: {
                name: "Departure ClassId",
                type: "text",
                minLength: 24,
                maxLength: 24,
                required: true
            },
            returnFlightId: {
                name: "Destination FlightId",
                type: "text",
                minLength: 24,
                maxLength: 24,
                required: true
            },
            returnClassId: {
                name: "Destination ClassId",
                type: "text",
                minLength: 24,
                maxLength: 24,
                required: true
            },
            travelType: {
                name: "Travel Type",
                type: "text",
                minLength: 3,
                maxLength: 24,
                required: true
            },
            passengerTypeAdults: {
                name: "Passenger Type Adults",
                type: "number",
                minLength: 1,
                maxLength: 1,
            },
            passengerTypeChild: {
                name: "Passenger Type Child",
                type: "number",
                minLength: 1,
                maxLength: 1,
            },
            passengerTypeInfant: {
                name: "Passenger Type Infant",
                type: "number",
                minLength: 1,
                maxLength: 1,
            }
        };
    }
    else {
        return errorTexts.incorrectTravelType;
    }
}

/**
 *
 * @param body
 * @returns {Promise<*>}
 */
async function createValidateFormDependPassengerType(body) {
    if (_.isUndefined(body.passengerType)) {
        return errorTexts.passengerType;
    }
    else if (body.passengerType === "Adults") {
        return {
            name: {
                name: "Name",
                type: "text",
                format: "latin",
                minLength: 3,
                maxLength: 64,
                required: true
            },
            surname: {
                name: "Surname",
                type: "text",
                format: "latin",
                minLength: 3,
                maxLength: 64,
                required: true
            },
            gender: {
                name: "Gender",
                type: "text",
                minLength: 3,
                maxLength: 18,
                required: true
            },
            passportNumber: {
                name: "Passport number",
                type: "text",
                minLength: 3,
                maxLength: 18,
                required: true
            },
        };
    }
    else if ((body.passengerType === "Child") || (body.passengerType === "Infant")) {
        return {
            name: {
                name: "Name",
                type: "text",
                format: "latin",
                minLength: 3,
                maxLength: 64,
                required: true
            },
            surname: {
                name: "Surname",
                type: "text",
                format: "latin",
                minLength: 3,
                maxLength: 64,
                required: true
            },
            gender: {
                name: "Gender",
                type: "text",
                minLength: 3,
                maxLength: 18,
            },
            passportNumber: {
                name: "Passport number",
                type: "text",
                minLength: 3,
                maxLength: 18,
                required: true
            },
        };
    }
    else {
        return errorTexts.passengerType;
    }
}

/**
 *
 * @param data
 * @returns {Promise<*>}
 */
async function oneWayTripData(data) {
    // get flight info class info | on hold places for this class

    // check is flightId is correct mongoId
    if (!ObjectID.isValid(data.body.departureFlightId)) {
        return errorTexts.mongId;
    }
    else {
        data.flightId = data.body.departureFlightId;
    }

    // check is classId is correct mongoId
    if (!ObjectID.isValid(data.body.departureClassId)) {
        return errorTexts.mongId;
    }
    else {
        data.classId = data.body.departureClassId;
    }


    let [
        flightInfo,
        classInfo,
        // availableInfo
    ] = await Promise.all([
        flightFunc.getFlight({
            userInfo: data.userInfo,
            params: {flightId: data.flightId}
        }),
        classFunc.getClassByClassId({
            userInfo: data.userInfo,
            params: {classId: data.classId}
        })
    ]);

    return {
        travelType:             travelTypes.oneWay,
        departureFlightInfo:    flightInfo.data,
        departureClassInfo:     classInfo.data
    };
}

/**
 *
 * @param data
 * @returns {Promise<*>}
 */
async function twoWayTripData(data) {
    if (
        !ObjectID.isValid(data.body.departureFlightId) ||
        !ObjectID.isValid(data.body.departureClassId) ||
        !ObjectID.isValid(data.body.returnFlightId) ||
        !ObjectID.isValid(data.body.returnClassId)
    ) {
        return errorTexts.mongId;
    }

    let [
        departureFlightInfo,
        departureClassInfo,
        returnFlightInfo,
        returnClassInfo
    ] = await Promise.all([
        flightFunc.getFlight({
            userInfo: data.userInfo,
            params: {flightId: data.body.departureFlightId}
        }),
        classFunc.getClassByClassId({
            userInfo: data.userInfo,
            params: {classId: data.body.departureClassId}
        }),
        flightFunc.getFlight({
            userInfo: data.userInfo,
            params: {flightId: data.body.returnFlightId}
        }),
        classFunc.getClassByClassId({
            userInfo: data.userInfo,
            params: {classId: data.body.returnClassId}
        })
    ]);

    if (departureFlightInfo.data.airline !== returnFlightInfo.data.airline) {
        return errorTexts.differentAirlines;
    }
    else {
        return {
            travelType:             travelTypes.oneWay,
            departureFlightInfo:    departureFlightInfo.data,
            departureClassInfo:     departureClassInfo.data,
            returnFlightInfo:       returnFlightInfo.data,
            returnClassInfo:        returnClassInfo.data
        };
    }

}


/**
 *
 * @param data
 * @returns {Promise<number>}
 */
async function calculatePassengersCount(data) {
    let passengersCount = 0;

    if (data.body.passengerTypeAdults) {
        passengersCount += parseInt(data.body.passengerTypeAdults);
    }
    if (data.body.passengerTypeChild) {
        passengersCount += parseInt(data.body.passengerTypeChild);
    }
    if (data.body.passengerTypeInfant) {
        passengersCount += parseInt(data.body.passengerTypeInfant);
    }

    return passengersCount;
}

/**
 *
 * @param data
 * @returns {Promise<any>}
 */
async function createOneWayPreOrder(data) {
    if (data.tripInfo.departureFlightInfo == null || data.tripInfo.departureClassInfo == null) {
        return Promise.reject({
            code: 400,
            status: "error",
            message: "Incorrect Flight and/or Class Id"
        });
    }
    else {
        let onHolPlaces = await getOnHoldPlaceCountForClass(data.tripInfo.departureClassInfo._id);

        if ((data.tripInfo.departureClassInfo.availableSeats - onHolPlaces.count) < data.passengersCount) {
            return Promise.reject({
                code: 400,
                status: "error",
                message: "In this class no enough place"
            });
        }

        // add data to on hold
        await addPlacesToOnHold(data.tripInfo.departureClassInfo, data.passengersCount);

        let pnr = await Helper.getNewPnrId();

        let currentTime = Math.floor(Date.now() / 1000);

        let preOrderInfo = {
            pnr:                    pnr,
            travelType:             data.tripInfo.travelType,
            usedPlaces:             data.passengersCount,
            departureFlightInfo:    data.tripInfo.departureFlightInfo,
            departureClassInfo:     data.tripInfo.departureClassInfo,
            updatedAt:              currentTime,
            createdAt:              currentTime
        };

        let documentInfo = {};
        documentInfo.collectionName = "preOrders";
        documentInfo.documentInfo = preOrderInfo;

        return new Promise((resolve, reject) => {
            mongoRequests.insertDocument(documentInfo)
                .then(insertRes => {
                    insertRes.insertedCount === 1
                        ? resolve({
                            code: 200,
                            status: "Success",
                            message: "",
                            data: preOrderInfo
                        })
                        : reject(errorTexts.cantSaveDocumentToMongo)
                })
        });
    }
}

/**
 *
 * @param data
 * @returns {Promise<*>}
 */
async function createTwoWayPreOrder(data) {
    if (data.tripInfo.departureFlightInfo == null
        || data.tripInfo.departureClassInfo == null
        || data.tripInfo.returnFlightInfo == null
        || data.tripInfo.returnClassInfo == null) {
        return Promise.reject({
            code: 400,
            status: "error",
            message: "Incorrect Flight and/or Class Id"
        });
    }
    else {
        let [departureOnHoldPlaces, returnOnHoldPlaces] = await Promise.all([
            getOnHoldPlaceCountForClass(data.tripInfo.departureClassInfo._id),
            getOnHoldPlaceCountForClass(data.tripInfo.returnClassInfo._id)
        ]);

        if (((data.tripInfo.departureClassInfo.availableSeats - departureOnHoldPlaces.count) < data.passengersCount) ||
            ((data.tripInfo.returnClassInfo.availableSeats - returnOnHoldPlaces.count) < data.passengersCount)) {
            return Promise.reject({
                code: 400,
                status: "error",
                message: "In this class no enough place"
            });
        }

        // add data to on hold
        await Promise.all([
            addPlacesToOnHold(data.tripInfo.departureClassInfo, data.passengersCount),
            addPlacesToOnHold(data.tripInfo.returnClassInfo, data.passengersCount)
        ]);

        // get new PNR
        let pnr = await Helper.getNewPnrId();

        let currentTime = Math.floor(Date.now() / 1000);
        let preOrderInfo = {
            pnr:                    pnr,
            travelType:             data.tripInfo.travelType,
            usedPlaces:             data.passengersCount,
            departureFlightInfo:    data.tripInfo.departureFlightInfo,
            departureClassInfo:     data.tripInfo.departureClassInfo,
            returnFlightInfo:       data.tripInfo.departureFlightInfo,
            returnClassInfo:        data.tripInfo.departureClassInfo,
            updatedAt:              currentTime,
            createdAt:              currentTime
        };

        let documentInfo = {};
        documentInfo.collectionName = "preOrders";
        documentInfo.documentInfo = preOrderInfo;

        return new Promise((resolve, reject) => {
            mongoRequests.insertDocument(documentInfo)
                .then(insertRes => {
                    insertRes.insertedCount === 1
                        ? resolve({
                            code: 200,
                            status: "Success",
                            message: "",
                            data: preOrderInfo
                        })
                        : reject(errorTexts.cantSaveDocumentToMongo)
                })
        });
    }


}

/**
 *
 * @param classId
 * @returns {Promise<any>}
 */
async function getOnHoldPlaceCountForClass(classId) {
    let documentInfo = {};
    documentInfo.collectionName = "onHold";
    documentInfo.filterInfo = {
        classId: classId.toString()
    };
    documentInfo.projectionInfo = {};
    documentInfo.optionInfo = {};

    let onHoldPlaces = 0;

    return new Promise((resolve, reject) => {
        mongoRequests.findDocuments(documentInfo)
            .then(documents => {

                _.each(documents, docInfo => {
                    onHoldPlaces = onHoldPlaces + docInfo['count']
                });

                if (onHoldPlaces) {
                    resolve({
                        count: onHoldPlaces
                    })
                }
                else {
                    resolve({
                        count: onHoldPlaces
                    })
                }
            })
    });
}

/**
 *
 * @param classInfo
 * @param placesCount
 * @returns {Promise<any>}
 */
async function addPlacesToOnHold(classInfo, placesCount) {
    let documentInfo = {};
    documentInfo.collectionName = "onHold";
    documentInfo.documentInfo = {
        classId: classInfo._id.toString(),
        count: placesCount
    };

    return new Promise((resolve, reject) => {
        mongoRequests.insertDocument(documentInfo)
            .then(insertRes => {
                insertRes.insertedCount === 1
                    ? resolve({
                        code: 200,
                        status: "Success",
                        message: "",
                    })
                    : reject(errorTexts.cantSaveDocumentToMongo)
            })
    });
}

/**
 *
 * @param pnr
 * @returns {Promise<any>}
 */
async function getPnrInfo(pnr) {
    let documentInfo = {};
    documentInfo.collectionName = "preOrders";
    documentInfo.filterInfo = {"pnr": parseInt(pnr)};
    documentInfo.projectionInfo = {};

    return new Promise((resolve, reject) => {
        mongoRequests.findDocument(documentInfo)
            .then(docInfo => {
                if (null === docInfo) {
                    reject(errorTexts.pnrNotFound)
                }
                else {
                    resolve(docInfo)
                }
            })
    });
}