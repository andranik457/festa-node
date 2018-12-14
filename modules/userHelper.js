
/**
 * Modoule Dependencies
 */
const _             = require("underscore");
const winston       = require("winston");
const mongoRequests = require("../dbQueries/mongoRequests");
const successTexts  = require("../texts/successTexts");
const errorTexts    = require("../texts/errorTexts");
const ObjectID      = require('mongodb').ObjectID;

const userHelper = {
    asyncGetUserInfoById,
    asyncUseUserBalance
};

/**
 *
 * @param userId
 * @returns {Promise<any>}
 */
async function asyncGetUserInfoById(userId) {
    let documentInfo = {};
    documentInfo.collectionName = "users";
    documentInfo.filterInfo = {userId: userId.toString()};
    documentInfo.projectionInfo = {};

    return new Promise((resolve, reject) => {
        mongoRequests.findDocument(documentInfo)
            .then(docInfo => {
                resolve(docInfo)
            })
            .catch(err => {
                winston('error', err);
                reject(errorTexts.forEnyCase)
            })
    });
}


async function asyncUseUserBalance(userId, amount) {
    // get userInfo by userId
    let userInfo = await asyncGetUserInfoById(userId);

    let getFromBalance = 0;
    let getFromCredit = 0;
    if ((userInfo.balance.currentBalance + userInfo.balance.maxCredit - userInfo.balance.currentCredit) < amount) {
        return {
            code: 400,
            status: "error",
            message: "You don't have enough money"
        }
    }
    else if (amount > userInfo.balance.currentBalance) {
        getFromBalance = userInfo.balance.currentBalance;
        getFromCredit = amount - getFromBalance;
    }
    else {
        getFromBalance = amount;
    }

    let documentInfo = {};
    documentInfo.collectionName = "users";
    documentInfo.filterInfo = {userId: userId};
    documentInfo.updateInfo = {
        $inc: {
            "balance.currentBalance": -getFromBalance,
            "balance.currentCredit": getFromCredit
        }
    };

    return new Promise((resolve, reject) => {
        mongoRequests.updateDocument(documentInfo)
            .then(docInfo => {
                if (1 === docInfo.ok) {
                    resolve({
                        success: 1
                    })
                }
            })
            .catch(err => {
                winston('error', err);
                reject(errorTexts.forEnyCase)
            })
    });
}

module.exports = userHelper;