
/**
 * Festa Server Configs
 */

const os = require("os");

const config = {
    
    mode: "testV101",

    testV101: {
        httpUrl: "travel.smartsoft.am:8086",

        port: parseInt(process.env.PORT) || 3065,

        hostname : "127.0.0.1",

        mongoConf: {
            dbName: "testV101",
            url: "mongodb://localhost/testV101",
            options: {
                server: {
                    auto_reconnect : true,
                    reconnectTries : 17280,
                    reconnectInterval : 5000
                }
            }
        },

        mongoConfFiles: {
            dbName: "testV101Files",
            url: "mongodb://localhost/testV101Files",
            options: {
                server: {
                    auto_reconnect : true,
                    reconnectTries : 17280,
                    reconnectInterval : 5000
                }
            }
        },

        jwtSecret: "resti!$ret*&key", // JWT secret
    }

};

config.mode = "testV101";

module.exports = config;