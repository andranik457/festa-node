
/**
 * Module Dependencies
 */

const router        = require("express").Router();
const url           = require('url');
const orderFunc     = require("../modules/order");
const winston       = require("winston");

/**
 * Make pre-order
 */
router.post("/pre-order", async (req, res, next) => {
    try {
        res.send(await orderFunc.preOrder(req));
    }
    catch (err) {
        winston.log("error", err);
        next(err);
    }
});

/**
 * Make booking / order
 */
router.post("/order", async (req, res, next) => {
    try {
        res.send(await orderFunc.order(req));
    }
    catch (err) {
        winston.log("error", err);
        next(err);
    }
});

module.exports = router;