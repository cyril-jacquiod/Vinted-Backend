// IMPORT PACKAGE EXPRESS
const express = require("express");
// APPEL FONCTION ROUTER DU PACKAGE EXPRESS
const router = express.Router();

// IMPORT CLOUDINARY POUR STOCKAGE PHOTOS
const cloudinary = require("cloudinary").v2;
// IMPORT FILEUPLOAD POUR TELECHARGEMENT
const fileUpload = require("express-fileupload");
const convertToBase64 = require("../utils/convertToBase64");

// IMPORT MODEL OFFER ET USER
// IMPORT DE TOUS LES MODELS DANS TOUTES LES ROUTES AFIN D'EVITER ERREUR (REF ENTRE COLLECTIONS)
const User = require("../models/User");
const Offer = require("../models/Offer");

// IMPORT DU MIDDLEWARE isAuthenticated
const isAuthenticated = require("../middleware/isAuthenticated");

// ROUTE QUI PERMET DE RECUPERER UNE LISTE D'ANNONCES FILTRÉES
// SI PAS DE FILTRE LA ROUTE RENVOIE TOUTES LES ANNONCES
router.get("/offer", async (req, res) => {
  try {
    // CREATION D'UN OBJET DANS LEQUEL SONT STOCKER NOS DIFFERENTS FILTRES
    let filters = {};

    if (req.query.title) {
      filters.product_name = new RegExp(req.query.title, "i");
    }

    if (req.query.priceMin) {
      filters.product_price = {
        $gte: req.query.priceMin,
      };
    }

    if (req.query.priceMax) {
      if (filters.product_price) {
        filters.product_price.$lte = req.query.priceMax;
      } else {
        filters.product_price = {
          $lte: req.query.priceMax,
        };
      }
    }

    let sort = {};

    if (req.query.sort === "price-desc") {
      sort = { product_price: -1 };
    } else if (req.query.sort === "price-asc") {
      sort = { product_price: 1 };
    }

    let page;
    if (Number(req.query.page) < 1) {
      page = 1;
    } else {
      page = Number(req.query.page);
    }

    let limit = Number(req.query.limit);

    const offers = await Offer.find(filters)
      .populate({
        path: "owner",
        select: "account",
      })
      .sort(sort)
      .skip((page - 1) * limit) // ignorer les x résultats
      .limit(limit); // renvoyer y résultats

    // NOMBRE D'ANNONCES FILTREES TROUVEES
    const count = await Offer.countDocuments(filters);

    res.json({
      count: count,
      offers: offers,
    });
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ message: error.message });
  }
});

// RECUPERE LES INFORMATIONS D'UNE OFFRE FONCTION DE SON ID
router.get("/offer/:id", async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate({
      path: "owner",
      select: "account.username account.phone account.avatar",
    });
    res.json(offer);
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ message: error.message });
  }
});

