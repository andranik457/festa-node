
/**
 * Modoule Dependencies
 */

const _             = require("underscore");
const winston       = require("winston");
const ObjectID      = require('mongodb').ObjectID;
const moment        = require("moment");
const mongoRequests = require("../dbQueries/mongoRequests");
const Helper        = require("../modules/helper");
const FlightHelper  = require("../modules/flightHelper");
const flightFunc    = require("../modules/flight");
const classFunc     = require("../modules/class");
const userFunc      = require("../modules/user");
const userHelper    = require("../modules/userHelper");
const classHelper   = require("../modules/classHelper");
const orderHelper   = require("../modules/orderHelper");
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
            return Promise.reject(errorTexts.incorrectTravelType)
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
            },
            contactPersonFullName: {
                name: "Contact Person Full name",
                type: "text",
                minLength: 3,
                maxLength: 128,
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
                maxLength: 2048,
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

        // check payment status
        let paymentStatus = null;
        if ("Ticketing" === req.body.ticketStatus) {
            paymentStatus = "Paid";
        }
        else if ("Booking" === req.body.ticketStatus) {
            paymentStatus = "Unpaid";
        }
        else {
            return Promise.reject({
                code: 400,
                status: "error",
                message: "Please check ticket status and tyr again!"
            })
        }

        // check and validate passenger info
        let passengersInfo = JSON.parse(Buffer.from(req.body.passengersInfo, 'base64').toString('utf8'));

        let passengerInfo = [];
        for (let i in passengersInfo) {
            let ticketNumber = await Helper.getNewTicketNumber();

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

                passengersInfo[i].ticketNumber = ticketNumber;
                passengerInfo.push(passengersInfo[i]);
            }
        }

        // check pnr
        let pnrInfo = await Helper.asyncGetPnrInfo(req.body.pnr);

        // check ticket value
        if (!(req.body.ticketStatus === "Booking" || req.body.ticketStatus === "Ticketing")) {
            return errorTexts.incorrectTicketValue
        }

        // check Agent Info
        let agentInfo = await userHelper.asyncGetUserInfoById(req.body.agentId);
        if (null === agentInfo) {
            return Promise.reject({
                code: 400,
                status: "error",
                message: "User with this id dos't exists!"
            })
        }
        else if ("approved" !== agentInfo.status) {
            return Promise.reject({
                code: 400,
                status: "error",
                message: "You can't make this action. Check user status (only for approved users)"
            })
        }

        let ticketFullPrice = {};
        if (undefined !== pnrInfo.returnClassInfo) {
            ticketFullPrice.total = pnrInfo.departureClassInfo.pricesTotalInfo.totalPrice + pnrInfo.returnClassInfo.pricesTotalInfo.totalPrice;
            ticketFullPrice.totalFlightCurrency = pnrInfo.departureClassInfo.pricesTotalInfo.totalPriceFlightCurrency + pnrInfo.returnClassInfo.pricesTotalInfo.totalPriceFlightCurrency;
            ticketFullPrice.currency = pnrInfo.departureClassInfo.pricesTotalInfo.currency
        }
        else {
            ticketFullPrice.total = pnrInfo.departureClassInfo.pricesTotalInfo.totalPrice;
            ticketFullPrice.totalFlightCurrency = pnrInfo.departureClassInfo.pricesTotalInfo.totalPriceFlightCurrency;
            ticketFullPrice.currency = pnrInfo.departureClassInfo.pricesTotalInfo.currency
        }

        // create final order
        let currentDate = Math.floor(Date.now() / 1000);

        let orderInfo = {
            pnr:                    req.body.pnr,
            agentId:                req.body.agentId,
            paymentStatus:          req.body.paymentStatus,
            travelInfo:             pnrInfo,
            ticketStatus:           req.body.ticketStatus,
            ticketPrice:            ticketFullPrice,
            comment:                req.body.comment || "",
            contactPersonInfo:      {
                fullName:  req.body.contactPersonFullName,
                email:     req.body.contactPersonEmail,
                telephone: req.body.contactPersonTelephone,
            },
            passengerInfo: passengerInfo,
            updatedAt: currentDate,
            createdAt: currentDate
        };

        // in case if ticket status is ticketing
        //
        // 1. save order
        // 2. - from userBalance
        // 3. - from onHoldPlayces
        // 4. remove onHold document
        //
        // 5. remove from pre orders

        // for booking can hold in preOrders ???

        let canContinue = true;
        if ("Ticketing" === req.body.ticketStatus) {
            let userBalance = await userHelper.asyncUseUserBalance(req.body.agentId, ticketFullPrice.total);

            if (1 !== userBalance.success) {
                canContinue = false;
            }
        }

        if (canContinue) {
            let order = await saveOrder(orderInfo);

            if (1 === order.success) {
                if (undefined !== pnrInfo.returnClassInfo) {
                    await classHelper.asyncUsePlaces(pnrInfo.returnClassInfo._id, pnrInfo.returnClassInfo.pricesTotalInfo.count)
                }

                await Promise.all([
                    classHelper.asyncUsePlaces(pnrInfo.departureClassInfo._id, pnrInfo.departureClassInfo.pricesTotalInfo.count),
                    classHelper.asyncRemoveOnHoldPlaces(pnrInfo.pnr),
                    orderHelper.removePreOrdersByPnr(pnrInfo.pnr)
                ]);

                return Promise.resolve({
                    code: 200,
                    status: "Success",
                    message: "",
                    data: orderInfo
                });
            }
            else {
                return Promise.reject(order);
            }
        }
        else {
            return Promise.reject(userBalance);
        }
    },

    async getOrders (req) {
        let possibleFields = {
            ticketStatus: {
                name: "Ticket Status",
                type: "text",
                minLength: 5,
                maxLength: 24,
            },
            agentId: {
                name: "AgentId",
                type: "text",
                minLength: 5,
                maxLength: 24,
            }
        };

        let data = {
            body: req.body,
            userInfo: req.userInfo,
            possibleForm: possibleFields,
            editableFields: possibleFields,
            editableFieldsValues: req.body
        };

        await Helper.validateData(data);

        let orders = await getOrdersInfo(data);

        return Promise.resolve({
            code: 200,
            status: "Success",
            message: "",
            data: orders
        });
    },

    async getOrderByPnr (req) {
        let data = {
            body: req.body,
            userInfo: req.userInfo,
            pnr: req.params.pnr.toString()
        };

        let orderInfo = await getOrderInfo(data);

        return Promise.resolve({
            code: 200,
            status: "Success",
            message: "",
            data: orderInfo
        });
    },

    async editOrder (req) {

        let possibleFields = {};

        let data = {
            body: req.body,
            userInfo: req.userInfo,
            editableFieldsValues: req.body,
            pnr: req.params.pnr.toString()
        };

        // get order by pnr
        let orderInfo = await getOrderInfo(data);
        if (null === orderInfo) {
            return Promise.reject(errorTexts.pnrNotFound)
        }

        // check user role
        if ("Admin" === data.userInfo.role) {
            possibleFields = {
                comment: {
                    name: "Comment",
                    type: "text",
                    minLength: 1,
                    maxLength: 128,
                },
                contactPersonFullName: {
                    name: "Contact Person Full name",
                    type: "text",
                    minLength: 3,
                    maxLength: 128,
                },
                contactPersonEmail: {
                    name: "Contact Person email",
                    type: "email",
                    minLength: 3,
                    maxLength: 64,
                },
                contactPersonTelephone: {
                    name: "Contact Person telephone",
                    type: "telephone",
                    minLength: 3,
                    maxLength: 64,
                },
                passengersInfo: {
                    name: "Passengers Info",
                    type: "text",
                    minLength: 3,
                    maxLength: 2048,
                }
            };
            data.possibleForm = possibleFields;

            // get editable fields
            await Helper.getEditableFields(data);

            // get editable fields values
            await Helper.getEditableFieldsValues(data);

            // validate main info
            await Helper.validateData(data);

            let currentTime = Math.floor(Date.now() / 1000);

            let updateInfo = {};
            updateInfo.updatedAt = currentTime;

            // generate update object
            for (let i in data.editableFieldsValues) {
                if ("contactPersonFullName" === i) {
                    updateInfo['contactPersonInfo.fullName'] = data.editableFieldsValues[i]
                }
                else if ("contactPersonEmail" === i) {
                    updateInfo['contactPersonInfo.email'] = data.editableFieldsValues[i]
                }
                else if ("contactPersonTelephone" === i) {
                    updateInfo['contactPersonInfo.telephone'] = data.editableFieldsValues[i]
                }
            }

            // check passengers info
            if (_.has(data.body, "passengersInfo")) {
                let passengersInfo = JSON.parse(Buffer.from(data.body.passengersInfo, 'base64').toString('utf8'));

                let passengerInfo = [];
                for (let i in passengersInfo) {
                    let passengerValidateInfo = await createValidateFormDependPassengerType(passengersInfo[i]);

                    if (_.has(passengerValidateInfo, "code")) {
                        return passengerValidateInfo;
                    }
                    else {
                        possibleFields = passengerValidateInfo;
                        possibleFields.ticketNumber = {
                            name: "Ticket Number",
                            type: "text",
                            minLength: 12,
                            maxLength: 12,
                            required: true
                        };

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

                updateInfo.passengerInfo = passengerInfo
            }


            // update order
            let documentInfo = {};
            documentInfo.collectionName = "orders";
            documentInfo.filterInfo = {pnr: data.pnr};
            documentInfo.updateInfo = {'$set': updateInfo};

            return new Promise((resolve, reject) => {
                mongoRequests.updateDocument(documentInfo)
                    .then(updateRes => {
                        if (updateRes.lastErrorObject.n > 0) {
                            resolve({
                                code: 200,
                                status: "success",
                                message: "You successfully updated order info"
                            })
                        }
                        else {
                            reject(errorTexts.pnrNotFound)
                        }
                    })
            });

        }
        else  if ("user" === data.userInfo.role) {
            possibleFields = {
                comment: {
                    name: "Comment",
                    type: "text",
                    minLength: 1,
                    maxLength: 128,
                },
                contactPersonFullName: {
                    name: "Contact Person Full name",
                    type: "text",
                    minLength: 3,
                    maxLength: 128,
                },
                contactPersonEmail: {
                    name: "Contact Person email",
                    type: "email",
                    minLength: 3,
                    maxLength: 64,
                },
                contactPersonTelephone: {
                    name: "Contact Person telephone",
                    type: "telephone",
                    minLength: 3,
                    maxLength: 64,
                }
            };
            data.possibleForm = possibleFields;

            // get editable fields
            await Helper.getEditableFields(data);

            // get editable fields values
            await Helper.getEditableFieldsValues(data);

            // validate main info
            await Helper.validateData(data);

            let currentTime = Math.floor(Date.now() / 1000);

            let updateInfo = {};
            updateInfo.updatedAt = currentTime;

            // generate update object
            for (let i in data.editableFieldsValues) {
                if ("contactPersonFullName" === i) {
                    updateInfo['contactPersonInfo.fullName'] = data.editableFieldsValues[i]
                }
                else if ("contactPersonEmail" === i) {
                    updateInfo['contactPersonInfo.email'] = data.editableFieldsValues[i]
                }
                else if ("contactPersonTelephone" === i) {
                    updateInfo['contactPersonInfo.telephone'] = data.editableFieldsValues[i]
                }
            }

            // update order
            let documentInfo = {};
            documentInfo.collectionName = "orders";
            documentInfo.filterInfo = {pnr: data.pnr};
            documentInfo.updateInfo = {'$set': updateInfo};

            return new Promise((resolve, reject) => {
                mongoRequests.updateDocument(documentInfo)
                    .then(updateRes => {
                        if (updateRes.lastErrorObject.n > 0) {
                            resolve({
                                code: 200,
                                status: "success",
                                message: "You successfully updated order info"
                            })
                        }
                        else {
                            reject(errorTexts.pnrNotFound)
                        }
                    })
            });
        }
        else {
            return Promise.reject(errorTexts.userRole)
        }

    },

    async cancelOrder (req) {
        let currentTime = Math.floor(Date.now() / 1000);

        let possibleFields = {
            commission: {
                name: "Commission",
                type: "float",
                minLength: 1,
                maxLength: 10,
                required: true
            },
        };

        let data = {
            body: req.body,
            userInfo: req.userInfo,
            editableFields: possibleFields,
            editableFieldsValues: req.body,
            pnr: req.params.pnr.toString()
        };

        // validate data
        await Helper.validateData(data);

        // get order by pnr
        let orderInfo = await getOrderInfo(data);
        if (null === orderInfo) {
            return Promise.reject(errorTexts.pnrNotFound)
        }

        // log data
        let logData = {
            userId: data.userInfo.userId,
            action: "Cancel Order",
            oldData: orderInfo,
            newData: "Ticket Status: Canceled"
        };

        // check order status
        if ("Ticketing" === orderInfo.ticketStatus) {

            // check user role
            if ("Admin" !== data.userInfo.role) {
                return Promise.reject(errorTexts.userRole)
            }

            // increase balance
            let increaseInfo = {};
            increaseInfo.body = {
                currency: "AMD",
                amount: orderInfo.ticketPrice.total,
                description: "cancel order"
            };
            increaseInfo.userInfo = req.userInfo;
            increaseInfo.params = {};
            increaseInfo.params.userId = orderInfo.agentId;

            // 1. add price to user balance
            // 2. update orderStatus
            // 3. return seats to departure class
            // 4. return seats to return class | if set
            // 5. add info to log

            // add price to user balance
            let balanceUpdateInfo = await userFunc.increaseBalance(increaseInfo);
            if (200 === balanceUpdateInfo.code) {
                // cancel order
                let updateOrderInfo = await makeOrderCanceled(data.pnr);
                if (200 === updateOrderInfo.code) {
                    // add departure seats to corresponding class
                    let departureClassSeatsInfo = await classHelper.increaseAvailableSeatsCount(orderInfo.travelInfo.departureClassInfo._id, orderInfo.travelInfo.departureClassInfo.pricesTotalInfo.count);
                    if (200 === departureClassSeatsInfo.code) {
                        if (undefined !== orderInfo.travelInfo.returnClassInfo) {
                            await classHelper.increaseAvailableSeatsCount(orderInfo.travelInfo.returnClassInfo._id, orderInfo.travelInfo.returnClassInfo.pricesTotalInfo.count)
                        }

                        let logsResult = await Helper.addToLogs(logData);
                        if ("success" === logsResult) {
                            return Promise.resolve({
                                code: 200,
                                status: "success",
                                message: "You successfully canceled order"
                            })
                        }
                        else {
                            return Promise.reject(logsResult)
                        }
                    }
                    else {
                        return Promise.reject(departureClassSeatsInfo)
                    }
                }
                else {
                    return Promise.reject(updateOrderInfo)
                }
            }
            else {
                return Promise.reject(balanceUpdateInfo)
            }
        }
        else if ("Booking" === orderInfo.ticketStatus) {
            // 1. update orderStatus
            // 2. remove onHold seats for departure class
            // 3. remove onHold seats for return class | if set
            // 4. add info to log

            let updateOrderInfo = await makeOrderCanceled(data.pnr);
            if (200 === updateOrderInfo.code) {
                let onHoldSeatsInfo = await classHelper.asyncRemoveOnHoldPlaces(data.pnr)
                if (1 === onHoldSeatsInfo.success) {
                    let logsResult = await Helper.addToLogs(logData);
                    if ("success" === logsResult) {
                        return Promise.resolve({
                            code: 200,
                            status: "success",
                            message: "You successfully canceled order"
                        })
                    }
                    else {
                        return Promise.reject(logsResult)
                    }
                }
                else {
                    return Promise.reject(errorTexts.onHoldSeats)
                }
            }
            else {
                return Promise.reject(updateOrderInfo)
            }
        }
        else {
            return Promise.reject(errorTexts.incorrectOrderStatus)
        }

    },

    async refundOrder (req) {
        let data = {
            body: req.body,
            userInfo: req.userInfo,
            pnr: req.params.pnr.toString()
        };

        // check user role
        if ("Admin" !== data.userInfo.role) {
            return Promise.reject(errorTexts.userRole)
        }

        // get order info by :pnr
        let orderInfo = await getOrderInfo(data);
        if (null === orderInfo) {
            return Promise.reject(errorTexts.pnrNotFound)
        }
        else if ("Ticketing" !== orderInfo.ticketStatus) {
            return Promise.reject(errorTexts.ticketingStatus)
        }

        // check commissions for classes
        let commissionAmount = 0;
        let departureCommissionAmount = await Helper.checkCommissionAmount(orderInfo.travelInfo.departureClassInfo.prices, orderInfo.travelInfo.departureClassInfo.currency, orderInfo.travelInfo.departureClassInfo);
        commissionAmount = commissionAmount + departureCommissionAmount;

        if (undefined !== orderInfo.travelInfo.returnClassInfo) {
            let returnCommissionAmount = await Helper.checkCommissionAmount(orderInfo.travelInfo.returnClassInfo.prices, orderInfo.travelInfo.returnClassInfo.currency, orderInfo.travelInfo.returnClassInfo);
            commissionAmount = commissionAmount + returnCommissionAmount;
        }

        let refundAmount = Math.round((orderInfo.ticketPrice.total - commissionAmount) * 100) / 100;

        // 1. add commission amount to admin balance
        // 2. add refund amount to agent balance
        // 3. change order status
        // 4. add seats to corresponding classes
        // 5. add to log

        // refund document info
        let refundInfo = {};
        refundInfo.body = {
            currency: "AMD",
            amount: refundAmount,
            description: "order refund"
        };
        refundInfo.userInfo = req.userInfo;
        refundInfo.params = {};
        refundInfo.params.userId = orderInfo.agentId;

        // commission document info
        let commissionInfo = {};
        commissionInfo.body = {
            currency: "AMD",
            amount: commissionAmount,
            description: "order refund / commission"
        };
        commissionInfo.userInfo = req.userInfo;
        commissionInfo.params = {};
        commissionInfo.params.userId = req.userInfo.userId;

        // log data
        let logData = {
            userId: data.userInfo.userId,
            action: "Refund Order",
            oldData: orderInfo,
            newData: "Ticket Status: Refund"
        };

        // add refund price to agent balance
        let refundUpdateInfo = await userFunc.increaseBalance(refundInfo);
        if (200 === refundUpdateInfo.code) {
            // add commission to admin balance
            let commissionUpdateInfo = await userFunc.increaseBalance(commissionInfo);
            if (200 === commissionUpdateInfo.code) {
                // cancel order
                let updateOrderInfo = await makeOrderRefunded(orderInfo.pnr);
                if (200 === updateOrderInfo.code) {
                    // add departure seats to corresponding class
                    let departureClassSeatsInfo = await classHelper.increaseAvailableSeatsCount(orderInfo.travelInfo.departureClassInfo._id, orderInfo.travelInfo.departureClassInfo.pricesTotalInfo.count);
                    if (200 === departureClassSeatsInfo.code) {
                        if (undefined !== orderInfo.travelInfo.returnClassInfo) {
                            await classHelper.increaseAvailableSeatsCount(orderInfo.travelInfo.returnClassInfo._id, orderInfo.travelInfo.returnClassInfo.pricesTotalInfo.count)
                        }

                        let logsResult = await Helper.addToLogs(logData);
                        if ("success" === logsResult) {
                            return Promise.resolve({
                                code: 200,
                                status: "success",
                                message: "You successfully refund order"
                            })
                        }
                        else {
                            return Promise.reject(logsResult)
                        }
                    }
                }
                else {
                    return Promise.reject(updateOrderInfo)
                }
            }
            else {
                return Promise.reject(commissionUpdateInfo)
            }
        }
        else {
            return Promise.reject(refundUpdateInfo)
        }
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
            dob: {
                name: "Date of birth",
                type: "onlyDate",
                minLength: 4,
                maxLength: 24,
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
            dob: {
                name: "Date of birth",
                type: "onlyDate",
                minLength: 4,
                maxLength: 24,
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

    let classPriceInfo = await Helper.asyncGetClassPrice(classInfo.data, data, flightInfo.data.currency);

    return {
        travelType:             travelTypes.oneWay,
        departureFlightInfo:    flightInfo.data,
        departureClassInfo:     classPriceInfo
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

    let departureClassPriceInfo = await Helper.asyncGetClassPrice(departureClassInfo.data, data, departureFlightInfo.data.currency);
    let returnClassPriceInfo = await Helper.asyncGetClassPrice(returnClassInfo.data, data, returnFlightInfo.data.currency);

    if (departureFlightInfo.data.airline !== returnFlightInfo.data.airline) {
        return Promise.reject(errorTexts.differentAirlines)
    }
    else {
        return {
            travelType:             data.body.travelType,
            departureFlightInfo:    departureFlightInfo.data,
            departureClassInfo:     departureClassPriceInfo,
            returnFlightInfo:       returnFlightInfo.data,
            returnClassInfo:        returnClassPriceInfo
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

        let pnr = await Helper.getNewPnrId();

        // add data to on hold
        await addPlacesToOnHold(pnr, data.tripInfo.departureClassInfo, data.passengersCount);

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

        // get new PNR
        let pnr = await Helper.getNewPnrId();

        // add data to on hold
        await Promise.all([
            addPlacesToOnHold(pnr, data.tripInfo.departureClassInfo, data.passengersCount),
            addPlacesToOnHold(pnr, data.tripInfo.returnClassInfo, data.passengersCount)
        ]);

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
async function addPlacesToOnHold(pnr, classInfo, placesCount) {
    let currentDate = Math.floor(Date.now() / 1000);

    let documentInfo = {};
    documentInfo.collectionName = "onHold";
    documentInfo.documentInfo = {
        pnr: pnr,
        classId: classInfo._id.toString(),
        count: placesCount,
        createdAt: currentDate
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

/**
 *
 * @param orderInfo
 * @returns {Promise<any>}
 */
async function saveOrder(orderInfo) {
    let documentInfo = {};
    documentInfo.collectionName = "orders";
    documentInfo.documentInfo = orderInfo;

    return new Promise((resolve, reject) => {
        mongoRequests.insertDocument(documentInfo)
            .then(docInfo => {
                if (1 === docInfo.result.ok) {
                    resolve({
                        success: 1
                    })
                }
                else {
                    reject({
                        error: "something went wrong"
                    })
                }
            })
            .catch(err => {
                reject(err)
            })
    });
}

/**
 *
 * @param data
 * @returns {Promise<any>}
 */
async function getOrdersInfo(data) {
    let ordersFilter = {
        deletedAt: {
            $exists: false
        }
    };

    if (data.body.ticketStatus !== undefined)  {
        ordersFilter.ticketStatus = data.body.ticketStatus;
    }

    if ("Admin" === data.userInfo.role) {
        if (data.body.agentId !== undefined)  {
            ordersFilter.agentId = data.body.agentId.toString();
        }
    }
    else {
        ordersFilter.agentId = data.userInfo.userId.toString();
    }


    let documentInfo = {};
    documentInfo.collectionName = "orders";
    documentInfo.filterInfo = ordersFilter;
    documentInfo.projectionInfo = {};
    documentInfo.optionInfo = {
        sort: {
            createdAt: -1
        }
    };

    return new Promise((resolve, reject) => {
        mongoRequests.findDocuments(documentInfo)
            .then(documents => {
                resolve(documents)
            })
            .catch(err => {
                reject(err)
            })
    });
}

/**
 *
 * @param data
 * @returns {Promise<any>}
 */
async function getOrderInfo(data) {
    let orderFilter = {};
    if ("Admin" !== data.userInfo.role) {
        orderFilter.agentId = data.userInfo.userId.toString();
    }
    orderFilter.pnr = data.pnr;

    let documentInfo = {};
    documentInfo.collectionName = "orders";
    documentInfo.filterInfo = orderFilter;
    documentInfo.projectionInfo = {};
    documentInfo.optionInfo = {};

    return new Promise((resolve, reject) => {
        mongoRequests.findDocument(documentInfo)
            .then(document => {
                resolve(document)
            })
            .catch(err => {
                reject(err)
            })
    });
}

/**
 *
 * @param pnr
 * @returns {Promise<any>}
 */
async function makeOrderCanceled(pnr) {
    let documentInfo = {};
    documentInfo.collectionName = "orders";
    documentInfo.filterInfo = {
        'pnr': pnr
    };
    documentInfo.updateInfo = {
        '$set': {
            "ticketStatus": "Canceled"
        }
    };

    return new Promise((resolve, reject) => {
        mongoRequests.updateDocument(documentInfo)
            .then(updateRes => {
                if (updateRes.lastErrorObject.n > 0) {
                    resolve({
                        code: 200,
                        status: "success",
                        message: "You successfully updated order status"
                    })
                }
                else {
                    reject(errorTexts.pnrNotFound)
                }
            })
    });
}

async function makeOrderRefunded(pnr) {
    let documentInfo = {};
    documentInfo.collectionName = "orders";
    documentInfo.filterInfo = {
        'pnr': pnr
    };
    documentInfo.updateInfo = {
        '$set': {
            "ticketStatus": "Refunded"
        }
    };

    return new Promise((resolve, reject) => {
        mongoRequests.updateDocument(documentInfo)
            .then(updateRes => {
                if (updateRes.lastErrorObject.n > 0) {
                    resolve({
                        code: 200,
                        status: "success",
                        message: "You successfully updated order status"
                    })
                }
                else {
                    reject(errorTexts.pnrNotFound)
                }
            })
    });
}