
/**
 * Modoule Dependencies
 */

const _             = require("underscore");
const winston       = require("winston");
const mongoRequests = require("../dbQueries/mongoRequests");
const config        = require("../config/config");
const Helper        = require("./helper");
const crypto        = require('crypto');
const jwt           = require("jsonwebtoken");
const successTexts  = require("../texts/successTexts");
const errorTexts    = require("../texts/errorTexts");

const user = {

    /**
     *
     * @param req
     * @returns {Promise<any>}
     */
    insert: req => {
        const possibleForm = {
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
                type: "number",
                minLength: 3,
                maxLength: 64,
                required: true
            },
            tin: {
                name: "TIN",
                type: "number",
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
                type: "phoneNumber",
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
            country: {
                name: "Country",
                type: "text",
                minLength: 3,
                length: 64,
                required: true
            },
            city: {
                name: "City",
                type: "text",
                minLength: 3,
                length: 64,
                required: true
            }
        };

        let data = {
            body: req.body,
            editableFields: possibleForm,
            editableFieldsValues: req.body
        };

        return new Promise((resolve, reject) => {
            if (undefined === data.body) {
                reject({
                    code: 400,
                    status: "error",
                    message: "Please check request and try again!"
                })
            }

            Helper.validateData(data)
                .then(checkIsEmailIsExists)
                .then(Helper.getNewUserId)
                .then(Helper.getVerificationToken)
                .then(saveUser)
                .then(data => {
                    let verificationUrl = config[process.env.NODE_ENV].httpUrl +"/user/verify?token="+ data.verificationToken + "&userId="+ data.userId;

                    resolve({
                        code: 200,
                        status: "OK",
                        message: "New user successfully added!",
                        result : {
                            verificationUrl: verificationUrl
                        }
                    });
                })
                .catch(reject);
        });
    },

    /**
     *
     * @param req
     * @returns {Promise<any>}
     */
    login: req => {
        const loginFields = {
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

        let data = {
            body: req.body,
            editableFields: loginFields,
            editableFieldsValues: req.body
        };

        return new Promise((resolve, reject) => {
            Helper.validateData(data)
                .then(loginUser)
                .then(data => {
                    resolve({
                        code: 200,
                        status: "success",
                        result : {
                            token: data.token,
                            userId: data.userId
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
     * @param req
     * @returns {Promise<any>}
     */
    logOut: req => {
        let data = {
            userInfo: req.userInfo
        };

        return new Promise((resolve, reject) => {
            unsetUserToken(data)
                .then(resolve)
                .catch(reject)
        })
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

    getUserByUserId: req => {
        let data = {
            userId: req.params.userId.toString(),
        };

        return new Promise((resolve, reject) => {
            // if ("Admin" !== data.userInfo.role) {
            //     reject(errorTexts.userRole)
            // }

            getUserById(data)
                .then(data => {
                    // if (userDocInfo.token !== req) {
                    //
                    // }
                    delete data.userDocInfo["_id"]
                    delete data.userDocInfo["password"]
                    delete data.userDocInfo["token"]

                    resolve({
                        code: 200,
                        status: "success",
                        result: data.userDocInfo
                    })
                })
                .catch(reject)
        });
    },

    /**
     *
     * @param data
     * @returns {Promise<any>}
     */
    getUsers: req => {
        console.log(req);
        let data = {
            body: req.body,
            userInfo: req.userInfo
        };

        return new Promise((resolve, reject) => {
            if ("Admin" !== data.userInfo.role) {
                reject(errorTexts.userRole)
            }

            getUsers(data)
                .then(data => {
                    resolve({
                        code: 200,
                        status: "success",
                        result: {
                            users: data.cursor
                        }
                    })
                })
                .catch(reject)
        });
    },

    /**
     *
     * @param req
     * @returns {Promise<any>}
     */
    updateUserByAdmin: req => {
        const possibleForm = {
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
                type: "number",
                minLength: 3,
                maxLength: 64,
                required: true
            },
            tin: {
                name: "TIN",
                type: "number",
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
                type: "phoneNumber",
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
            country: {
                name: "Country",
                type: "text",
                minLength: 3,
                length: 64,
                required: true
            },
            city: {
                name: "City",
                type: "text",
                minLength: 3,
                length: 64,
                required: true
            },
            status: {
                name: "Status",
                type: "text",
                minLength: 3,
                length: 64,
                required: true,
            }
        };

        let data = {
            body: req.body,
            userInfo: req.userInfo,
            userId: req.params.userId.toString(),
            possibleForm: possibleForm,
            editableFieldsValues: req.body
        };

        return new Promise((resolve, reject) => {
            if ("Admin" !== data.userInfo.role) {
                reject(errorTexts.userRole)
            }

            return new Promise((resolve, reject) => {
                Helper.getEditableFields(data)
                    .then(Helper.getEditableFieldsValues)
                    .then(Helper.validateData)
                    .then(resolve)
                    .catch(reject)
            })
                .then(updateUserByAdmin)
                .then(data => {
                    resolve(successTexts.userUpdated)
                })
                .catch(reject)
        });
    },

    /**
     *
     * @param req
     * @returns {Promise<any>}
     */
    increaseBalance: req => {
        const possibleForm = {
            currency: {
                name: "Currency",
                type: "text",
                minLength: 3,
                maxLength: 3,
                required: true
            },
            amount: {
                name: "Amount",
                type: "number",
                required: true
            },
            description: {
                name: "Description",
                type: "text",
                minLength: 3,
                maxLength: 512,
                required: true
            },
        };

        let data = {
            body: req.body,
            userInfo: req.userInfo,
            userId: req.params.userId.toString(),
            editableFields: possibleForm,
            editableFieldsValues: req.body
        };

        return new Promise((resolve, reject) => {
            if ("Admin" !== data.userInfo.role) {
                reject(errorTexts.userRole)
            }

            Helper.validateData(data)
                .then(getUserById)
                .then(Helper.balanceUpdateInfo)
                .then(data => {
                    let documentInfo = {
                        collectionName: "users",
                        filterInfo: {
                            "userId" : data.userId
                        },
                        updateInfo: data.balanceInfo.updateInfo
                    };

                    let historyInfo = {
                        collectionName: "balanceHistory",
                        documentInfo: {
                            type: "Increase Balance",
                            userId: data.userId,
                            currency: data.balanceInfo.currency,
                            rate: data.balanceInfo.rate,
                            amount: data.body.amount,
                            description: data.body.description,
                            createdAt: Math.floor(Date.now() / 1000)
                        }
                    };

                    return new Promise((resolve, reject) => {
                        Promise.all([
                            mongoRequests.updateDocument(documentInfo),
                            mongoRequests.insertDocument(historyInfo)
                        ])
                            .then(doc => {
                                resolve(successTexts.userUpdated)
                            })
                            .catch(err => {
                                winston.log('error', err);

                                reject(errorTexts.forEnyCase)
                            })
                        })
                })
                .then(data => {
                    resolve(successTexts.userUpdated)
                })
                .catch(reject)
        })
    },

    /**
     *
     * @param req
     * @returns {Promise<any>}
     */
    useBalance: req => {
        const possibleForm = {
            currency: {
                name: "Currency",
                type: "text",
                minLength: 3,
                maxLength: 3,
                required: true
            },
            amount: {
                name: "Amount",
                type: "number",
                required: true
            },
            description: {
                name: "Description",
                type: "text",
                minLength: 3,
                maxLength: 512,
                required: true
            },
        };

        let data = {
            body: req.body,
            userInfo: req.userInfo,
            userId: req.params.userId.toString(),
            editableFields: possibleForm,
            editableFieldsValues: req.body
        };

        return new Promise((resolve, reject) => {
            if ("Admin" !== data.userInfo.role) {
                reject(errorTexts.userRole)
            }

            Helper.validateData(data)
                .then(getUserById)
                .then(Helper.useBalanceByAdmin)
                .then(data => {
                    let documentInfo = {
                        collectionName: "users",
                        filterInfo: {
                            "userId" : data.userId
                        },
                        updateInfo: data.balanceInfo.updateInfo
                    };

                    let historyInfo = {
                        collectionName: "balanceHistory",
                        documentInfo: {
                            type: "Use Balance",
                            userId: data.userId,
                            currency: data.balanceInfo.currency,
                            rate: data.balanceInfo.rate,
                            amount: data.body.amount,
                            description: data.body.description,
                            createdAt: Math.floor(Date.now() / 1000)
                        }
                    };

                    return new Promise((resolve, reject) => {
                        Promise.all([
                            mongoRequests.updateDocument(documentInfo),
                            mongoRequests.insertDocument(historyInfo)
                        ])
                            .then(doc => {
                                resolve(successTexts.userUpdated)
                            })
                            .catch(err => {
                                winston.log('error', err);

                                reject(errorTexts.forEnyCase)
                            })
                    })
                })
                .then(data => {
                    resolve(successTexts.userUpdated)
                })
                .catch(reject)
        })
    },

    /**
     *
     * @param req
     * @returns {Promise<any>}
     */
    getBalanceHistory: req => {
        let data = {
            body: req.body,
            userInfo: req.userInfo,
            userId: req.params.userId.toString()
        };

        return new Promise((resolve, reject) => {
            if ("Admin" !== data.userInfo.role) {
                reject(errorTexts.userRole)
            }

            getBalanceHistory(data)
                .then(data => {
                    resolve({
                        code: 200,
                        status: "success",
                        result: data.historyInfo
                    })
                })
                .catch(reject)
        });
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
    documentInfo.filter = {email: data.body.email};

    return new Promise((resolve, reject) => {
        mongoRequests.countDocuments(documentInfo)
            .then(docCount => {
                docCount > 0
                    ? reject(errorTexts.emailAddressAlreadyInUse)
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
        userId:             data.userId.toString(),
        companyName:        data.body.companyName,
        businessName:       data.body.businessName,
        password:           crypto.createHash('sha256').update(data.body.password + currentTime).digest("hex"),
        salt:               currentTime,
        email:              data.body.email,
        vat:                data.body.vat,
        tin:                data.body.tin,
        ceoName:            data.body.ceoName,
        phone:              data.body.phone,
        balance: {
            currentBalance: 0,
            currentCredit:  0,
            maxCredit:      0
        },
        status:             "notVerified",
        role:               "user",
        createdAt:          currentTime,
        updatedAt:          currentTime,
        verificationToken:  data.verificationToken
    };

    data.userInfo = userInfo;

    let documentInfo = {};
    documentInfo.collectionName = "users";
    documentInfo.documentInfo = userInfo;

    return new Promise((resolve, reject) => {
        mongoRequests.insertDocument(documentInfo)
            .then(insertRes => {
                insertRes.insertedCount === 1
                    ? resolve(data)
                    : reject(errorTexts.saveUser)
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
    documentInfo.filterInfo = {
        "userId": data.userId.toString(),
        verificationToken: data.token
    };
    documentInfo.updateInfo = {
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
    documentInfo.filterInfo = {"email" : data.body.email};

    return new Promise((resolve, reject) => {
        mongoRequests.findDocument(documentInfo)
            .then(docInfo => {
                if (null != docInfo && "approved" !== docInfo.status) {
                    reject({
                        code: 403,
                        status: "error",
                        message: "You can't use this account. You need to get approve from admin."
                    })
                }
                else if (null != docInfo && docInfo.password === crypto.createHash('sha256').update(data.body.password + docInfo.salt).digest("hex")) {
                    let token = jwt.sign({
                        userId: docInfo.userId,
                        role: docInfo.role
                    }, config[process.env.NODE_ENV].jwtSecret);

                    documentInfo.updateInfo = {$set: {token: token}};
                    mongoRequests.updateDocument(documentInfo);

                    data.token = token;
                    data.userId = docInfo.userId;

                    resolve(data);
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


// function getUserById(data) {
//     let documentInfo = {};
//     documentInfo.collectionName = "users";
//     documentInfo.filterInfo = {
//         userId: data.userId
//     };
//     documentInfo.optionInfo = {
//         lean : true
//     };
//     documentInfo.projectionInfo = {
//         _id: 0,
//         userId: 1,
//         companyName: 1,
//         businessName: 1,
//         email: 1,
//         vat: 1,
//         tin: 1,
//         ceoName: 1,
//         phone: 1,
//         status: 1,
//         role: 1,
//         createdAt: 1,
//         token: 1
//     };
//
//     return new Promise((resolve, reject) => {
//         mongoRequests.findDocument(documentInfo)
//             .then(doc => {
//                 data.cursor = doc;
//
//                 resolve(data)
//             })
//             .catch(err => {
//                 winston('error', err);
//
//                 reject({
//                     code: 400,
//                     status: "error",
//                     message: "Ups: Something went wrong:("
//                 })
//             })
//     });
// }

/**
 *
 * @param data
 * @returns {Promise<any>}
 */
function getUsers(data) {
    let documentInfo = {};
    documentInfo.collectionName = "users";
    documentInfo.filterInfo = data.body;
    documentInfo.optionInfo = {
        lean : true,
        sort : {
            createdAt : -1
        }
    };
    documentInfo.projectionInfo = {
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
                data.cursor = doc;

                resolve(data)
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
 * @param data
 * @returns {Promise<any>}
 */
function updateUserByAdmin(data) {
    let documentInfo = {};
    documentInfo.collectionName = "users";
    documentInfo.filterInfo = {"userId" : data.userId};
    documentInfo.updateInfo = {$set: data.editableFieldsValues};

    return new Promise((resolve, reject) => {
        mongoRequests.updateDocument(documentInfo)
            .then(updateRes => {
                updateRes.ok === 1
                    ? resolve(data)
                    : reject(errorTexts.cantUpdateMongoDocument)
            })
    })
}

/**
 *
 * @param data
 * @returns {Promise<any>}
 */
function getUserById(data) {
    let documentInfo = {
        collectionName: "users",
        filterInfo: {
            userId: data.userId
        }
    };

    return new Promise((resolve, reject) => {
        mongoRequests.findDocument(documentInfo)
            .then(doc => {
                data.userDocInfo = doc;

                resolve(data)
            })
            .catch(err => {
                winston('error', err);

                reject(errorTexts.forEnyCase)
            })
    });
}

/**
 *
 * @param data
 * @returns {Promise<any>}
 */
function getBalanceHistory(data) {
    let documentInfo = {
        collectionName: "balanceHistory",
        filterInfo: {
            "userId" : data.userId
        },
        optionInfo: {
            sort: {
                createdAt: -1
            }
        }
    };

    let historyInfo = [];
    return new Promise((resolve, reject) => {
        mongoRequests.findDocuments(documentInfo)
            .then(res => {
                _.each(res, value => {
                    historyInfo.push({
                        type: value.type || "",
                        rate: value.rate || "",
                        amount: value.amount || 0,
                        description: value.description || "",
                        createdAt: value.createdAt || 0
                    });
                });

                data.historyInfo = historyInfo;
                resolve(data)
            })
            .catch(err => {
                winston.log("error", err);

                reject(errorTexts.forEnyCase)
            })
    })
}

/**
 *
 * @param data
 * @returns {Promise<any>}
 */
function unsetUserToken(data) {
    let documentInfo = {};
    documentInfo.collectionName = "users";
    documentInfo.filterInfo = {"userId" : data.userInfo.userId};
    documentInfo.updateInfo = {'$set': {token: ""}};

    return new Promise((resolve, reject) => {
        mongoRequests.updateDocument(documentInfo)
            .then(res => {
                resolve({
                    code: 200,
                    status: "Success",
                    message: "You have successfully logged out!"
                })
            })
            .catch(err => {
                winston.log("error", err);

                reject({
                    code: 400,
                    status: "Error",
                    message: "Ups: Something went wrong:("
                })
            })
    })
}