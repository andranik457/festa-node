
/**
 * Modoule Dependencies
 */

const mongoRequests     = require("../dbQueries/mongoRequests");
const successTexts      = require("../texts/successTexts");
const errorTexts        = require("../texts/errorTexts");
const helperFunc        = require("../modules/helper");
const userHelperFunc    = require("../modules/userHelper");

const messagesInfo = {

    async compose (req)  {

        const possibleFields = {
            adminId: {
                name: "AdminId",
                type: "number",
                minLength: 1,
                maxLength: 128,
                required: true
            },
            subject: {
                name: "Subject",
                type: "text",
                minLength: 1,
                maxLength: 128,
                required: true
            },
            text: {
                name: "Text",
                type: "text",
                minLength: 1,
                maxLength: 1028,
                required: true
            }
        };

        let data = {
            body: req.body,
            userInfo: req.userInfo,
            editableFields: possibleFields,
            editableFieldsValues: req.body
        };

        // validate main info
        await helperFunc.validateData(data);

        // check is available admin
        let adminInfo = await userHelperFunc.asyncGetUserInfoById(data.body.adminId);

        if (null === adminInfo || "approved" !== adminInfo.status) {
            return Promise.reject(errorTexts.userNotFound)
        }
        else if ("Admin" !== adminInfo.role) {
            return Promise.reject(errorTexts.userRole)
        }

        let messageInfo = {
            creatorId: data.userInfo.userId,
            receiverId: data.body.adminId,
            subject: data.body.subject,
            text: data.body.text
        };

        let composeResult = await composeMessage(messageInfo);
        
        if (200 === composeResult.code) {
            return Promise.resolve(composeResult)
        }
        else {
            return Promise.reject(composeResult)
        }

    }

};

module.exports = messagesInfo;

async function composeMessage(messageInfo) {
    let documentInfo = {};
    documentInfo.collectionName = "messages";
    documentInfo.documentInfo = messageInfo;

    return new Promise((resolve, reject) => {
        mongoRequests.insertDocument(documentInfo)
            .then(insertRes => {
                insertRes.insertedCount === 1
                    ? resolve({
                        code: 200,
                        status: "Success",
                        message: "You successfully compose new message",
                        data: messageInfo
                    })
                    : reject(errorTexts.cantSaveDocumentToMongo)
            })
    });
}