router.post(
  "/offer/publish",
  isAuthenticated,
  fileUpload(),
  async (req, res) => {
    // POSTER UNE NOUVELLE ANNONCE
    try {
      const { title, description, price, brand, size, condition, color, city } =
        req.body;
      console.log(req.headers);

      if (title && price && req.files?.picture) {
        // CREATION DE LA NOUVELLE ANNONCE SANS L'IMAGE (URL CLOUDINARY)
        const newOffer = new Offer({
          product_name: title,
          product_description: description,
          product_price: price,
          product_details: [
            { MARQUE: brand },
            { TAILLE: size },
            { ÉTAT: condition },
            { COULEUR: color },
            { EMPLACEMENT: city },
          ],
          owner: req.user,
        });

        // SI ON NE RECOIT QU'UNE IMAGE (req.files.picture n'est donc pas un tableau)
        if (!Array.isArray(req.files.picture)) {
          // VERIFICATION QU'IL S'AGIT BIEN D'UNE IMAGE
          if (req.files.picture.mimetype.slice(0, 5) !== "image") {
            return res.status(400).json({ message: "You must send images" });
          }
          // ENVOI DE L'IMAGE A CLOUDINARY
          const result = await cloudinary.uploader.upload(
            convertToBase64(req.files.picture),
            {
              folder: `api/vinted/offers/${newOffer._id}`,
              public_id: "preview",
            }
          );
          // AJOUT DE L'IMAGE DANS NEWOFFE
          newOffer.product_image = result;
          newOffer.product_pictures.push(result);
        } else {
          // SI C'EST UN TABLEAU
          for (let i = 0; i < req.files.picture.length; i++) {
            const picture = req.files.picture[i];
            if (picture.mimetype.slice(0, 5) !== "image") {
              return res.status(400).json({ message: "You must send images" });
            }
            if (i === 0) {
              // ON ENVOIE LA 1ERE IMAGE A CLOUDINARY ET ON EN FAIT L'IMAGE PRINCIPALE (product_image)
              const result = await cloudinary.uploader.upload(
                convertToBase64(picture),
                {
                  folder: `api/vinted/offers/${newOffer._id}`,
                  public_id: "preview",
                }
              );

              // AJOUT DE L'IMAGE DANS NEW OFFER OK
              newOffer.product_image = result;
              newOffer.product_pictures.push(result);
            } else {
              // ENVOI DE TOUTES LES AUTRES A CLOUDINARY ET MISE DES RESULTATS DANS product_pictures
              const result = await cloudinary.uploader.upload(
                convertToBase64(picture),
                {
                  folder: `api/vinted/offers/${newOffer._id}`,
                }
              );
              newOffer.product_pictures.push(result);
            }
          }
        }
        await newOffer.save();
        res.json(newOffer);
      } else {
        res
          .status(400)
          .json({ message: "title, price and picture are required" });
      }
    } catch (error) {
      console.log(error.message);
      res.status(400).json({ message: error.message });
    }
  }
);
// CONSTITION NOUEVLLE OFFRE PAR MODIFICATION DE L'ETAT
router.put(
  "/offer/update/:id",
  isAuthenticated,
  fileUpload(),
  async (req, res) => {
    const offerToModify = await Offer.findById(req.params.id);
    try {
      if (req.body.title) {
        offerToModify.product_name = req.body.title;
      }
      if (req.body.description) {
        offerToModify.product_description = req.body.description;
      }
      if (req.body.price) {
        offerToModify.product_price = req.body.price;
      }

      const details = offerToModify.product_details;
      for (i = 0; i < details.length; i++) {
        if (details[i].MARQUE) {
          if (req.body.brand) {
            details[i].MARQUE = req.body.brand;
          }
        }
        if (details[i].TAILLE) {
          if (req.body.size) {
            details[i].TAILLE = req.body.size;
          }
        }
        if (details[i].ÉTAT) {
          if (req.body.condition) {
            details[i].ÉTAT = req.body.condition;
          }
        }
        if (details[i].COULEUR) {
          if (req.body.color) {
            details[i].COULEUR = req.body.color;
          }
        }
        if (details[i].EMPLACEMENT) {
          if (req.body.location) {
            details[i].EMPLACEMENT = req.body.location;
          }
        }
      }
      // Dans son modèle product_details est décrite comme étant de type Array.
      // Or on stocke à l'intérieur un tableau d'objet.
      // Lorsque l'on modifie un élément qui n'est pas explicitement prévu dans le modèle,
      // On doit le notifier de la sorte avant la sauvegarde afin qu'elle soit bien prise en compte.

      offerToModify.markModified("product_details");

      // SI ON RECOIT UNE NOUVELLE PHOTO
      if (req.files?.picture) {
        // ON SUPPRIME L'ANCIENNE
        await cloudinary.uploader.destroy(
          offerToModify.product_image.public_id
        );
        // ON UPLOAD LA NOUVELLE
        const result = await cloudinary.uploader.upload(
          convertToBase64(req.files.picture),
          {
            folder: `api/vinted/offers/${offerToModify._id}`,
            public_id: "preview",
          }
        );
        offerToModify.product_image = result;
        offerToModify.product_pictures[0] = result;
      }
      await offerToModify.save();
      res.status(200).json("Offer modified succesfully !");
    } catch (error) {
      console.log(error.message);
      res.status(400).json({ error: error.message });
    }
  }
);
router.delete("/offer/delete/:id", isAuthenticated, async (req, res) => {
  try {
    console.log(req.params.id);
    // SUPPRESSION DE CE QUI EST DANS LE DOSSIER
    await cloudinary.api.delete_resources_by_prefix(
      `api/vinted/offers/${req.params.id}`
    );
    // SI DOSSIER VIDE, SUPPRESSION !
    await cloudinary.api.delete_folder(`api/vinted/offers/${req.params.id}`);
    offerToDelete = await Offer.findById(req.params.id);
    await offerToDelete.delete();
    res.status(200).json("Offer deleted succesfully !");
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// CETTE ROUTE SERT AU RESET DE LA BDD ENTRE 2 SESSIONS DE FORMATION. CELA NE FAIT PAS PARTIE DE L'EXERCICE.
// RESET ET INITIALISATION BDD
router.get("/reset-offers", fileUpload(), async (req, res) => {
  const token = req.headers.authorization.replace("Bearer ", "");

  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const allUserId = await User.find().select("_id");
  // Il y a 21 users dans le fichier owners.json
  if (allUserId.length > 22) {
    return res
      .status(400)
      .send(
        "Il faut d'abord reset la BDD de users. Voir la route /reset-users"
      );
  } else {
    // SUPPRIMER LES IMAGES DU DOSSIER OFFER offers
    const offers = await Offer.find();
    try {
      const deleteResources = await cloudinary.api.delete_resources_by_prefix(
        "api/vinted/offers"
      );
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
    // SUPRESSION DES DOSSIERS VIDES
    try {
      const folderDeletionPromises = offers.map((offer) => {
        if (offer.product_image) {
          return cloudinary.api.delete_folder(
            `/api/vinted/offers/${offer._id}`
          );
        } else {
          return null;
        }
      });

      await Promise.all(folderDeletionPromises);

      // VIDER LA COLLECTION OFFER
      await Offer.deleteMany({});
    } catch (error) {
      console.log(error);
      console.log(error.message);
    }

    // CREATION D'UN FICHIER VIA LE FICHIER products.json
    for (let i = 0; i < products.length; i++) {
      try {
        // CRATION NOUVELLE ANNONCE
        const newOffer = new Offer({
          product_name: products[i].product_name,
          product_description: products[i].product_description,
          product_price: products[i].product_price,
          product_details: products[i].product_details,
          // CREATION REF ALEATOIRES
          owner: allUserId[Math.floor(Math.random() * allUserId.length)],
        });

        // TELECHARGER L'IMAGE PRINICPALE DU PRODUIT
        const resultImage = await cloudinary.uploader.upload(
          products[i].product_image.secure_url,
          {
            folder: `api/vinted/offers/${newOffer._id}`,
            public_id: "preview",
          }
        );

        // TELECHARGER LES IMAGES DE CHAQUE PRODUIT
        newProduct_pictures = [];
        for (let j = 0; j < products[i].product_pictures.length; j++) {
          try {
            const resultPictures = await cloudinary.uploader.upload(
              products[i].product_pictures[j].secure_url,
              {
                folder: `api/vinted/offers/${newOffer._id}`,
              }
            );

            newProduct_pictures.push(resultPictures);
          } catch (error) {
            console.log("uploadCloudinaryError ===> ", error.message);
          }
        }

        newOffer.product_image = resultImage;
        newOffer.product_pictures = newProduct_pictures;

        await newOffer.save();
        console.log(`✅ offer saved : ${i + 1} / ${products.length}`);
      } catch (error) {
        console.log("newOffer error ===> ", error.message);
      }
    }
    res.send("Done !");
    console.log(`🍺 All offers saved !`);
  }
});

module.exports = router;
