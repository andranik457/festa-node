
/**
 * Module Dependencies
 */

const router        = require("express").Router();
const winston       = require("winston");
const messagesFunc  = require("../modules/messages");

/**
 * Make pre-order
 */
router.post("/compose", async (req, res, next) => {
    try {
        res.send(await messagesFunc.compose(req));
    }
    catch (err) {
        winston.log("error", err);
        next(err);
    }
});

module.exports = router;