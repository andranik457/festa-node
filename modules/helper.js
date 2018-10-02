
/**
 * Modoule Dependencies
 */

const _             = require("underscore");
const winston       = require("winston");
const mongoRequests = require("../dbQueries/mongoRequests");
const config        = require("../config/config");
const crypto        = require('crypto');
const jwt           = require("jsonwebtoken");

const helper = {
    getTokenInfo,
    decodeToken,
    getVerificationToken,
    sendVerificationEmail,
    getNewUserId,
    validateData,
    getUserUpdateableFieldsByRole,
    generateValidationFields,
    generateUpdateInfo,
    balanceUpdateInfo,
    useBalanceByAdmin
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
    documentInfo.filter = {"token" : token[1]};

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
function getVerificationToken(data) {
    return new Promise((resolve, reject) => {
        crypto.randomBytes(128, function (err, buffer) {
            if (err) {
                reject("We can't create verification token");
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
function sendVerificationEmail(data) {
    let emailContent = config[process.env.NODE_ENV].httpUrl +"/user/verify?token="+ data.verificationToken + "&userId="+ data.userId;

    let documentInfo = {};
    documentInfo.collectionName = "processesEmail";
    documentInfo.documentInfo = {
        email: data.email,
        content: Buffer.from(emailContent).toString('base64')
    };

    return new Promise((resolve, reject) => {
        mongoRequests.insertDocument(documentInfo)
            .then(insertRes => {
                insertRes.insertedCount === 1 ? resolve(data) : reject("Some error occurred we can't send email to this user!")
            })
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
    documentInfo.filter = {"type" : "users"};
    documentInfo.newValue = {$inc: {sequenceId: 1}};

    return new Promise((resolve, reject) => {
        mongoRequests.updateDocument(documentInfo)
            .then(docCount => {
                data.userId = docCount.value.sequenceId;
                docCount > 0 ? reject("Some error occurred in process to creating new id for user!") : resolve(data)
            })
    });
}

/**
 *
 * @param validationFields
 * @param data
 * @returns {Promise<any>}
 */
function validateData(validationFields, data) {
    // console.log(validationFields, data);

    // const latinLettersValidate = /^[^-\s][a-zA-Z\s]*[^\s]+$/;
    const latinLettersValidate = /^[a-zA-Z]+[a-zA-Z ]+[a-zA-Z]+$/;
    const emailValidate = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    const passwordValidateLowercase = /^(?=.*[a-z])/;
    const passwordValidateUppercase = /(?=.*[A-Z])/;
    const passwordValidateNumeric = /(?=.*[0-9])/;
    const passwordValidateSpecialCharacter = /(?=.*[!@#$%^&*()])/;
    // const passwordValidateLength = new RegRxp("(?=.{8,})");
    const numberValidate = /^[0-9]+$/;
    const phoneNumberValidate = /^[+]+[0-9]+$/;

    let errorMessage = {};

    return new Promise((resolve, reject) => {
        for (let field in validationFields) {

            // Required
            if (validationFields[field].required && (typeof data[field] === "undefined")) {
                errorMessage[field] = validationFields[field].name + " is required!";
                continue;
            }

            // Type
            if (typeof validationFields[field].type !== "undefined") {

                // email
                if ("email" === validationFields[field].type) {
                    if (!emailValidate.test(data[field])) {
                        errorMessage[field] = "Please enter a valid email address."
                        continue;
                    }
                }

                // Password
                if ("password" === validationFields[field].type) {
                    if (!passwordValidateLowercase.test(data[field])) {
                        errorMessage[field] = "Password must contain at least 1 lowercase alphabetical character";
                    }
                    else if (!passwordValidateUppercase.test(data[field])) {
                        errorMessage[field] = "Password must contain at least 1 uppercase alphabetical character";
                    }

                    else if (!passwordValidateNumeric.test(data[field])) {
                        errorMessage[field] = "Password must contain at least 1 numeric character";
                    }
                    else if (!passwordValidateSpecialCharacter.test(data[field])) {
                        errorMessage[field] = "Password must contain at least one special character";
                    }
                }

                if ("phoneNumber" === validationFields[field].type) {
                    if (!phoneNumberValidate.test(data[field])) {
                        errorMessage[field] = validationFields[field].name + " need to start with + and contain ony numbers!";
                    }
                }

                if ("number" === validationFields[field].type) {
                    if (!numberValidate.test(data[field])) {
                        errorMessage[field] = validationFields[field].name + " can contain only numbers";
                    }
                }

            }

            // Min Length
            if (typeof validationFields[field].minLength !== "undefined") {
                if (data[field].length < validationFields[field].minLength) {
                    errorMessage[field] = validationFields[field].name + " need to have at last " + validationFields[field].minLength + " characters.";
                    continue;
                }
            }

            // Max Length
            if (typeof validationFields[field].maxLength !== "undefined") {
                if (data[field].length > validationFields[field].maxLength) {
                    errorMessage[field] = validationFields[field].name + " need to have max " + validationFields[field].maxLength + " characters.";
                    continue;
                }
            }

            // Format
            if (typeof validationFields[field].format !== "undefined") {
                if ("latin" === validationFields[field].format) {
                    if (!latinLettersValidate.test(data[field])) {
                        errorMessage[field] = validationFields[field].name + " can contain only latin letters";
                        continue;
                    }
                }
            }

        }

        if (_.isEmpty(errorMessage)) {
            resolve(errorMessage);
        }
        else {
            // winston.log('error', errorMessage);

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

async function balanceUpdateInfo(data) {
    let payForCredit = 0;
    let payForBalance = 0;

    let balanceInfo = data.userDocInfo.balance;
    let reqInfo = data.body;

    let amountInfo = await checkAmount(reqInfo.currency, reqInfo.amount);

    if (balanceInfo.currentCredit > 0) {
        if (amountInfo.amount > balanceInfo.currentCredit) {
            payForCredit = balanceInfo.currentCredit;
            payForBalance = amountInfo.amount - payForCredit;
        }
        else {
            payForCredit = amountInfo.amount;
        }
    }
    else {
        payForBalance = amountInfo.amount;
    }

    let updateBalanceInfo = {
        currency: amountInfo.currency,
        rate: amountInfo.rate,
        updateInfo: {$inc: {
            "balance.currentBalance": payForBalance,
            "balance.currentCredit": -payForCredit
        }}
    };

    return updateBalanceInfo;
}

async function checkAmount(currency, amount) {
    const currencyInfo = await getCurrencyInfo();

    let amountInfo = {};

    switch (currency) {
        case "AMD":
            amountInfo = {
                amount: currencyInfo.amd * amount,
                currency: "AMD",
                rate: currencyInfo.amd
            };
            break;
        case "USD":
            amountInfo = {
                amount: currencyInfo.usd * amount,
                currency: "USD",
                rate: currencyInfo.usd
            };
            break;
        default: return  null
    }

    return amountInfo;
}

function getCurrencyInfo() {
    return {
        amd: 1,
        usd: 483
    }
}

async function useBalanceByAdmin(data) {
    let getFromCredit = 0;
    let getFromBalance = 0;

    let currentBalance = data.userDocInfo.balance.currentBalance;
    let currentCredit = data.userDocInfo.balance.currentCredit;
    let maxCredit = data.userDocInfo.balance.maxCredit;

    let reqInfo = data.body;

    // get amount by default currency
    let amountInfo = await checkAmount(reqInfo.currency, reqInfo.amount);

    return new Promise((resolve, reject) => {
        if (amountInfo.amount > currentBalance) {
            getFromBalance = currentBalance;

            if ((amountInfo.amount - getFromBalance) > (maxCredit - currentCredit)) {
                reject({
                    code: 400,
                    status: "error",
                    message: "Your request cannot be completed: user balance less than you request!"
                })
            }
            else {
                getFromCredit = amountInfo.amount - getFromBalance;
            }
        }
        else {
            getFromBalance = amountInfo.amount;
        }

        resolve({
            code: 200,
            status: "success",
            info: {
                currency: amountInfo.currency,
                rate: amountInfo.rate,
                updateInfo: {
                    $inc: {
                        "balance.currentBalance": -getFromBalance,
                        "balance.currentCredit": getFromCredit
                    }
                }
            }
        })
    });
}

module.exports = helper;