
/**
 * Module Dependencies
 */

const router        = require("express").Router();
const url           = require('url');
const orderFunc     = require("../modules/order");
const winston       = require("winston");

/**
 * Create Flight
 */
// router.post("/create", (req, res) => {
//     flightFunc.create(req)
//         .then(result => {
//             res.status(result.code);
//             res.send(result)
//         })
//         .catch(err => {
//             winston.log("error", err);
//
//             res.status(err.code);
//             return res.json(err);
//         });
// });

router.post("/pre-order", async (req, res, next) => {
    try {
        res.send(await orderFunc.preOrder(req));
    }
    catch (err) {
        winston.log("error", err);
        next(err);
    }
});

module.exports = router;