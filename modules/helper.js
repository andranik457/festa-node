
/**
 * Modoule Dependencies
 */

const _                 = require("underscore");
const winston           = require("winston");
const moment            = require("moment");
const momentTimeZone    = require('moment-timezone');
const mongoRequests     = require("../dbQueries/mongoRequests");
const config            = require("../config/config");
const crypto            = require('crypto');
const jwt               = require("jsonwebtoken");
const successTexts      = require("../texts/successTexts");
const errorTexts        = require("../texts/errorTexts");
const request           = require('request');
const travelTypes = {
    oneWay: "One Way",
    roundTrip: "Round Trip",
    multiDestination: "Multi Destination"
};

const helper = {
    getTokenInfo,
    decodeToken,
    getVerificationToken,
    getNewUserId,
    getNewPnrId,
    getNewTicketNumber,
    validateData,
    getUserUpdateableFieldsByRole,
    generateValidationFields,
    generateUpdateInfo,
    calculateFlightDuration,
    getEditableFields,
    getEditableFieldsValues,
    // getCurrencyInfo,
    checkAmount,
    asyncGetClassPrice,
    asyncGetPnrInfo,
    asyncGetExchangeRateByDate,
    extend,
    addToLogs,
    checkCommissionAmount,
    checkPassengerAge
};

/**
 *
 * @param tokenInfo
 * @returns {Promise<any>}
 */
function getTokenInfo(tokenInfo) {
    const token = tokenInfo.split(" ");

    let documentInfo = {};
    documentInfo.collectionName = "users";
    documentInfo.filter = {"tokens" : token[1]};

    return new Promise((resolve, reject) => {
        Promise.all([
            mongoRequests.findDocument(documentInfo),
            decodeToken(tokenInfo)
        ])
            .then(res => {
                if (res[0]) {
                    resolve(res[0])
                }
                else {
                    reject({
                        code: 400,
                        status: "error",
                        message: "Token Not Found!"
                    })
                }
            })
            .catch(err => {
                reject(err);
            })
    })

}

/**
 *
 * @param tokenInfo
 * @returns {Promise<any>}
 */
function decodeToken(tokenInfo) {
    const token = tokenInfo.split(" ");

    return new Promise((resolve, reject) => {
        jwt.verify(token[1], config[process.env.NODE_ENV].jwtSecret, (err, res) => {
            if (err) {
                reject({
                    code: 401,
                    status: "error",
                    message: "No authorization token was found!"
                });
            }
            else {
                resolve(res);
            }
        })
    })
}

/**
 *
 * @param data
 * @returns {Promise<any>}
 */
async function getVerificationToken(data) {
    return new Promise((resolve, reject) => {
        crypto.randomBytes(128, function (err, buffer) {
            if (err) {
                reject(errorTexts.verificationToken);
            }
            else {
                data.verificationToken = buffer.toString('hex');
                resolve(data)
            }
        });
    });
}

/**
 *
 * @param data
 * @returns {Promise<any>}
 */
function getNewUserId(data) {
    let documentInfo = {};
    documentInfo.collectionName = "autoincrement";
    documentInfo.filterInfo = {"type" : "users"};
    documentInfo.updateInfo = {$inc: {sequenceId: 1}};

    return new Promise((resolve, reject) => {
        mongoRequests.updateDocument(documentInfo)
            .then(docCount => {
                data.userId = docCount.value.sequenceId;
                docCount > 0
                    ? reject(errorTexts.userNewId)
                    : resolve(data)
            })
    });
}

/**
 *
 * @returns {Promise<any>}
 */
async function getNewPnrId() {
    let documentInfo = {};
    documentInfo.collectionName = "autoincrement";
    documentInfo.filterInfo = {"type" : "pnr"};
    documentInfo.updateInfo = {$inc: {sequenceId: 1}};

    return new Promise((resolve, reject) => {
        mongoRequests.updateDocument(documentInfo)
            .then(docInfo => {
                docInfo > 0
                    ? reject(errorTexts.pnr)
                    : resolve('F' + docInfo.value.sequenceId)
            })
    });
}

