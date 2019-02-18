
/**
 * Modoule Dependencies
 */

const Busboy                = require("busboy");
const config                = require("../config/config");
const mongoRequests         = require("../dbQueries/mongoRequests");
const mongoRequestsFiles    = require("../dbQueries/mongoRequestsFiles");
const successTexts          = require("../texts/successTexts");
const errorTexts            = require("../texts/errorTexts");
const helperFunc            = require("../modules/helper");
const userHelperFunc        = require("../modules/userHelper");
const resourcesFunc         = require("../modules/resources");


const messagesInfo = {

    async compose (req) {

        let busboy = new Busboy({
            headers: req.headers,
            limits: {
                files: 1,
                fileSize: 2 * 1024 * 1024
            }
        });

        let composeResult = null;
        let fileStoreResult = null;
        let fieldData = {};

        return new Promise((resolve, reject) => {
            busboy.on('file', async (fieldName, file, fileName, encoding, mimeType) => {
                let data = {
                    file: file,
                    filename: fileName,
                    fieldName: fieldName,
                    type: mimeType,
                    fileSize: "2Mb"
                };

                fileStoreResult = await mongoRequestsFiles.storeResource(data);
            });

            busboy.on('field', function (fieldName, fieldValue, truncated, valTruncated, encoding, mimeType) {
                fieldData[fieldName] = fieldValue;
            });

            busboy.on('finish', async () => {
                const possibleFields = {
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
                    body: fieldData,
                    userInfo: req.userInfo,
                    editableFields: possibleFields,
                    editableFieldsValues: fieldData
                };

                // try to validate data
                let validateError = null;
                await helperFunc.validateData(data)
                    .catch(error => {
                        validateError = true;
                        return reject(error)
                    });
                if (validateError) {
                    return
                }

                let messageInfo = {
                    status: "Open",
                    creatorId: data.userInfo.userId,
                    subject: data.body.subject,
                    text: data.body.text
                };

                if (fileStoreResult) {
                    messageInfo.fileUrl = config[process.env.NODE_ENV].httpUrl +'/resource/'+ fileStoreResult;
                }

                composeResult = await composeMessage(messageInfo);

                if (200 === composeResult.code) {
                    return resolve(composeResult)
                }
                else {
                    return reject(composeResult)
                }
            });

            req.pipe(busboy);
        });

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