
/**
 * Modoule Dependencies
 */

const _             = require("underscore");
const winston       = require("winston");
const mongoRequests = require("../dbQueries/mongoRequests");
const config        = require("../config/config");
const Helper        = require("../modules/helper");
const crypto        = require('crypto');
const jwt           = require("jsonwebtoken");

const user = {

    /**
     *
     * @param data
     * @param next
     * @returns {Promise<any>}
     */
    insert: data => {
        const regValidation = {
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
            }
        };

        return new Promise((resolve, reject) => {
            Helper.validateData(regValidation, data)
                .then(doc => {
                    return data
                })
                .then(checkIsEmailIsExists)
                .then(Helper.getNewUserId)
                .then(Helper.getVerificationToken)
                .then(saveUser)
                .then(data => {
                    let verificationUrl = "local-festa.com/user/verify?token="+ data.verificationToken + "&userId="+ data.userId;

                    resolve({
                        code: 200,
                        status: "OK",
                        result : {
                            message: "New user successfully added!",
                            verificationUrl: verificationUrl
                        }
                    });
                })
                .catch(error => {
                    reject(error)
                });
        });
    },

    /**
     *
     * @param data
     * @returns {Promise<any>}
     */
    login: data => {
        const loginValidation = {
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
            }
        };

        return new Promise((resolve, reject) => {
            Helper.validateData(loginValidation, data)
                .then(doc => {
                    return data
                })
                .then(loginUser)
                .then(token => {
                    resolve({
                        code: 200,
                        status: "success",
                        result : {
                            token: token
                        }
                    });
                })
                .catch(error => {
                    reject({
                        error
                    })
                });
        });
    },

    /**
     *
     * @param data
     */
    logOut: data => {
        console.log(data);
    },

    /**
     *
     * @param data
     * @returns {Promise<any>}
     */
    edit: data => {
        const reqHeaders = data.headers;
        const reqBody = data.body;

        return new Promise((resolve, reject) => {
            Promise.all([
                Helper.getTokenInfo(reqHeaders.authorization),
                generateEditValidation(reqBody)
            ])
                .then(data => {
                    const dataInfo = {
                        userId: data[0].userId.toString(),
                        validationForm: data[1]
                    };

                    return dataInfo;
                })
                .then(data => {
                    Helper.validateData(data.validationForm, reqBody)
                        .then(doc => {
                            editUser(data, reqBody)
                                .then(doc => {
                                    resolve(doc);
                                })
                                .catch(err => {
                                    reject(err);
                                })
                        })
                        .catch(er => {
                            reject(er);
                        })
                })
                .catch(err => {
                    reject(err)
                });
        });
    },

    /**
     * Verify User
     * @param data
     */
    verifyUser: data => {
        return new Promise((resolve, reject) => {
            verifyUser(data)
                .then(res => {
                    resolve(res)
                })
                .catch(err => {
                    reject(err)
                })
        });
    },

    getUsers: data => {
        const reqHeaders = data.headers;
        const reqBody = data.body;

        return new Promise((resolve, reject) => {
            Helper.getTokenInfo(reqHeaders.authorization)
                .then(res => {
                    if ("admin" !== res.role) {
                        reject({
                            code: 401,
                            status: "error",
                            message: "You don't dave permission to do this action!"
                        });
                    }

                    return reqBody;
                })
                .then(getUsers)
                .then(res => {
                    resolve(res)
                })
                .catch(err => {
                    // winston('error', err);

                    reject({
                        code: 400,
                        status: "error",
                        message: "Ups! Something went wrong :("
                    })
                })
        });
    },

    updateUserByAdmin: data => {
        const reqHeaders = data.headers;
        const reqBody = data.body;
        const userId = data.params.userId.toString();

        return new Promise((resolve, reject) => {
            Helper.getTokenInfo(reqHeaders.authorization)
                .then(res => {
                    if ("admin" !== res.role) {
                        reject({
                            code: 401,
                            status: "error",
                            message: "You don't dave permission to do this action!"
                        });
                    }

                    return res.role;
                })
                .then(Helper.getUserUpdateableFieldsByRole)
                .then(res => Helper.generateValidationFields(res, reqBody))
                .then(validationForm => {
                    return new Promise((resolve, reject) => {
                        Helper.validateData(validationForm, reqBody)
                            .then(res => {
                                resolve({
                                    validateForm: validationForm,
                                    reqBody: reqBody
                                })
                            })
                            .catch(reject)
                    });
                })
                .then(Helper.generateUpdateInfo)
                .then(qwe => {
                    console.log('errrrrrrrrrrrrrrrrr');
                    console.log(qwe);
                })
                .catch(reject)

                // .then(updateUserByAdmin)
                // .then(res => {
                //     resolve(res,'3333333333')
                // })
                // .catch(err => {
                //     winston('error', err);
                //
                //     reject({
                //         code: 400,
                //         status: "error",
                //         message: "Ups! Something went wrong :("
                //     })
                // })
        });
    },

    increaseBalance: data => {
        console.log(data);
    },

    decreaseBalance: data => {
        console.log(data);
    }

};

