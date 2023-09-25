const CartController = require("../controller/CartController");
const router = require("express").Router();

router.post("/addcart",CartController.addToCart)
router.post("/getcart",CartController.getCart)

module.exports = router;
