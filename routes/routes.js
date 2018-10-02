
/**
 * Module Dependencies
 */

const router    = require("express").Router();
const url       = require('url');
const userFunc  = require("../middlewares/user");
const winston   = require("winston");

/**
 * User Register
 */
router.post("/user/register", (req, res) => {
    userFunc.insert(req.body)
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

/**
 * Verify user registration
 */
router.get("/user/verify", (req, res) => {
    let parts = url.parse(req.url, true);
    let query = parts.query;

    userFunc.verifyUser(query)
        .then(result => {
            res.send(result)
        })
        .catch(err => {
            winston.log("error", err);

            res.status(err.code);
            return res.json(err);
        })
});

/**
 * User Login
 */
router.post("/user/login", (req, res) => {
    userFunc.login(req.body)
        .then(result => {
            res.send(result)
        })
        .catch(err => {
            winston.log("error", err);
            //
            res.status(err.error.code);
            return res.json(err.error);
        })
});

/**
 * User Log Out
 */
router.post("/api/user/log-out", (req, res) => {
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
 * Get Users by filter
 */
router.post("/api/user/get-users", (req, res) => {
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
router.post("/api/user/update-user/:userId", (req, res) => {
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
 * Increace balance by admin
 */
router.post("/api/user/increase-balance/:userId", (req, res) => {
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
router.post("/api/user/use-balance/:userId", (req, res) => {
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
router.post("/api/user/balance-history/:userId", (req, res) => {
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

/**
 * Not Found API
 */
router.use((req, res, next) => {
    let err = new Error("Not Found!");
    err.status = 404;
    next(err);
});

module.exports = router;