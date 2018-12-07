
const text = {

    incorrectToken: {
        code: 401,
        status: "error",
        message: "Ups: Incorrect Token, please check token and try again (:"
    },

    forEnyCase: {
        code: 403,
        status: "error",
        message: "Ups: Something went wrong, please try again (:"
    },

    userRole: {
        code: 403,
        status: "error",
        message: "Ups: You don't have permission to do this action (:"
    },

    cantSaveDocumentToMongo: {
        code: 403,
        status: "error",
        message: "Ups: Can't save this document (:"
    },

    cantUpdateMongoDocument: {
        code: 403,
        status: "error",
        message: "Ups: Can't update this document (:"
    },

    mongId: {
        code: 403,
        status: "error",
        message: "Ups: Please insert correct id!"
    },

    emailAddressAlreadyInUse: {
        code: 400,
        status: "error",
        message: "Ups: Email Address already in use (:"
    },

    userNewId: {
        code: 400,
        status: "error",
        message: "Ups: Some error occurred in process to creating new id for user!"
    },

    verificationToken: {
        code: 400,
        status: "error",
        message: "We can't create verification token"
    },

    saveUser: {
        code: 400,
        status: "error",
        message: "Some error occurred we can't save this user!"
    },

    incorrectStartEndDate: {
        code: 400,
        status: "error",
        message: "Start Date can't be greater than End Date!"
    }

};

module.exports = text;