async function getNewTicketNumber() {
    let documentInfo = {};
    documentInfo.collectionName = "autoincrement";
    documentInfo.filterInfo = {"type" : "ticketNumber"};
    documentInfo.updateInfo = {$inc: {sequenceId: 1}};

    return new Promise((resolve, reject) => {
        mongoRequests.updateDocument(documentInfo)
            .then(docInfo => {
                docInfo > 0
                    ? reject(errorTexts.ticketNumber)
                    : resolve('FT' + docInfo.value.sequenceId)
            })
    });
}

/**
 *
 * @param data
 * @returns {Promise<any>}
 */
async function validateData(data) {
    const validationFields = data.editableFields;
    const checkData = data.editableFieldsValues;

    const latinLettersValidate = /^[a-zA-Z -]+$/;
    const emailValidate = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    const passwordValidateLowercase = /^(?=.*[a-z])/;
    const passwordValidateUppercase = /(?=.*[A-Z])/;
    const passwordValidateNumeric = /(?=.*[0-9])/;
    const passwordValidateSpecialCharacter = /(?=.*[!@#$%^&*()])/;
    const numberValidate = /^[0-9]+$/;
    const floatValidate = /^[0-9.]+$/;
    const phoneNumberValidate = /^[+]+[0-9]+$/;
    const dateValidate = /^\d\d\d\d-(0?[1-9]|1[0-2])-(0?[1-9]|[12][0-9]|3[01]) (0[0-9]|1[0-9]|2[0-3]):([0-9]|[0-5][0-9]):([0-9]|[0-5][0-9])$/;
    const onlyDateValidate = /^\d\d\d\d-(0?[1-9]|1[0-2])-(0?[1-9]|[12][0-9]|3[01])$/;

    let errorMessage = {};

    return new Promise((resolve, reject) => {
        for (let field in validationFields) {

            // trim data
            if ("undefined" !== typeof checkData[field] && "string" === typeof checkData[field]) {
                checkData[field] = checkData[field].trim();
            }

            // Required
            if (validationFields[field].required && (typeof checkData[field] === "undefined")) {
                errorMessage[field] = validationFields[field].name + " is required!";
                continue;
            }

            // Type
            if (typeof validationFields[field].type !== "undefined") {

                // email
                if ("email" === validationFields[field].type) {
                    if (!emailValidate.test(checkData[field])) {
                        errorMessage[field] = "Please enter a valid email address."
                        continue;
                    }
                }

                // Password
                if ("password" === validationFields[field].type) {
                    if (!passwordValidateLowercase.test(checkData[field])) {
                        errorMessage[field] = "Password must contain at least 1 lowercase alphabetical character";
                    }
                    else if (!passwordValidateUppercase.test(checkData[field])) {
                        errorMessage[field] = "Password must contain at least 1 uppercase alphabetical character";
                    }

                    else if (!passwordValidateNumeric.test(checkData[field])) {
                        errorMessage[field] = "Password must contain at least 1 numeric character";
                    }
                    else if (!passwordValidateSpecialCharacter.test(checkData[field])) {
                        errorMessage[field] = "Password must contain at least one special character";
                    }
                }

                if ("phoneNumber" === validationFields[field].type) {
                    if (!phoneNumberValidate.test(checkData[field])) {
                        errorMessage[field] = validationFields[field].name + " need to start with + and contain ony numbers!";
                    }
                }

                if (("number" === validationFields[field].type) && (checkData[field] !== undefined)) {
                    if (!numberValidate.test(checkData[field])) {
                        errorMessage[field] = validationFields[field].name + " can contain only numbers";
                    }
                }

                if (("float" === validationFields[field].type) && (checkData[field] !== undefined)) {
                    if (!floatValidate.test(checkData[field])) {
                        errorMessage[field] = validationFields[field].name + " can contain only float numbers";
                    }
                }

                // date check
                if ("date" === validationFields[field].type) {
                    if (!dateValidate.test(checkData[field])) {
                        errorMessage[field] = validationFields[field].name + " not corresponding date time format";
                    }
                }

                // only date check
                if ("onlyDate" === validationFields[field].type) {
                    if (!onlyDateValidate.test(checkData[field])) {
                        errorMessage[field] = validationFields[field].name + " not corresponding date format";
                    }
                }

                // timeZone check
                if ("timeZone" === validationFields[field].type) {
                    if (!momentTimeZone.tz.zone(checkData[field])) {
                        errorMessage[field] = validationFields[field].name + " not corresponding timeZone format";
                    }
                }
            }

            // Min Length
            if ((typeof validationFields[field].minLength !== "undefined") && (checkData[field] !== undefined)) {
                if (checkData[field].length < validationFields[field].minLength) {
                    errorMessage[field] = validationFields[field].name + " need to have at last " + validationFields[field].minLength + " characters.";
                    continue;
                }
            }

            // Max Length
            if ((typeof validationFields[field].maxLength !== "undefined") && (checkData[field] !== undefined)) {
                if (checkData[field].length > validationFields[field].maxLength) {
                    errorMessage[field] = validationFields[field].name + " need to have max " + validationFields[field].maxLength + " characters.";
                    continue;
                }
            }

            // Format
            if (typeof validationFields[field].format !== "undefined") {
                if ("latin" === validationFields[field].format) {
                    if (!latinLettersValidate.test(checkData[field])) {
                        errorMessage[field] = validationFields[field].name + " can contain only latin letters";
                        continue;
                    }
                }
            }

        }

        if (_.isEmpty(errorMessage)) {
            resolve(data);
        }
        else {
            winston.log('error', errorMessage);

            reject({
                code: 400,
                status: "error",
                message: errorMessage
            });
        }

    });
}

/**
 *
 * @param role
 * @returns {Promise<{}>}
 */
async function getUserUpdateableFieldsByRole(role) {
    let updatableFields = {};

    switch(role) {
        case "admin":
            updatableFields = {
                companyName: {
                    name: "Company Name",
                    type: "text",
                    format: "latin",
                    minLength: 3,
                    maxLength: 64,
                    required: true
                },
                businessName: {
                    name: "Business Name",
                    type: "text",
                    format: "latin",
                    minLength: 3,
                    maxLength: 64,
                    required: true
                },
                vat: {
                    name: "VAT",
                    type: "text",
                    format: "latin",
                    minLength: 3,
                    maxLength: 64,
                    required: true
                },
                tin: {
                    name: "TIN",
                    type: "text",
                    format: "latin",
                    minLength: 3,
                    maxLength: 64,
                    required: true
                },
                ceoName: {
                    name: "CEO Name",
                    type: "text",
                    format: "latin",
                    minLength: 3,
                    maxLength: 64,
                    required: true
                },
                phone: {
                    name: "Phone Number",
                    type: "text",
                    minLength: 3,
                    length: 64,
                    required: true
                },
                email: {
                    name: "Email Address",
                    type: "email",
                    minLength: 3,
                    length: 64,
                    required: true
                },
                password: {
                    name: "Password",
                    type: "password",
                    minLength: 8,
                    length: 64,
                    required: true
                },
                status: {
                    name: "Status",
                    type: "text",
                    minLength: 8,
                    length: 64,
                    required: true
                },
                role: {
                    name: "Status",
                    type: "text",
                    minLength: 8,
                    length: 64,
                    required: true
                }
            }
    }

    return updatableFields;
}

/**
 *
 * @param availableFields
 * @param requestFields
 * @returns {Promise<{}>}
 */
async function generateValidationFields(availableFields, requestFields) {
    let validateFields = {};

    _.each(requestFields, (value, key) => {
        if (_.has(availableFields, key)) {
            validateFields[key] = availableFields[key]
        }
    });

    return validateFields;
}

/**
 *
 * @param data
 * @returns {Promise<{}>}
 */
async function generateUpdateInfo(data) {
    let updateCriteria = {};

    _.each(data.validateForm, (value, key) => {
        if (_.has(data.reqBody, key)) {
            updateCriteria[key] = data.reqBody[key]
        }
    });

    return updateCriteria;
}




/**
 *
 * @returns {{amd: number, usd: number}}
 */
async function getCurrencyInfo() {
    // let currentDate = moment().format("YYYY-MM-DD");
    //
    // let documentInfo = {};
    // documentInfo.collectionName = "exchangeRate";
    // documentInfo.filterInfo = {"date" : currentDate};
    // documentInfo.projectionInfo = {};
    //
    // return new Promise((resolve, reject) => {
    //     mongoRequests.findDocument(documentInfo)
    //         .then(docInfo => {
    //             if (docInfo !== null) {
    //                 return docInfo.data
    //             }
    //             else {
    //                 return new Promise((resolve, reject) => {
    //                     getDailyRate()
    //                         .then(dailyRateInfo => {
    //                             documentInfo.documentInfo = {
    //                                 date: currentDate,
    //                                 data: dailyRateInfo
    //                             };
    //
    //                             mongoRequests.insertDocument(documentInfo)
    //                                 .then(resolve,reject);
    //
    //                             return dailyRateInfo;
    //                         })
    //                         .then(dailyRateInfo => {
    //                             resolve(dailyRateInfo)
    //                         })
    //                         .catch(reject)
    //                 })
    //             }
    //         })
    //         .then(resolve)
    //         .catch(reject)
    // });

}

/**
 *
 * @returns {Promise<any>}
 */
// async function getDailyRate() {
//     return new Promise((resolve, reject) => {
//         request('http://cb.am/latest.json.php', function (error, response, body) {
//             if (!error && response.statusCode == 200) {
//                 let rateObject = JSON.parse(body);
//
//                 // append AMD info
//                 rateObject["AMD"] = "1";
//
//                 resolve(rateObject);
//             }
//             else {
//                 reject(error)
//             }
//         });
//     });
// }




/**
 *
 * @param data
 * @returns {Promise<any>}
 */
async function calculateFlightDuration(data) {
    // let startDateOffset = moment.tz.zone(data.body.startDateTimeZone).utcOffset(moment(data.body.startDate));
    // let endDateOffset = moment.tz.zone(data.body.endDateTimeZone).utcOffset(moment(data.body.endDate));
    //
    // let startTime = moment.tz(data.body.startDate, "UTC");
    // let startTimeStamp = moment(startTime).format("X");
    //
    // let endTime = moment.tz(data.body.endDate, "UTC");
    // let endTimestamp = moment(endTime).format("X");
    //
    // let startDateTimestamp = startTimeStamp - startDateOffset*60;
    // let endDateTimestamp = endTimestamp - endDateOffset * 60;

    return new Promise((resolve, reject) => {

        // if (startDateTimestamp >= endDateTimestamp) {
        //     reject(errorTexts.incorrectStartEndDate)
        // }
        // else {
        //     let flightDuration = endDateTimestamp - startDateTimestamp;

            let startDateInfo = data.body.startDate.split(" ");
            let endDateInfo = data.body.endDate.split(" ");

            // data.body.duration = flightDuration;
            data.body.dateinfo  = {
                startDate:              startDateInfo[0],
                startTime:              startDateInfo[1],
                endDate:                endDateInfo[0],
                endTime:                endDateInfo[1],
                startDateTime:          data.body.startDate,
                endDateTime:            data.body.endDate,
                // startDateTimeZone:      data.body.startDateTimeZone,
                // endDateTimeZone:        data.body.endDateTimeZone,
                // startDateUtcOffset:     startDateOffset,
                // endDateUtcOffset:       endDateOffset,
                // startTimestamp:         parseInt(startTimeStamp),
                // endTimestamp:           parseInt(endTimestamp),
                // startDateTimeString:    data.body.startDate,
                // endDateTimeString:      data.body.endDate,
                // startDateTimeTimestamp: startDateTimestamp,
                // endDateTimeTimestamp:   endDateTimestamp,
            };

            resolve(data)
        // }

    });

}

/**
 *
 * @param data
 * @returns {Promise<*>}
 */
async function getEditableFields(data) {
    const possibleFields = data.possibleForm;
    const requestFields = data.body;

    let editableFields = {};

    _.each(requestFields, (value, key) => {
        if (_.has(possibleFields, key)) {
            editableFields[key] = possibleFields[key]
        }
    });

    data.editableFields = editableFields;
    return data;
}

/**
 *
 * @param data
 * @returns {Promise<*>}
 */
async function getEditableFieldsValues(data) {
    const editableFields = data.editableFields;
    const requestFields = data.body;

    let editableFieldsValues = {};

    _.each(editableFields, (value, key) => {
        editableFieldsValues[key] = requestFields[key];
    });

    data.editableFieldsValues = editableFieldsValues;
    return data;
}





























async function asyncGetClassPrice(classInfo, data, currency) {
    // for one way
    let priceInfo = {};

    if (travelTypes.oneWay === data.body.travelType) {
        priceInfo['adultPrice'] = parseFloat(classInfo.fareAdult) + parseFloat(classInfo.taxAdult) + parseFloat(classInfo.cat);
        priceInfo['childPrice'] = parseFloat(classInfo.fareChd) + parseFloat(classInfo.taxChd) + parseFloat(classInfo.cat);
        priceInfo['infantPrice'] = parseFloat(classInfo.fareInf);

        // append prices to class
        classInfo = await asyncPrivateAppendPricesToClass(priceInfo, classInfo, data, currency);
    }

    else if (travelTypes.roundTrip === data.body.travelType) {
        // check travel duration
        let flightDuration = await asyncPrivateAppendPricesToClass(priceInfo, classInfo, data, currency);

        if (flightDuration > (15 * 1440)) {
            priceInfo['adultPrice'] = parseFloat(classInfo.fareAdult) + parseFloat(classInfo.taxAdult) + parseFloat(classInfo.cat) + parseFloat(classInfo.surchargeLongRange);
            priceInfo['childPrice'] = parseFloat(classInfo.fareChd) + parseFloat(classInfo.taxChd) + parseFloat(classInfo.cat) + parseFloat(classInfo.surchargeLongRange);
            priceInfo['infantPrice'] = parseFloat(classInfo.fareInf);

            // append prices to class
            classInfo = await asyncPrivateAppendPricesToClass(priceInfo, classInfo, data, currency);
        }
        else if (flightDuration < (3 * 1440)) {
            priceInfo['adultPrice'] = parseFloat(classInfo.fareAdult) + parseFloat(classInfo.taxAdult) + parseFloat(classInfo.cat) + parseFloat(classInfo.surchargeShortRange);
            priceInfo['childPrice'] = parseFloat(classInfo.fareChd) + parseFloat(classInfo.taxChd) + parseFloat(classInfo.cat) + parseFloat(classInfo.surchargeShortRange);
            priceInfo['infantPrice'] = parseFloat(classInfo.fareInf);

            // append prices to class
            classInfo = await asyncPrivateAppendPricesToClass(priceInfo, classInfo, data, currency);
        }
        else {
            priceInfo['adultPrice'] = parseFloat(classInfo.fareAdult) + parseFloat(classInfo.taxAdult) + parseFloat(classInfo.cat);
            priceInfo['childPrice'] = parseFloat(classInfo.fareChd) + parseFloat(classInfo.taxChd) + parseFloat(classInfo.cat);
            priceInfo['infantPrice'] = parseFloat(classInfo.fareInf);

            // append prices to class
            classInfo = await asyncPrivateAppendPricesToClass(priceInfo, classInfo, data, currency);
        }
    }
    else if (travelTypes.multiDestination === data.body.travelType) {
        priceInfo['adultPrice'] = parseFloat(classInfo.fareAdult) + parseFloat(classInfo.taxAdult) + parseFloat(classInfo.cat) + parseFloat(classInfo.surchargeMultiDestination);
        priceInfo['childPrice'] = parseFloat(classInfo.fareChd) + parseFloat(classInfo.taxChd) + parseFloat(classInfo.cat) + parseFloat(classInfo.surchargeMultiDestination);
        priceInfo['infantPrice'] = parseFloat(classInfo.fareInf);

        // append prices to class
        classInfo = await asyncPrivateAppendPricesToClass(priceInfo, classInfo, data, currency);
    }

    return classInfo;

}

async function asyncPrivateAppendPricesToClass(priceInfo, classInfo, data, currency) {
    classInfo.prices = [];

    let priceInfoWithRate = await asyncPrivatePriceInfoWithRate(priceInfo, currency);

    // check passenger types
    if (typeof data.body.passengerTypeAdults !== 'undefined') {
        let adultPriceInfo = {
            eachPrice:                  priceInfoWithRate.adultPrice,
            eachPriceFlightCurrency:    priceInfoWithRate.adultPriceFlightCurrency,
            count:                      data.body.passengerTypeAdults,
            totalPrice:                 Math.round((data.body.passengerTypeAdults * priceInfoWithRate.adultPrice) * 100) /100,
            totalPriceFlightCurrency:   Math.round((data.body.passengerTypeAdults * priceInfoWithRate.adultPriceFlightCurrency) * 100) /100
        };

        classInfo.prices.push({
            adultPriceInfo: adultPriceInfo
        })
    }

    if (typeof data.body.passengerTypeChild !== 'undefined') {
        let childPriceInfo = {
            eachPrice:                  priceInfoWithRate.childPrice,
            eachPriceFlightCurrency:    priceInfoWithRate.childPriceFlightCurrency,
            count:                      data.body.passengerTypeChild,
            totalPrice:                 Math.round((data.body.passengerTypeChild * priceInfoWithRate.childPrice) * 100) /100,
            totalPriceFlightCurrency:   Math.round((data.body.passengerTypeChild * priceInfoWithRate.childPriceFlightCurrency) * 100) /100
        };

        classInfo.prices.push({
            childPriceInfo: childPriceInfo
        })
    }

    if (typeof data.body.passengerTypeInfant !== 'undefined') {
        let infantPrice = {
            eachPrice:                  priceInfoWithRate.infantPrice,
            eachPriceFlightCurrency:    priceInfoWithRate.infantPriceFlightCurrency,
            count:                      data.body.passengerTypeInfant,
            totalPrice:                 Math.round((data.body.passengerTypeInfant * priceInfoWithRate.infantPrice) * 100) / 100,
            totalPriceFlightCurrency:   Math.round((data.body.passengerTypeInfant * priceInfoWithRate.infantPriceFlightCurrency) * 100) / 100,
        };

        classInfo.prices.push({
            infantPrice: infantPrice
        })
    }

    let totalPrices = {
        count: 0,
        totalPrice: 0,
        totalPriceFlightCurrency: 0
    };



    let priceInfoTotal = null;
    for (let i in classInfo.prices) {
        if (undefined !== classInfo.prices[i].adultPriceInfo) {
            priceInfoTotal = classInfo.prices[i].adultPriceInfo;
        }
        else if (undefined !== classInfo.prices[i].childPriceInfo) {
            priceInfoTotal = classInfo.prices[i].childPriceInfo;
        }
        else if (undefined !== classInfo.prices[i].infantPriceInfo) {
            priceInfoTotal = classInfo.prices[i].infantPriceInfo;
        }

        totalPrices.count = totalPrices.count + parseInt(priceInfoTotal['count']);
        totalPrices.totalPrice = Math.round((totalPrices.totalPrice + priceInfoTotal.totalPrice) * 100) / 100;
        totalPrices.totalPriceFlightCurrency = totalPrices.totalPriceFlightCurrency + priceInfoTotal.totalPriceFlightCurrency
    }

    classInfo.pricesTotalInfo = totalPrices;
    classInfo.pricesTotalInfo.date = priceInfoWithRate.date;
    classInfo.pricesTotalInfo.currency = priceInfoWithRate.currency;
    classInfo.pricesTotalInfo.rate = priceInfoWithRate.rate;

    return classInfo;
}

async function asyncGetPnrInfo(pnr) {
    let documentInfo = {};
    documentInfo.collectionName = "preOrders";
    documentInfo.filterInfo = {"pnr": pnr.toString()};
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

async function checkAmount(currency, amount) {
    const currencyInfo = await asyncGetExchangeRateByDate();

    let amountInfo = {};

    switch (currency) {
        case "AMD":
            amountInfo = {
                amount: parseFloat(currencyInfo.data.AMD) * amount,
                currency: "AMD",
                rate: parseFloat(currencyInfo.data.AMD)
            };
            break;
        case "USD":
            amountInfo = {
                amount: parseFloat(currencyInfo.data.USD) * amount,
                currency: "USD",
                rate: parseFloat(currencyInfo.data.USD)
            };
            break;
        case "EUR":
            amountInfo = {
                amount: parseFloat(currencyInfo.data.EUR) * amount,
                currency: "EUR",
                rate: parseFloat(currencyInfo.data.EUR)
            };
            break;
        default: return Promise.reject(errorTexts.amountInfo)
    }

    return amountInfo;
}

async function asyncGetExchangeRateByDate(currentDate) {
    // get -1 day from selected date
    let previousDayTimestamp = moment(currentDate).format("X") - 1440;
    let date = moment.unix(previousDayTimestamp).format("YYYY-MM-DD");

    let documentInfo = {};
    documentInfo.collectionName = "exchangeRate";
    documentInfo.filterInfo = {"date" : date};
    documentInfo.projectionInfo = {};

    return new Promise((resolve, reject) => {
        mongoRequests.findDocument(documentInfo)
            .then(docInfo => {
                if (docInfo !== null) {
                    resolve({
                        date: date,
                        data: docInfo.festaRate
                    });
                }
                else {
                    reject({
                        code: 400,
                        status: "error",
                        message: "Something went wrong: Please try again later. No data about today exchange rate"
                    })
                }
            })
            .catch(reject)
    });

}

async function asyncPrivatePriceInfoWithRate(price, currency) {
    let currentDate = moment().format("YYYY-MM-DD");
    let exchangeRate = await asyncGetExchangeRateByDate(currentDate);

    let localRate = parseFloat(exchangeRate.data[currency]);

    return {
        date: currentDate,
        currency: currency,
        rate: localRate,
        adultPrice:                 Math.round((price.adultPrice * localRate) * 100) / 100,
        adultPriceFlightCurrency:   price.adultPrice,
        childPrice:                 Math.round((price.childPrice * localRate) * 100) / 100,
        childPriceFlightCurrency:   price.childPrice,
        infantPrice:                Math.round((price.infantPrice * localRate) * 100) / 100,
        infantPriceFlightCurrency:  price.infantPrice,
    }
}

async function extend(target) {
    let sources = [].slice.call(arguments, 1);
    sources.forEach(function (source) {
        for (let prop in source) {
            target[prop] = source[prop];
        }
    });

    return target;
}

async function addToLogs(logData) {
    let currentTime = Math.floor(Date.now() / 1000);

    let documentInfo = {};
    documentInfo.collectionName = "logs";
    documentInfo.documentInfo = {
        userId:     logData.userId,
        action:     logData.action,
        oldData:    logData.oldData,
        newData:    logData.newData,
        createdAt:  currentTime,
    };

    return new Promise((resolve, reject) => {
        mongoRequests.insertDocument(documentInfo)
            .then(insertRes => {
                insertRes.insertedCount === 1
                    ? resolve("success")
                    : reject(errorTexts.saveUser)
            })
    });
}

async function checkCommissionAmount(pricesInfo, currency, classInfo) {
    let commissionAmount = 0;
    for (let i in pricesInfo) {
        let priceInfo = pricesInfo[i];

        for (let key in priceInfo) {
            if ("adultPriceInfo" === key) {
                let commissionInfo = await checkAmount(currency, classInfo.chargeFeeAdult);

                commissionAmount = commissionAmount + Math.round((parseFloat(priceInfo[key].count) * parseFloat(commissionInfo.amount)) * 100) / 100;
            }
            else if ("childPriceInfo" === key) {
                let commissionInfo = await checkAmount(currency, classInfo.chargeFeeChild);

                commissionAmount = commissionAmount + Math.round((parseFloat(priceInfo[key].count) * parseFloat(commissionInfo.amount)) * 100) / 100;
            }
            else if ("infantPriceInfo" === key) {
                let commissionInfo = await checkAmount(currency, classInfo.chargeFeeInfant);

                commissionAmount = commissionAmount + Math.round((parseFloat(priceInfo[key].count) * parseFloat(commissionInfo.amount)) * 100) / 100;
            }
        }
    }

    return commissionAmount;
}

async function checkPassengerAge(passengerType, passengerDob, checkDate) {
    let passengerAge = Math.floor(moment(checkDate).diff(moment(passengerDob),'years',true));

    if ("Adults" === passengerType && 12 >= passengerAge) {
        return false
    }
    else if ("Child" === passengerType && 12 < passengerAge) {
        return false
    }
    else if ("Infant" === passengerType && 2 < passengerAge) {
        return false
    }

    return true;
}

module.exports = helper;