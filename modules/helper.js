
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
    generateUpdateInfo
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
    console.log("local-festa.com/user/verify?token="+ data.verificationToken + "&userId="+ data.userId);

    let emailContent = "local-festa.com/user/verify?token="+ data.verificationToken + "&userId="+ data.userId;

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
    // const latinLettersValidate = /^[^-\s][a-zA-Z\s]*[^\s]+$/;
    const latinLettersValidate = /^[a-zA-Z]+[a-zA-Z ]+[a-zA-Z]+$/;
    const emailValidate = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    const passwordValidateLowercase = /^(?=.*[a-z])/;
    const passwordValidateUppercase = /(?=.*[A-Z])/;
    const passwordValidateNumeric = /(?=.*[0-9])/;
    const passwordValidateSpecialCharacter = /(?=.*[!@#$%^&*()])/;
    // const passwordValidateLength = new RegRxp("(?=.{8,})");

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
            // winston('error', errorMessage)

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

module.exports = helper;