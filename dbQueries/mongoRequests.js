
/**
 * Module Dependencies
 */

const MongoClient = require("mongodb").MongoClient;
const fs = require('fs');
const mongo = require("mongodb");
const winston = require("winston");
const config = require("../config/config");

/**
 * MongoDB db:Festa Connection
 */
let databaseFesta;

const connectCv = () => {
    mongo.MongoClient.connect(config[process.env.NODE_ENV].mongoConf.url, function(err, db) {
        if(err) {
            winston.log("error", "mongo db:"+ config[process.env.NODE_ENV].mongoConf.dbName +" connection closed");

            setTimeout(connectCv, config[process.env.NODE_ENV].mongoConf.options.server.reconnectInterval);

            return winston.log("error", err);
        }

        databaseFesta = db;
        winston.log("info", "mongo db:"+ config[process.env.NODE_ENV].mongoConf.dbName +" connection ready");
        winston.log("info", "----------------x---------------");

        db.on("close", function () {
            winston.log("error", "mongo db:"+ config[process.env.NODE_ENV].mongoConf.dbName +" connection closed");

            databaseFesta = null;
            setTimeout(connectCv, config[process.env.NODE_ENV].mongoConf.options.server.reconnectInterval);
        });
    });
};

connectCv();


/**
 * ---------------------------------------------------------
 */

const mongoQueries = {

    /**
     * Insert personal info
     * @param data
     * @returns {Promise<any>}
     */
    insertDocument: data => {
        return new Promise(((resolve, reject) => {
            databaseFesta.collection(data.collectionName).insertOne(data.documentInfo)
                .then(resolve, reject)
        }))
    },

    /**
     *
     * @param data
     * @returns {Promise<any>}
     */
    findDocument : data => {
        return new Promise((resolve, reject) => {
            databaseFesta.collection(data.collectionName).findOne(data.filter, null, {lean : true})
                .then(resolve, reject)
        });
    },

    findDocuments : data => {
        return new Promise((resolve, reject) => {
            databaseFesta.collection(data.collectionName).find(data.filter, data.projection, data.option).toArray(function(err, result) {
                err ? reject(err) : resolve(result);
            })
        });
    },

    /**
     *
     * @param data
     * @returns {Promise<any>}
     */
    countDocuments : data => {
        return new Promise((resolve, reject) => {
            databaseFesta.collection(data.collectionName).count(data.filter, null, {lean : true})
                .then(resolve, reject)
        });
    },

    /**
     *
     * @param data
     * @returns {Promise<any>}
     */
    updateDocument : data => {
        return new Promise((resolve, reject) => {
            databaseFesta.collection(data.collectionName).findOneAndUpdate(data.filter, data.newValue)
                .then(resolve, reject)
        });
    }

};

module.exports = mongoQueries;