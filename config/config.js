
/**
 * Festa Server Configs
 */

const os = require("os");

const config = {
    
    mode : "local",

    local: {
        httpUrl: "local-festa.com",

        port: parseInt(process.env.PORT) || 3015,

        hostname : "127.0.0.1",

        mongoConf: {
            dbName: "festa",
            url: "mongodb://localhost/festa",
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

config.mode = "local";


module.exports = config;