
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
const routes        = require("./routes/routes");


/**
 * Express middleware
 */

app.use("/api", expressJwt({secret: secret}));
// app.use(bodyParser.json({type : "*/*", limit: '2mb'}));
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
app.use("/", routes);

/**
 * production error handler
 */
app.use((err, req, res, next) => {
    res.status(err.code || 500);

    console.log(err);

    res.json({
        code: err.code || 500,
        status : err.status,
        message : err.message
    });
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