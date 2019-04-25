
/**
 * Modoule Dependencies
 */

const _                     = require("underscore");
const mongoRequestsFiles    = require("../dbQueries/mongoRequestsFiles");
const successTexts          = require("../texts/successTexts");
const errorTexts            = require("../texts/errorTexts");
const userHelper            = require("../modules/userHelper");
const orderHelper           = require("../modules/orderHelper");
const Helper                = require("../modules/helper");
const moment                = require("moment");

const reportsInfo = {

    async balanceChanges (req) {
        let possibleFields = {
            start: {
                name: "Start Date",
                type: "onlyDate",
                minLength: 5,
                maxLength: 24,
                required: true
            },
            end: {
                name: "End Date",
                type: "onlyDate",
                minLength: 5,
                maxLength: 24,
                required: true
            }
        };

        let data = {
            body: req.body,
            userInfo: req.userInfo,
            agentId: req.params.agentId.toString(),
            possibleForm: possibleFields,
            editableFields: possibleFields,
            editableFieldsValues: req.body
        };

        // check user role
        if ("Admin" !== data.userInfo.role) {
            return Promise.reject(errorTexts.userRole)
        }

        await Helper.validateData(data);

        // get balance changes
        // get user order actions
        let [balanceChanges, ordersInfo] = await Promise.all([
            userHelper.getBalanceChanges(data.agentId, data.body.start, data.body.end),
            orderHelper.getOrdersByAgentIdCreatedDate(data.agentId, data.body.start, data.body.end)
        ]);

        let fullResult = balanceChanges.concat(ordersInfo);

        fullResult = _.sortBy(fullResult, 'createdAt');

        return {
            code: 200,
            message: "User balance changes info",
            result: fullResult
        }
    },

    async ordersFullData (req) {
        let possibleFields = {
            fromTo: {
                name: "From",
                type: "text",
                minLength: 1,
                maxLength: 124
            },
            fromToDate: {
                name: "From Date",
                type: "onlyDate",
                minLength: 5,
                maxLength: 24,
            },
            pnr: {
                name: "Pnr",
                type: "text",
                minLength: 5,
                maxLength: 24,
            },
            ticketNumber: {
                name: "Ticket Number",
                type: "text",
                minLength: 5,
                maxLength: 24,
            },
            ticketStatus: {
                name: "Ticket Status",
                type: "text",
                minLength: 2,
                maxLength: 64,
            },
            className: {
                name: "Class Name",
                type: "text",
                minLength: 1,
                maxLength: 10,
            },
            passengerName: {
                name: "Passenger Name",
                type: "text",
                minLength: 1,
                maxLength: 124,
            },
            passengerSurname: {
                name: "Passenger Surname",
                type: "text",
                minLength: 1,
                maxLength: 124,
            },
            passengerType: {
                name: "Passenger Type",
                type: "text",
                minLength: 1,
                maxLength: 124,
            },
            saleDate: {
                name: "Sale Date",
                type: "onlyDate",
                minLength: 1,
                maxLength: 124,
            },
            agentId: {
                name: "AgentId",
                type: "text",
                minLength: 1,
                maxLength: 124,
            },
            adminId: {
                name: "AdminId",
                type: "text",
                minLength: 1,
                maxLength: 124,
            }
        };

        let data = {
            body: req.body,
            userInfo: req.userInfo,
            possibleForm: possibleFields,
            editableFields: possibleFields,
            editableFieldsValues: req.body
        };

        // check user role
        if ("Admin" !== data.userInfo.role) {
            return Promise.reject(errorTexts.userRole)
        }

        // validate main info
        await Helper.validateData(data);

        // create filter
        let filter = {
            $and: []
        };

        // check start date
        if (undefined !== data.body.pnr) {
            filter.$and.push({pnr: data.body.pnr})
        }

        // check sale date
        if (undefined !== data.body.saleDate) {
            filter.$and.push({createdAt: {$gte: parseInt(moment(data.body.saleDate).format("X"))}});
            filter.$and.push({createdAt: {$lt: parseInt(moment(data.body.saleDate).format("X")) + 86400}})
        }

        // check agentId
        if (undefined !== data.body.agentId) {
            filter.$and.push({agentId: data.body.agentId.toString()});
        }

        // check from | to
        if (undefined !== data.body.fromTo) {
            filter.$and.push({
                $or: [
                    {"travelInfo.departureFlightInfo.from": data.body.fromTo},
                    {"travelInfo.returnFlightInfo.from": data.body.fromTo}
                ]
            })
        }

        // check from | to date
        if (undefined !== data.body.fromToDate) {
            filter.$and.push({
                $or: [
                    {"travelInfo.departureFlightInfo.dateInfo.startDate": data.body.fromToDate},
                    {"travelInfo.returnFlightInfo.dateInfo.startDate": data.body.fromToDate}
                ]
            })
        }

        // class name
        if (undefined !== data.body.className) {
            filter.$and.push({
                $or: [
                    {"travelInfo.departureClassInfo.className": data.body.className},
                    {"travelInfo.returnClassInfo.className": data.body.className}
                ]
            })
        }

        // check ticket number
        if (undefined !== data.body.ticketNumber) {
            filter.$and.push({"passengerInfo.ticketNumber": data.body.ticketNumber})
        }

        // check ticket status
        if (undefined !== data.body.ticketStatus) {
            filter.$and.push({"ticketStatus": data.body.ticketStatus})
        }

        // check passenger name
        if (undefined !== data.body.passengerName) {
            filter.$and.push({"passengerInfo.name": data.body.passengerName})
        }

        // check passenger surname
        if (undefined !== data.body.passengerSurname) {
            filter.$and.push({"passengerInfo.surname": data.body.passengerSurname})
        }

        // check passenger type
        if (undefined !== data.body.passengerType) {
            filter.$and.push({"passengerInfo.passengerType": data.body.passengerType})
        }

        let fullResult = await orderHelper.getOrdersByFilters(filter);

        return {
            code: 200,
            message: "Orders full result depend filter",
            result: fullResult
        }

    }

};

module.exports = reportsInfo;