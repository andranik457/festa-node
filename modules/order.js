
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
        // console.log(possibleFields);
        let data = {
            body: req.body,
            userInfo: req.userInfo,
            possibleForm: possibleFields,
            editableFields: possibleFields,
            editableFieldsValues: req.body
        };

        data = await Helper.validateData(data);

        // check travel type
        if (data.body.travelType === travelTypes.oneWay) {
            let oneWayTripInfo = await oneWayTripData(data);
            data.tripInfo = oneWayTripInfo;
        }

        // save info and return data
        let result = await createPreOrder(data);
        // console.log(result);
        return result;

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
            destinationFlightId: {
                name: "Destination FlightId",
                type: "text",
                minLength: 24,
                maxLength: 24,
                required: true
            },
            destinationClassId: {
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
            destinationFlightId: {
                name: "Destination FlightId",
                type: "text",
                minLength: 24,
                maxLength: 24,
                required: true
            },
            destinationClassId: {
                name: "Destination ClassId",
                type: "text",
                minLength: 24,
                maxLength: 24,
                required: true
            },
            departure1FlightId: {
                name: "Departure1 FlightId",
                type: "text",
                minLength: 24,
                maxLength: 24,
                required: true
            },
            departure1ClassId: {
                name: "Departure1 ClassId",
                type: "text",
                minLength: 24,
                maxLength: 24,
                required: true
            },
            destination1FlightId: {
                name: "Destination1 FlightId",
                type: "text",
                minLength: 24,
                maxLength: 24,
                required: true
            },
            destination1ClassId: {
                name: "Destination1 ClassId",
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

async function createPreOrder(data) {
    // create PNR for pre-order
    let pnr = await Helper.getNewPnrId();
    console.log(pnr);

    let currentTime = Math.floor(Date.now() / 1000);

    let preOrderInfo = {
        pnr:        pnr,
        travelType: data.tripInfo.travelType,
        usedPlaces: 2,
        flightInfo: data.tripInfo.departureFlightInfo,
        classInfo:  data.tripInfo.departureClassInfo,
        updatedAt:  currentTime,
        createdAt:  currentTime
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