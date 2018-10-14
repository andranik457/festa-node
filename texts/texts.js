
const text = {

    // users

    tokenNotFound : "Token is not found",
    unauthorized : "Unauthorized",
    keyNotCorrect  : "Key is incorrect",
    secretNotCorrect : "Secret is incorrect",
    userIdNotCorrect : "User id is incorrect",

    // redis

    redisNotConnected : "Redis is not connected yet",
    redisSetDb : "Redis Client Set to 0 database",
    redisConnect : "Redis Connection Opened ...",
    redisReady : "Redis Connection Ready ...",
    redisReconnect : "Redis Connection Reconnecting ...",
    redisConnectErr : "Redis Connection Error ...",
    redisConnectEnd : "Redis Connection End ...",

    // Mongo Replica db1

    mongoConnection : "Connected to MongoDB replicaSet : db1/mnm",

    // Mongo Replica db2 Profile

    mongoProfileConnection : "Connected to MongoDB replicaSet : db2/Profile",

    // Mongo Replica db2 Icon

    mongoIconConnection : "Connected to MongoDB replicaSet : db2/Icon",

    // Mongo Replica db2 Logs

    mongoLogsConnection : "Connected to MongoDB replicaSet : db2/Logs",

    // Mongo Replica db2 Processes

    mongoProcessesConnection : "Connected to MongoDB replicaSet : db2/Processes",

    // Mongo Replica db2 Ads

    mongoAdsConnection : "Connected to MongoDB replicaSet : db2/Ads",

    // Mongo Replica db2 Tracks

    mongoAudioConnection : "Connected to MongoDB replicaSet : db2/Audio",

    // Mongo Replica ms-db-tracks Tracks

    mongoTracksConnection : "Connected to MongoDB replicaSet : ms-db-tracks/sd",

    // Mongo Replica ms-db-tracks Tracks MX

    mongoTracksMxConnection : "Connected to MongoDB replicaSet : ms-db-tracks/sd_mx",

    // SQL

    pingErr : "Ping err ",
    sqlConnected : "RDS Connection Open",

    // ElasticSearch

    elasticConnected : "ElasticSearch is connected",

    // other

    videoAdNotFound : "Video Ad settings are not found",
    adSettingsNotFound : "Ad Settings are not found",
    adQSettingsNotFound : "Ad q Settings are not found",
    bannerAdNotFound : "Banner Ad settings are not found",
    adsNotFound : "Ads are not found",
    tracksNotFound : "Tracks are not found",
    valuesNotProvided : "Query values are not provided",

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
    }
};

module.exports = text;
