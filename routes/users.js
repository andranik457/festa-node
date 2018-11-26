
/**
 * Module Dependencies
 */

const router    = require("express").Router();
const url       = require('url');
const userFunc  = require("../modules/user");
const winston   = require("winston");

/**
 * User Log Out
 */
router.get("/log-out", (req, res) => {
    userFunc.logOut(req)
        .then(result => {
            res.send(result)
        })
        .catch(err => {
            winston.log("error", err);
            //
            res.status(err.code);
            return res.json(err);
        })
});

/**
 * Edi user personal info by usr
 */
// router.post("/api/user/edit", (req, res) => {
//     userFunc.edit(req)
//         .then(result => {
//             res.send(result)
//         })
//         .catch(err => {
//             winston.log("error", err);
//             //
//             res.status(err.code);
//             return res.json(err);
//         })
// });

/**
 * Get User by userId
 */
router.get("/get-user/:userId", (req, res) => {
    userFunc.getUserByUserId(req)
        .then(result => {
            res.send(result)
        })
        .catch(err => {
            winston.log("error", err);
            //
            res.status(err.code);
            return res.json(err);
        })
});

/**
 * Get Users by filter
 */
router.post("/get-users", (req, res) => {
    userFunc.getUsers(req)
        .then(result => {
            res.send(result)
        })
        .catch(err => {
            winston.log("error", err);
            //
            res.status(err.code);
            return res.json(err);
        })
});

/**
 *  Edit user info by admin
 */
router.post("/update/:userId", (req, res) => {
    userFunc.updateUserByAdmin(req)
        .then(result => {
            console.log(result);
            res.send(result)
        })
        .catch(err => {
            winston.log("error", err);
            //
            res.status(err.code);
            return res.json(err);
        })
});

/**
 * Increase balance by admin
 */
router.post("/increase-balance/:userId", (req, res) => {
    userFunc.increaseBalance(req)
        .then(result => {
            res.send(result)
        })
        .catch(err => {
            winston.log("error", err);
            //
            res.status(err.code);
            return res.json(err);
        })
});

/**
 * Use user balance by admin
 */
router.post("/use-balance/:userId", (req, res) => {
    userFunc.useBalance(req)
        .then(result => {
            res.send(result)
        })
        .catch(err => {
            winston.log("error", err);
            //
            res.status(err.code);
            return res.json(err);
        })
});

/**
 * User balance change history
 */
router.post("/balance-history/:userId", (req, res) => {
    userFunc.getBalanceHistory(req)
        .then(result => {
            res.send(result)
        })
        .catch(err => {
            winston.log("error", err);
            //
            res.status(err.code);
            return res.json(err);
        })
});

module.exports = router;