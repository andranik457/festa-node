
/**
 * Festa Server Configs
 */

const os = require("os");

const config = {
    
    // mode: "local",
    // mode: "production",
    mode: "testV101",

    local: {
        httpUrl: "local-festa.smartsoft.am:8080",

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

        mongoConfFiles: {
            dbName: "files",
            url: "mongodb://localhost/files",
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

    testV101: {
        httpUrl: "blahblah.com:8080",

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
    },

    production: {
        httpUrl: "festa.smartsoft.am:8080",

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

        mongoConfFiles: {
            dbName: "files",
            url: "mongodb://localhost/files",
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

if ("local" === config.mode) {
    config.mode = "local";
}
else if ("testV101" === config.mode) {
    config.mode = "testV101";
}
else {
    config.mode = "production";
}

module.exports = config;