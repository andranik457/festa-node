
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
    userFunc.logOut(req.body)
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
 *
 */
router.post("/api/user/edit", (req, res) => {
    userFunc.edit(req)
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

router.post("/api/user/update-user/:userId", (req, res) => {
    userFunc.updateUserByAdmin(req)
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