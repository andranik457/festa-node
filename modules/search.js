
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
const travelTypes = {
    oneWay: "One Way",
    roundTrip: "Round Trip",
    multiDestination: "Multi Destination"
};

const searchInfo = {

    search: req => {

        let possibleFields = {};

        // check travel type
        if (_.has(req.body.travelType) && req.body.travelType === travelTypes.oneWay) {
            possibleFields = {
                departureFrom: {
                    name: "Departure From (City & Airport)",
                    type: "text",
                    format: "latin",
                    minLength: 3,
                    maxLength: 64,
                    required: true
                },
                destinationTo: {
                    name: "Destination to (City & Airport)",
                    type: "text",
                    format: "latin",
                    minLength: 3,
                    maxLength: 64,
                    required: true
                },
                departureDate: {
                    name: "Departure Date",
                    type: "date",
                    minLength: 3,
                    maxLength: 64,
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
        else if (_.has(req.body.travelType) && req.body.travelType === travelTypes.roundTrip) {
            possibleFields = {
                departureFrom: {
                    name: "Departure From (City & Airport)",
                    type: "text",
                    format: "latin",
                    minLength: 3,
                    maxLength: 64,
                    required: true
                },
                destinationTo: {
                    name: "Destination (City & Airport)",
                    type: "text",
                    format: "latin",
                    minLength: 3,
                    maxLength: 64,
                    required: true
                },
                departureDate: {
                    name: "Departure Date",
                    type: "date",
                    minLength: 3,
                    maxLength: 64,
                },
                returnDate: {
                    name: "Return Date",
                    type: "date",
                    minLength: 3,
                    maxLength: 64,
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
            possibleFields = {
                departureFrom: {
                    name: "Departure From (City & Airport)",
                    type: "text",
                    format: "latin",
                    minLength: 3,
                    maxLength: 64,
                    required: true
                },
                destinationTo: {
                    name: "Destination (City & Airport)",
                    type: "text",
                    format: "latin",
                    minLength: 3,
                    maxLength: 64,
                    required: true
                },
                departureFrom1: {
                    name: "Departure From 1 (City & Airport)",
                    type: "text",
                    format: "latin",
                    minLength: 3,
                    maxLength: 64,
                },
                destinationTo1: {
                    name: "Destination 1 (City & Airport)",
                    type: "text",
                    format: "latin",
                    minLength: 3,
                    maxLength: 64,
                    required: true
                },
                departureDate: {
                    name: "Departure Date",
                    type: "date",
                    minLength: 3,
                    maxLength: 64,
                    required: true
                },
                returnDate: {
                    name: "Return Date",
                    type: "date",
                    minLength: 3,
                    maxLength: 64,
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
                .then(mainSearchResult)
                .then(generateResult)
                .then(data => {
                    resolve({
                        code: 200,
                        status: "Success",
                        message: "Search info successfully goten!",
                        data: data
                    })
                })
                .catch(reject)
        });
    }

};

module.exports = searchInfo;


/**
 *
 * @param data
 * @returns {Promise<*>}
 */
async function mainSearchResult(data) {
    // get available flights
    let availableFlights = await checkAvailableFlights(data);

    // get departure flights ID's
    let availableDepartureFlightsIds = [];
    if (availableFlights[0] !== undefined) {
        _.each(availableFlights[0], flightInfo => {
            availableDepartureFlightsIds.push(flightInfo['_id'].toString());
        });
    }
    // get availableClasses for selected Flights
    let departureFlightsClasses = await checkAvailableClasses(data, availableDepartureFlightsIds);

    // get return flights ID's
    let availableReturnFlightsIds = [];
    if (availableFlights[1] !== undefined) {
        _.each(availableFlights[1], flightInfo => {
            availableReturnFlightsIds.push(flightInfo['_id'].toString());
        });
    }
    // get availableClasses for selected Flights
    let returnFlightsClasses = await checkAvailableClasses(data, availableReturnFlightsIds);

    let searchResult = [];
    searchResult['departure'] = [];
    searchResult['return'] = [];

    // append departure classes
    _.each(availableFlights[0], availableFlight => {
        if (_.has(departureFlightsClasses, availableFlight['_id'])) {
            availableFlight['classes'] = departureFlightsClasses[availableFlight['_id']];

            searchResult['departure'].push(availableFlight)
        }
    });

    // append return classes
    _.each(availableFlights[1], availableFlight => {
        if (_.has(returnFlightsClasses, availableFlight['_id'])) {
            availableFlight['classes'] = returnFlightsClasses[availableFlight['_id']];

            searchResult['return'].push(availableFlight)
        }
    });

    data.departureInfo = searchResult.departure;
    data.returnInfo = searchResult.return;

    return data;

}

/**
 *
 * @param destination
 * @param city
 * @returns {Promise<any>}
 */
async function getTimeZoneFromFlight(destination, city) {
    let documentInfo = {};
    documentInfo.collectionName = "flights";
    documentInfo.filterInfo = {[destination]: city};
    documentInfo.projectionInfo = {};

    return new Promise((resolve, reject) => {
        mongoRequests.findDocument(documentInfo)
            .then(docInfo => {
                resolve(docInfo)
            })
            .catch(reject)
    });
}

/**
 *
 * @param data
 * @returns {Promise<any>}
 */
async function checkAvailableFlights(data) {
    // get date from departureDate
    if (_.has(data.editableFieldsValues, "departureDate")) {
        let splitDate = data.editableFieldsValues["departureDate"].split(' ');
        data.editableFieldsValues["departureDate"] = splitDate[0];
    }

    // get date from destinationDate
    if (_.has(data.editableFieldsValues, "returnDate")) {
        let splitDate = data.editableFieldsValues["returnDate"].split(' ');
        data.editableFieldsValues["returnDate"] = splitDate[0];
    }


    // try to get available flights
    if (!_.isEmpty(data.editableFieldsValues)) {
        let filter = {
            "$and": [
                {status: "upcoming"}
            ]
        };

        // check travel type
        let availableFiltersForFlight = [];
        if (_.has(data.body, "travelType") && data.body.travelType === travelTypes.oneWay) {
            availableFiltersForFlight = {
                "departureFrom":    "from",
                "destinationTo":    "to",
                "departureDate":    "dateInfo.startDate"
            };

            _.each(data.editableFieldsValues, (value, key) => {
                if (_.has(availableFiltersForFlight, key)) {
                    filter["$and"].push({
                        [availableFiltersForFlight[key]]: value
                    });
                }
            });

            let oneWayFlightInfo = await Promise.all([
                getFlightsDependFilter(filter)
            ]);

            return Promise.resolve(oneWayFlightInfo)
        }
        else if (_.has(data.body, "travelType") && data.body.travelType === travelTypes.roundTrip) {
            // create departure filter
            let availableFiltersForDepartureFlight = {
                "departureFrom":    "from",
                "destinationTo":    "to",
                "departureDate":    "dateInfo.startDate",
            };

            let departureFilter = {
                "$and": [
                    {status: "upcoming"}
                ]
            };

            _.each(data.editableFieldsValues, (value, key) => {
                if (_.has(availableFiltersForDepartureFlight, key)) {
                    departureFilter["$and"].push({
                        [availableFiltersForDepartureFlight[key]]: value
                    });
                }
            });

            // create return filter
            let availableFiltersForReturnFlight = {
                "departureFrom":    "to",
                "destinationTo":    "from",
                "returnDate":       "dateInfo.startDate",
            };

            let returnFilter = {
                "$and": [
                    {status: "upcoming"}
                ]
            };

            _.each(data.editableFieldsValues, (value, key) => {
                if (_.has(availableFiltersForReturnFlight, key)) {
                    returnFilter["$and"].push({
                        [availableFiltersForReturnFlight[key]]: value
                    });
                }
            });

            // get departure and return flights info
            let roundTripFlightsInfo = await Promise.all([
                getFlightsDependFilter(departureFilter),
                getFlightsDependFilter(returnFilter)
            ]);

            return Promise.resolve(roundTripFlightsInfo)
        }
        else {
            // create departure filter
            let availableFiltersForDepartureFlight = {
                "departureFrom":    "from",
                "destinationTo":    "to",
                "departureDate":    "dateInfo.startDate",
            };

            let departureFilter = {
                "$and": [
                    {status: "upcoming"}
                ]
            };

            _.each(data.editableFieldsValues, (value, key) => {
                if (_.has(availableFiltersForDepartureFlight, key)) {
                    departureFilter["$and"].push({
                        [availableFiltersForDepartureFlight[key]]: value
                    });
                }
            });

            // create return filter
            let availableFiltersForReturnFlight = {
                "departureFrom1":    "from",
                "destinationTo1":    "to",
                "returnDate":        "dateInfo.startDate",
            };

            let returnFilter = {
                "$and": [
                    {status: "upcoming"}
                ]
            };

            _.each(data.editableFieldsValues, (value, key) => {
                if (_.has(availableFiltersForReturnFlight, key)) {
                    returnFilter["$and"].push({
                        [availableFiltersForReturnFlight[key]]: value
                    });
                }
            });

            // get departure and return flights info
            let multiDestinationTripFlightsInfo = await Promise.all([
                getFlightsDependFilter(departureFilter),
                getFlightsDependFilter(returnFilter)
            ]);

            return Promise.resolve(multiDestinationTripFlightsInfo)
        }

    }
    else {
        let filter = {
            "$and": [
                {status: "upcoming"}
            ]
        };

        return await getFlightsDependFilter(filter)
    }

}

/**
 *
 * @param filter
 * @returns {Promise<any>}
 */
async function getFlightsDependFilter(filter) {
    let documentInfo = {};
    documentInfo.collectionName = "flights";
    documentInfo.filterInfo = filter;
    documentInfo.optionInfo = {sort: {createdAt: -1}};
    documentInfo.projectionInfo = {};

    return new Promise((resolve, reject) => {
        mongoRequests.findDocuments(documentInfo)
            .then(docInfo => {
                resolve(docInfo)
            })
            .catch(reject)
    });
}

/**
 *
 * @param data
 * @returns {Promise<any>}
 */
async function checkAvailableClasses(data, flightsIds) {
    let needSeatsCount = 0;
    if (data.body.passengerTypeAdults) {
        needSeatsCount += parseInt(data.body.passengerTypeAdults);
    }
    if (data.body.passengerTypeChild) {
        needSeatsCount += parseInt(data.body.passengerTypeChild);
    }
    if (data.body.passengerTypeInfant) {
        needSeatsCount += parseInt(data.body.passengerTypeInfant);
    }

    let documentInfo = {};
    documentInfo.collectionName = "classes";
    documentInfo.filterInfo = {
        $and: [
            {flightId: {$in: flightsIds}},
            {availableSeats: {$gte: needSeatsCount}}
        ]
    };
    documentInfo.optionInfo = {};
    documentInfo.projectionInfo = {};

    return new Promise((resolve, reject) => {
        mongoRequests.findDocuments(documentInfo)
            .then(async docInfo => {

                let classesInfo = {};
                for (let i in docInfo) {
                    let classInfo = docInfo[i];

                    if (!_.has(classesInfo, classInfo['flightId'])) {
                        classesInfo[classInfo['flightId']] = [];
                    }


                    // calculate class price
                    let classFullInfo = await calculatePrices(classInfo, data);

                    classesInfo[classFullInfo['flightId']].push(classFullInfo)
                }

                resolve(classesInfo)
            })
            .catch(reject)
    });
}


/**
 *
 * @param data
 * @returns {Array}
 */
function generateResult(data) {
    let result = [];
    if (data.body.travelType === "One Way") {
        result = data.departureInfo;
    }
    else {
        if (data.departureInfo.length != 0 && data.returnInfo.length != 0) {
            result = {
                departureInfo: data.departureInfo,
                returnInfo: data.returnInfo
            };
        }
    }

    return new Promise((resolve, reject) => {
        resolve(result)
    });
}

async function calculatePrices(classInfo, data) {
    // for one way
    let priceInfo = {};

    if (travelTypes.oneWay === data.body.travelType) {
        priceInfo['adultPrice'] = parseFloat(classInfo.fareAdult) + parseFloat(classInfo.taxXAdult) + parseFloat(classInfo.cat);
        priceInfo['childPrice'] = parseFloat(classInfo.fareChd) + parseFloat(classInfo.taxXChd) + parseFloat(classInfo.cat);
        priceInfo['infantPrice'] = parseFloat(classInfo.fareInf);

        // append prices to class
        classInfo = await appendPricesToClass(priceInfo, classInfo, data);
    }

    else if (travelTypes.roundTrip === data.body.travelType) {
        // check travel duration
        let flightDuration = await getFlightDurationByFlightId(classInfo.flightId);

        if (flightDuration > (15 * 86400)) {
            priceInfo['adultPrice'] = parseFloat(classInfo.fareAdult) + parseFloat(classInfo.taxXAdult) + parseFloat(classInfo.taxYAdult) + parseFloat(classInfo.cat) + parseFloat(classInfo.surchargeLongRange);
            priceInfo['childPrice'] = parseFloat(classInfo.fareChd) + parseFloat(classInfo.taxXChd) + parseFloat(classInfo.taxYChd) + parseFloat(classInfo.cat) + parseFloat(classInfo.surchargeLongRange);
            priceInfo['infantPrice'] = parseFloat(classInfo.fareInf);

            // append prices to class
            classInfo = await appendPricesToClass(priceInfo, classInfo, data);
        }
        else if (flightDuration < (3 * 86400)) {
            priceInfo['adultPrice'] = parseFloat(classInfo.fareAdult) + parseFloat(classInfo.taxXAdult) + parseFloat(classInfo.taxYAdult) + parseFloat(classInfo.cat) + parseFloat(classInfo.surchargeShortRange);
            priceInfo['childPrice'] = parseFloat(classInfo.fareChd) + parseFloat(classInfo.taxXChd) + parseFloat(classInfo.taxYChd) + parseFloat(classInfo.cat) + parseFloat(classInfo.surchargeShortRange);
            priceInfo['infantPrice'] = parseFloat(classInfo.fareInf);

            // append prices to class
            classInfo = await appendPricesToClass(priceInfo, classInfo, data);
        }
        else {
            priceInfo['adultPrice'] = parseFloat(classInfo.fareAdult) + parseFloat(classInfo.taxXAdult) + parseFloat(classInfo.taxYAdult) + parseFloat(classInfo.cat);
            priceInfo['childPrice'] = parseFloat(classInfo.fareChd) + parseFloat(classInfo.taxXChd) + parseFloat(classInfo.taxYChd) + parseFloat(classInfo.cat);
            priceInfo['infantPrice'] = parseFloat(classInfo.fareInf);

            // append prices to class
            classInfo = await appendPricesToClass(priceInfo, classInfo, data);
        }
    }
    else if (travelTypes.multiDestination === data.body.travelType) {
        priceInfo['adultPrice'] = parseFloat(classInfo.fareAdult) + parseFloat(classInfo.taxXAdult) + parseFloat(classInfo.taxYAdult) + parseFloat(classInfo.cat) + parseFloat(classInfo.surchargeMultiDestination);
        priceInfo['childPrice'] = parseFloat(classInfo.fareChd) + parseFloat(classInfo.taxXChd) + parseFloat(classInfo.taxYChd) + parseFloat(classInfo.cat) + parseFloat(classInfo.surchargeMultiDestination);
        priceInfo['infantPrice'] = 0;

        // append prices to class
        classInfo = await appendPricesToClass(priceInfo, classInfo, data);
    }

    return classInfo;
}

/**
 *
 * @param priceInfo
 * @param classInfo
 * @param data
 * @returns {Promise<*>}
 */
async function appendPricesToClass(priceInfo, classInfo, data) {
    classInfo.prices = [];

    // check travelers types
    if (typeof data.body.passengerTypeAdults !== 'undefined') {
        let adultPriceInfo = {
            eachPrice:  priceInfo.adultPrice,
            count:      data.body.passengerTypeAdults,
            totalPrice: data.body.passengerTypeAdults * priceInfo.adultPrice
        };

        classInfo.prices.push({
            adultPriceInfo: adultPriceInfo
        })
    }

    if (typeof data.body.passengerTypeChild !== 'undefined') {
        let childPriceInfo = {
            eachPrice:  priceInfo.childPrice,
            count:      data.body.passengerTypeChild,
            totalPrice: data.body.passengerTypeChild * priceInfo.childPrice
        };

        classInfo.prices.push({
            childPriceInfo: childPriceInfo
        })
    }

    if (typeof data.body.passengerTypeInfant !== 'undefined') {
        let infantPrice = {
            eachPrice:  priceInfo.childPrice,
            count:      data.body.passengerTypeInfant,
            totalPrice: data.body.passengerTypeInfant * priceInfo.childPrice
        };

        classInfo.prices.push({
            infantPrice: infantPrice
        })
    }

    return classInfo;
}

/**
 *
 * @param flightId
 * @returns {Promise<any>}
 */
async function getFlightDurationByFlightId(flightId) {
    let documentInfo = {};
    documentInfo.collectionName = "flights";
    documentInfo.filterInfo = {_id: ObjectID(flightId)};
    documentInfo.projectionInfo = {duration: 1};

    return new Promise((resolve, reject) => {
        mongoRequests.findDocument(documentInfo)
            .then(docInfo => {
                resolve(docInfo.duration)
            })
            .catch(reject)
    });
}