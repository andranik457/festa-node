
/**
 * Module dependencies
 */

const app           = require("express")();
const winston       = require("winston");
const config        = require("./config/config");
process.env.NODE_ENV = config.mode;
const bodyParser    = require("body-parser");
const expressJwt    = require("express-jwt");
const secret        = config[process.env.NODE_ENV].jwtSecret;
//
const auth          = require("./middlewares/auth");
//
const flights       = require("./routes/flights");
const classes       = require("./routes/classes");
const searches      = require("./routes/searches");
const users         = require("./routes/users");
const routes        = require("./routes/routes");
const cors          = require('cors');


const moment            = require("moment");
// const moment    = require('moment-timezone');

// let a = moment("2013-11-18 13:00:00");
// let b = moment("2013-11-18 14:00:00");
//
//
//
// let a1 = moment.tz.zone("America/Los_Angeles").utcOffset(a);
// let a2 = moment.tz.zone("Asia/Yerevan").utcOffset(a);
// // let a6 = moment.tz.zone("Europe/London").utcOffset(a);
//
// let b1 = parseInt(moment.tz("2013-11-18 13:00:00", "UTC").format("X"));
// let b2 = parseInt(moment.tz("2013-11-18 14:00:00", "UTC").format("X"));
// // let realDiff = (b1 + a1*60) - (b2 + a2*60)
//
// let realDiff = (1384783200 + 240*60) - (1384779600 - 480*60)
//
// console.log(realDiff/3600);


// console.log(a1, a2, a1-a2, b1, b2, realDiff,a2*60);
// let asd = a.utc().format("X")
// console.log(moment(asd*1000).tz('Asia/Yerevan').format('YYYY-MM-DD HH:mm'));
// console.log(a.format("X"));

// let a1 = moment.tz.zone("Europe/Moscow").utcOffset(a);
// let a2 = moment.tz.zone("Asia/Tokyo").utcOffset(a);
// let a3 = moment.tz.zone("America/New_York").utcOffset(a);
// let a4 = moment.tz.zone("Europe/Samara").utcOffset(a);
// let a6 = moment.tz.zone("Australia/Sydney").utcOffset(a);

// console.log(a0,a5,a1,a2,a3,a4,a6);
// console.log(a0,a5,a6);
//
// //
// var vb = moment.tz("2013-11-17 19:55:00", "America/Los_Angeles");
// var vb1 = moment.tz("2013-11-17 19:55:00", "Asia/Yerevan");
// // var vba = moment.tz("2013-11-18 11:55:00", "Europe/Ulyanovsk");
// // var vba1 = moment.tz("2013-11-18 11:55:00", "Europe/London");
// //
// // console.log(vb.format("X"));
// console.log((vb1.format("X")-vb.format("X"))/3600);


// console.log(a.format("ZZ")); // 2013-11-18T19:55:00+08:00
// console.log(b.format("zz")); // 2013-11-18T06:55:00-05:00
// console.log(a.utc()); // 2013-11-18T06:55:00-05:00
// console.log(b.utc()); // 2013-11-18T06:55:00-05:00

// let asd = a.utc().format("X"); // 2013-11-18T11:55Z
// let asfd = b.utc().format("X"); // 2013-11-18T11:55Z

// console.log('777777777777777777777', asd,asfd);


/**
 * Express middleware
 */

app.use(cors());
app.use("/api", expressJwt({secret: secret}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(bodyParser.text({type : "application/x-www-form-urlencoded", limit: '8mb'}));

/**
 * Routes
 */
app.use("/api", auth.isAuth);
// app.use("/api/users", makeLowerCase);

/**
 * Routes
 */
app.use("/api/flights", flights);
app.use("/api/classes", classes);
app.use("/api/search", searches);
app.use("/api/users", users);
app.use("/", routes);

/**
 * production error handler
 */
app.use((err, req, res, next) => {
    if (isNaN(err.status)) {
        res.status(err.code || 500);
        res.json({
            code: err.code || 500,
            message : err.code
        });
    }
    else {
        res.status(err.status || 500);
        res.json({
            code: err.status || 500,
            message : err.message
        });
    }

});

/**
 * Application listening on PORT
 */

app.listen(config[process.env.NODE_ENV].port, config[process.env.NODE_ENV].hostname, winston.log("info", `Node.js server is running at http://${config[process.env.NODE_ENV].hostname}:${config[process.env.NODE_ENV].port} 
    in ${process.env.NODE_ENV} mode with process id ${process.pid}`)
);

/**
 * Checking Uncaught Exceptions
 */

process.on("uncaughtException", err => {
    winston.log("error", (new Date).toUTCString() + " uncaughtException:", err.message);
winston.log("info", err.stack);
process.exit(1);
});