const express = require("express");
const fileUpload = require("express-fileupload");
const cloudinary = require("cloudinary").v2;
const router = express.Router();

const isAuthenticated = require("../middlewares/isAuthenticated");
const convertToBase64 = require("../utils/convertToBase64");

const Offer = require("../models/Offer");

router.post(
  "/offer/publish",
  isAuthenticated,
  fileUpload(),
  async (req, res) => {
    try {
      // console.log("Je rentre dans ma route");
      console.log(req.user);
      //   console.log(req.body);
      //   console.log(req.files);
      const { title, description, price, condition, city, brand, size, color } =
        req.body;

      //   console.log(result);
      const newOffer = new Offer({
        product_name: title,
        product_description: description,
        product_price: price,
        product_details: [
          {
            MARQUE: brand,
          },
          {
            TAILLE: size,
          },
          {
            ÉTAT: condition,
          },
          {
            COULEUR: color,
          },
          {
            EMPLACEMENT: city,
          },
        ],
        // product_image: result,
        owner: req.user,
      });
      //   const picture = req.files.picture;
      //   const result = await cloudinary.uploader.upload(convertToBase64(picture));
      //   newOffer.product_image = result;
      await newOffer.save();
      //   const response = await Offer.findById(newOffer._id).populate(
      //     "owner",
      //     "account"
      //   );
      //   console.log(newOffer);
      //   res.json(response);
      res.json(newOffer);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.get("/offers", async (req, res) => {
  try {
    // title=pantalon&priceMax=200&priceMin=20&sort=price-asc&page=3

    const { title, priceMin, priceMax, sort, page } = req.query;
    // const title = req.query.title;
    // console.log(title);

    const filters = {};
    if (title) {
      filters.product_name = new RegExp(title, "i");
    }

    if (priceMin) {
      filters.product_price = { $gte: Number(priceMin) };
    }

    // console.log(filters);

    if (priceMax) {
      if (filters.product_price) {
        filters.product_price.$lte = Number(priceMax);
      } else {
        filters.product_price = { $lte: Number(priceMax) };
      }
    }

    // console.log(filters);

    const sortFilter = {};

    if (sort === "price-asc") {
      sortFilter.product_price = "asc"; // ou 1 ou "ascending"
    } else if (sort === "price-desc") {
      sortFilter.product_price = "desc"; // ou -1 ou "descending"
    }

    // On peut aussi faire ça :

    // if (sort) {
    //   sortFilter.product_price = sort.replace("price-", "");
    // }

    const limit = 5;

    let pageRequired = 1;
    if (page) pageRequired = Number(page);

    //                        0*5   =0  1*5   =5  2*5   =10  3*5   =15
    // 5 résultats par page : 1 skip=0, 2 skip=5, 3 skip=10, 4 skip=15
    // 3 résultats par page : 1 skip=0, 2 skip=3, 3 skip=6, 4 skip=9

    const skip = (pageRequired - 1) * limit;

    const offers = await Offer.find(filters)
      .sort(sortFilter)
      .skip(skip)
      .limit(limit)
      .populate("owner", "account");
    // .select("product_price product_name");

    const count = await Offer.countDocuments(filters);

    const response = {
      count: count,
      offers: offers,
    };

    res.json(response);

    // const results = await Offer.find({
    //   product_name: /vert/i,
    //   product_price: { $gte: 20, $lte: 200 },
    // })
    //   .sort({ product_price: -1 || 1 })
    //   .select("product_name product_price");
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/offer/:id", async (req, res) => {
  try {
    console.log(req.params);
    const offer = await Offer.findById(req.params.id).populate(
      "owner",
      "account"
    );
    res.json(offer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
