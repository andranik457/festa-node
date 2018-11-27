
/**
 * Module Dependencies
 */

const router    = require("express").Router();
const url       = require('url');
const classFunc = require("../modules/class");
const winston   = require("winston");

/**
 * Create Class
 */
router.post("/create/:flightId", (req, res) => {
    classFunc.create(req)
        .then(result => {
            res.status(result.code);
            res.send(result)
        })
        .catch(err => {
            winston.log("error", err);

            res.status(err.code);
            return res.json(err);
        });
});

module.exports = router;