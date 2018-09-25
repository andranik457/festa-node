
/**
 * Module dependencies
 */

const app = require("express")();
// const logger = require("morgan");
const winston = require("winston");
// const bodyParser = require('body-parser');
const config = require("./config/config");
process.env.NODE_ENV = config.mode;

const routes = require("./routes/routes");

/**
 * Express middleware
 */

var bodyParser = require('body-parser');
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));


// app.use(bodyParser.urlencoded({extended : false}));
app.use(bodyParser.text({type : "application/x-www-form-urlencoded"}));
// app.use(bodyParser.json({limit: '512mb'}));
// app.use(bodyParser.urlencoded({limit: '512mb', extended: true}));
// app.use(bodyParser.json({limit: '50mb', type: 'application/json'}));
// app.use(bodyParser());
app.use(bodyParser.urlencoded({ extended: false }))

// app.use(bodyParser.urlencoded({
//     parameterLimit: 100000,
//     limit: '512mb',
//     extended: true
// }));

// app.use(bodyParser.json());
// app.use(logger("dev"));
app.use('/', routes);

/**
 * error handlers
 * development error handler
 */


/**
 * production error handler
 */

app.use((err, req, res, next) => {
    res.status(err.status || 500);
res.json({message : err.message, error : {}});
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