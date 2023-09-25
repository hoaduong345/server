// const sendEmail = require("../utils/sendEmail");

const ProductController = require("../controller/ProductController");

const router = require("express").Router();

// thêm sản phẩm
router.post("/addImagesByProductsID", ProductController.addImagesByProductsID);

router.post("/addproduct", ProductController.addProduct);

router.delete("/deleteproduct/:id", ProductController.deleteProduct);

router.put("/updateproduct/:id", ProductController.updateProduct);

router.get("/chitietproduct/:id", ProductController.getProductDetail);

router.get("/allproducts", ProductController.getAllProduct);

router.get("/paginated", ProductController.getProductsPaginated);

router.get("/search", ProductController.searchProducts);

// router.post("/addtocart/:id", ProductController.addToCart);

// router.delete("/deletetocart/:id", ProductController.deleteToCart);

router.post('/addimagesbyproductid', ProductController.addImagesByProductsID);

router.put('/updateimagesbyproductid/:id', ProductController.updateImageByProductID);




// thêm danh mục

router.post("/addcategory", ProductController.addCategory);

router.delete("/deletecategory/:id", ProductController.deleteCategory);

router.put("/updatecategory/:id", ProductController.updateCategory);

router.get("/allcategory", ProductController.getAllCategory);

module.exports = router;