module.exports = user;

/**
 *
 * @param data
 * @returns {Promise<any>}
 */
function checkIsEmailIsExists(data) {
    let documentInfo = {};
    documentInfo.collectionName = "users";
    documentInfo.filter = {email: data.email};

    return new Promise((resolve, reject) => {
        mongoRequests.countDocuments(documentInfo)
            .then(docCount => {
                docCount > 0
                    ? reject({
                        code: 400,
                        status: "error",
                        message: "Email Address already in use!"
                    })
                    : resolve(data)
            })
    });
}

/**
 *
 * @param data
 * @returns {Promise<any>}
 */
function saveUser(data) {
    let currentTime = Math.floor(Date.now() / 1000);

    const userInfo = {
        userId: data.userId.toString(),
        companyName: data.companyName,
        businessName: data.businessName,
        password: crypto.createHash('sha256').update(data.password + currentTime).digest("hex"),
        salt: currentTime,
        email: data.email,
        vat: data.vat,
        tin: data.tin,
        ceoName: data.ceoName,
        phone: data.phone,
        status: "notVerified",
        role: "user",
        createdAt: currentTime,
        updatedAt: currentTime,
        verificationToken: data.verificationToken
    };

    let documentInfo = {};
    documentInfo.collectionName = "users";
    documentInfo.documentInfo = userInfo;

    return new Promise((resolve, reject) => {
        mongoRequests.insertDocument(documentInfo)
            .then(insertRes => {
                insertRes.insertedCount === 1 ? resolve(userInfo) : reject("Some error occurred we can't save this user!")
            })
    });
}


/**
 *
 * @param data
 * @returns {Promise<any>}
 */
function verifyUser(data) {
    let documentInfo = {};
    documentInfo.collectionName = "users";
    documentInfo.filter = {
        "userId": data.userId.toString(),
        verificationToken: data.token
    };
    documentInfo.newValue = {
        $set: {
            status: "verified",
            updatedAt: Math.floor(Date.now() / 1000)
        },
        $unset: {
            verificationToken: 1
        }
    };

    return new Promise((resolve, reject) => {
        mongoRequests.updateDocument(documentInfo)
            .then(doc => {
                if (doc.value) {
                    resolve({
                        code: 200,
                        status: "success",
                        message: "User successfully verified!"
                    })
                }
                else {
                    reject({
                        code: 400,
                        status: "error",
                        message: "Some error occurred in process to verify user: Please check token and try again!"
                    })
                }
            })
    });

}

/**
 *
 * @param data
 * @returns {Promise<any>}
 */
function loginUser(data) {
    let documentInfo = {};
    documentInfo.collectionName = "users";
    documentInfo.filter = {"email" : data.email};

    return new Promise((resolve, reject) => {
        mongoRequests.findDocument(documentInfo)
            .then(docInfo => {
                if ("approved" !== docInfo.status) {
                    reject({
                        code: 403,
                        status: "error",
                        message: "You can't use this account. You need to get approve from admin."
                    })
                }
                if (docInfo.password === crypto.createHash('sha256').update(data.password + docInfo.salt).digest("hex")) {
                    let token = jwt.sign({
                        userId: docInfo.userId,
                        role: docInfo.role
                    }, config[process.env.NODE_ENV].jwtSecret);

                    documentInfo.newValue = {$set: {token: token}};
                    mongoRequests.updateDocument(documentInfo);

                    resolve(token);
                }
                else {
                    reject({
                        code: 400,
                        status: "error",
                        message: "Email/Password is incorrect!"
                    })
                }
            })
    });
}


