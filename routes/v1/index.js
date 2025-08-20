const express = require("express");
const { authenticate } = require("../../middlewares/auth");
const router = express.Router();

router.get("/", (req, res) => {
  res.send("Hello World from v1");
});

/**
 * These are all secure routes
 */

router.use(authenticate);

/**
 * Here goes all the router attachements
 * 
 * e.g.
 *  router.use("/subroute", subRouter);
 */


module.exports = router;
