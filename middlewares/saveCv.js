
/**
 * Modoule Dependencies
 */

// const _ = require("underscore");
const winston = require("winston");
const mongoRequests = require("../dbQueries/mongoRequests");
const config = require("../config/config");

const cv = {

    save : (data, next) => {
        // console.log(data);

        return new Promise((resolve, reject) => {
            parsePostData(data)
                .then(cvInfo => {
                    return cvInfo;
                })
                .then(saveCvInfo)
        });
    },

    getCvInfo : (data, next) => {
        let info = {};
        info.collectionName = "personalInfo";
        info.userId = data.id;

        return new Promise((resolve, reject) => {
            mongoRequests.getDocumentByUserId(info)
                .then(resolve, reject)
        })
    },

    getAvatar : (req, res, next) => {
        const id = req.params.id.split(".")[0];

        mongoRequests.getAvatar(id, res, (result, file) => {
            if (!file.contentType) {
                file.contentType = "image/jpeg";
            }
            next(result, file);
        });
    }
};

module.exports = cv;


function parsePostData(data) {
    let fullInfo = {};
    let skills = [];
    let languages = [];
    let company = [];
    let education = [];

    return new Promise((resolve, reject) => {

        for (let i in data) {
            if (i.indexOf('skill_') > -1) {
                let asd = JSON.parse(data.skillsLevelInfo);

                let asdf = JSON.parse(data.skillsChipsInfo);

                let zx = [];
                for (let k in asdf[i]) {
                    // console.log(asdf[i][k].tag);
                    zx.push(asdf[i][k].tag);
                }

                skills.push({
                    name: data[i],
                    value: asd[i],
                    description: zx
                });

                console.log(skills);
            }
            else if (i.indexOf('language_') > -1) {
                let asd = JSON.parse(data.languageInfo);

                languages.push({
                    name: data[i],
                    value: asd[i],
                    description: null
                });
            }
            else if (i.indexOf('company_') > -1) {
                let asd = JSON.parse(data.workHistoryInfo);

                company.push({
                    name: data[i],
                    position: asd[i]['position'],
                    start: asd[i]['companyStartDate'],
                    end: asd[i]['companyEndDate'],
                    description: null
                });
            }
            else if (i.indexOf('education_') > -1) {
                let asd = JSON.parse(data.educationHistoryInfo);

                education.push({
                    name: data[i],
                    faculty: asd[i]['faculty'],
                    qualification: asd[i]['qualification'],
                    educationStartDate: asd[i]['educationStartDate'],
                    educationEndDate: asd[i]['educationEndDate'],
                    description: null
                });
            }
            else {
                fullInfo[i] = data[i];
            }

        }

        fullInfo['skills'] = skills;
        fullInfo['languages'] = languages;
        fullInfo['company'] = company;
        fullInfo['education'] = education;

        delete fullInfo["languageInfo"];
        delete fullInfo["workHistoryInfo"];
        delete fullInfo["educationHistoryInfo"];
        delete fullInfo["skillsLevelInfo"];

        resolve(fullInfo);

    })

}

function saveCvInfo(data) {
    // console.log(data);

    let avatarInfo = {};
    avatarInfo.fileName = data.imageName;
    avatarInfo.content = data.image;

    let documentInfo = {};
    documentInfo.collectionName = "personalInfo";

    return new Promise((resolve, reject) => {
        mongoRequests.insertAvatar(avatarInfo)
            .then(doc => {
                if (undefined !== doc) {
                    return doc._id;
                }
                else {
                    return "";
                }
            })
            .then(documentId => {
                data.imageUrl = 'http://local.sample-cv.com/user/info/avatar/'+ documentId;

                delete data["image"];
                delete data["imageName"];
                documentInfo.documentInfo = data;

                mongoRequests.insertDocument(documentInfo);
            })
            .then(resolve)
            .catch(reject)
    });
}

