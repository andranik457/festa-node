
/**
 * Festa Server Configs
 */

const os = require("os");

const config = {
    
    mode : "local",
    // mode : "production",

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
    },

    production: {
        httpUrl: "http://festa.smartsoft.am:8282/",

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

if (("local" === config.mode)) {
    config.mode = "local";
}
else {
    config.mode = "production";
}

module.exports = config;