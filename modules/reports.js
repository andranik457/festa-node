
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
    }

};

module.exports = reportsInfo;