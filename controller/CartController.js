const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const CartController = {

  addToCart : async(req, res) =>{
    try {
      // Get user ID from the request (you may have to implement user authentication)
      const userId = parseInt(req.cookies.id); 
      console.log("🚀 ~ file: CartController.js:11 ~ addToCart:async ~ userId:", userId)
  
      // Get product ID and quantity from the request body
      const  productId  = parseInt(req.body.productId);
      const quantity = parseInt(req.body.quantity)
      console.log("🚀 ~ file: CartController.js:16 ~ addToCart:async ~ productId:", productId)
  
      // Find the user's cart
      const cart = await prisma.cartSchema.findFirst({
        where: {
          userId: userId,
        },
        include: {
          item: {
            where: {
              productid: productId,
            },
          },
        },
      });
      console.log("🚀 ~ file: CartController.js:29 ~ addToCart:async ~ cart:", cart)
  
      if (!cart) {
        // Create a new cart for the user if it doesn't exist

        const newCart = await prisma.cartSchema.create({
          data: {
            userId: userId,
            subtotal: 0, // Initialize subtotal as needed
            item: {
              create: {
                productid: productId,
                quantity: quantity || 1,
                
                total: 0, // Calculate total based on product price and quantity
              },
            },
          },
          include: {
            item: true,
          },
        });
  
        res.status(201).json(newCart);
      } else {
        // Check if the product already exists in the cart
        const existingCartItem = cart.item.find(
          (item) => item.productid === productId
        );
  
        if (existingCartItem) {
          // If the product already exists, update its quantity and total
          await prisma.itemCart.update({
            where: {
              id: existingCartItem.id,
            },
            data: {
              productid: productId,
              quantity: existingCartItem.quantity + (quantity || 1),
              // Update total based on product price and updated quantity
            },
          });
        } else {
          // If the product doesn't exist, create a new item in the cart
          await prisma.itemCart.create({
            data: {
              productid: productId,
              quantity: quantity || 1,
              total: 0, // Calculate total based on product price and quantity
              cartschema: {
                connect: {
                  id: cart.id,
                },
              },
            },
          });
        }
  
        // Calculate the updated subtotal of the cart
        const updatedCart = await prisma.cartSchema.update({
          where: {
            id: cart.id,
          },
          data: {
            // Update subtotal based on the sum of item totals in the cart
          },
          include: {
            item: true,
          },
        });
  
        res.status(200).json(updatedCart);
      }
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({
          error: "An error occurred while adding the product to the cart.",
        });
    }
  },
  getCart : async(req,res) =>{
    try {
      const idCart = req.body.id

      const Cart = await prisma.cartSchema.findFirst({
        where:{
          id : idCart
        }
      })
      console.log("aaaaa",Cart)
    } catch (error) {
      
    }
  },
}

 module.exports = CartController;

