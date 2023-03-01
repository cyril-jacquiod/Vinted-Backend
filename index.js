//INSTALLER DEPENDANCES VIA LA COMMANDE "NPM I" DANS TERMINAL
const express = require("express");
const formidable = require("express-formidable");
const cloudinary = require("cloudinary").v2;
const cors = require("cors");
const mongoose = require("mongoose");
const morgan = require("morgan");

// CREER UN SERVEUR
const app = express();

//IMPORT DES ROUTES
const userRoutes = require("./routes/user");
const offerRoutes = require("./routes/offer");
app.use(userRoutes);
app.use(offerRoutes);

app.use(formidable());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

require("dotenv").config();

cloudinary.config({
  cloud_name: "dctdhq60n",
  api_key: "852832236852727",
  api_secret: "lmgnkN9BPElrEE1dxztJUBoq3gY",
});

//CONNEXION À BASE DE DONNEE
mongoose.set("strictQuery", false);
mongoose.connect(process.env.MONGODB_URI);

app.get("/", (req, res) => {
  res.json("Welcome to the signup project");
});

app.post("/upload", async (req, res) => {
  try {
    console.log(req.headers.authorization);
    console.log(req.fields);
    console.log(req.files.picture.path);
    // STOCKE L'IMAGE DANS LE DOSSIER 23ANDROMEDA CREE DE CLOUDINARY
    const result = await cloudinary.uploader.upload(req.files.picture.path, {
      folder: "/23andromeda",
    });
    console.log(result);
    res.json(result.secure_url);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/****************************************/
/******* PAYMENT ************************/
/***************************************/
const stripe = require("stripe")("sk_test_votreCléPrivée");

app.post("/payment", async (req, res) => {
  try {
    // RECEPTION TOKEN CREE VIA API STRIPE DEPUIS FRONTEND
    const stripeToken = req.body.stripeToken;
    // CREATION DE LA TRANSACTION
    const responseFromStripe = await stripe.charges.create({
      amount: 2000,
      currency: "eur",
      description: "La description de l'objet acheté",
      source: stripeToken,
    });
    // SI PAYMENT OK, MAJ DE L'OFFRE ET RENVOI AU FRONT OK
    console.log(responseFromStripe);
    // RENVOI AU CLIENT STATUS DE LA VALIDATION STRIPE
    res.json(responseFromStripe.status);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
// SAUVEGARDE TRANSACTION DANS BDD MONGO DB
app.get("/", (req, res) => {
  res.json("Bienvenue sur mon serveur");
});

app.all("*", (req, res) => {
  res.status(404).json({ message: "This routes doesn't exist" });
});

app.listen(3100, () => {
  console.log("Server started");
});