/**
 *
 * @param data
 * @param reqBody
 * @returns {Promise<any>}
 */
function editUser(data, reqBody) {
    let documentInfo = {};
    documentInfo.collectionName = "users";
    documentInfo.filter = {"userId" : data.userId};

    let newData = {};

    return new Promise((resolve, reject) => {
        for (key in data.validationForm) {
            newData[key] = reqBody[key]
        }

        documentInfo.newValue = {$set: newData};

        mongoRequests.updateDocument(documentInfo)
            .then(doc => {
                resolve({
                    code: 200,
                    status: "success",
                    message: "UserInfo successfully updated!"
                })
            })
            .catch(err => {
                reject({
                    code: 400,
                    status: "error",
                    message: "Ups: Something went wrong:("
                })
            })
    });
}

/**
 *
 * @param reqBody
 * @returns {Promise<any>}
 */
function generateEditValidation(reqBody) {
    let validateForm = {};

    return new Promise((resolve, reject) => {
        for (i in reqBody) {
            switch(i) {
                case "companyName":
                    validateForm.companyName = {
                        name: "Company Name",
                        type: "text",
                        format: "latin",
                        minLength: 3,
                        maxLength: 64,
                        required: true
                    };
                    break;
                case "businessName":
                    validateForm.businessName = {
                        name: "Business Name",
                        type: "text",
                        format: "latin",
                        minLength: 3,
                        maxLength: 64,
                        required: true
                    };
                    break;
                case "vat":
                    validateForm.vat = {
                        name: "VAT",
                        type: "text",
                        format: "latin",
                        minLength: 3,
                        maxLength: 64,
                        required: true
                    };
                    break;
                case "tin":
                    validateForm.tin = {
                        name: "TIN",
                        type: "text",
                        format: "latin",
                        minLength: 3,
                        maxLength: 64,
                        required: true
                    };
                    break;
                case "ceoName":
                    validateForm.ceoName = {
                        name: "CEO Name",
                        type: "text",
                        format: "latin",
                        minLength: 3,
                        maxLength: 64,
                        required: true
                    };
                    break;
                case "phone":
                    validateForm.phone = {
                        name: "Phone Number",
                        type: "text",
                        minLength: 3,
                        length: 64,
                        required: true
                    };
                    break;
                case "status":
                    validateForm.status = {
                        name: "User Status",
                        type: "text",
                        minLength: 3,
                        length: 64,
                        required: true
                    };
                    break;
            }
        }

        if (_.isEmpty(validateForm)) {
            reject({
                code: 400,
                status: "error",
                message: "Ups: Something went wrong:("
            });
        }
        else {
            resolve(validateForm);
        }
    });
}

/**
 *
 * @param filter
 * @returns {Promise<any>}
 */
function getUsers(filter) {
    let documentInfo = {};
    documentInfo.collectionName = "users";
    documentInfo.filter = filter;
    documentInfo.option = {
        lean : true,
        sort : {
            createdAt : -1
        }
    };
    documentInfo.projection = {
        _id: 0,
        userId: 1,
        companyName: 1,
        businessName: 1,
        email: 1,
        vat: 1,
        tin: 1,
        ceoName: 1,
        phone: 1,
        status: 1,
        role: 1,
        createdAt: 1
    };

    return new Promise((resolve, reject) => {
        mongoRequests.findDocuments(documentInfo)
            .then(doc => {
                resolve({
                    code: 200,
                    status: "success",
                    result: {
                        users: doc
                    }
                })
            })
            .catch(err => {
                winston('error', err);

                reject({
                    code: 400,
                    status: "error",
                    message: "Ups: Something went wrong:("
                })
            })
    });
}

/**
 *
 * @param body
 */
function updateUserByAdmin(body) {
    console.log(body);
}