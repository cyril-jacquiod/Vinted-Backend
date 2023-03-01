const express = require("express");
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const router = express.Router();

const User = require("../models/User");

//CREATION D'UN NOUVEL UTILISATEUR
router.post("/user/signup", async (req, res) => {
  try {
    //DESTRUCTURING DU BODY
    const { email, username, password, newsletter } = req.body;

    // BOUCLE IF SUR EXISTANCE MAIL USERNAME ET PASSWORD
    if (!username || !email || !password || typeof newsletter !== "boolean") {
      return res.status(400).json({ message: "Missing parameter" });
    }
    // SI EMAIL UTILISE, ERREUR
    const emailAlreadyUsed = await User.findOne({ email });
    // console.log(emailAlreadyUsed);
    if (emailAlreadyUsed) {
      return res.status(409).json({ message: "This email is already used" });
    }
    // ENCRYTAGE DU MDP
    const token = uid2(64);
    const salt = uid2(16);
    const hash = SHA256(pawwxord + salt).toString(encBase64);

    //VOIR POSTMANN POUR ENVOI REQUETE EMAIL USERNAME DESCRIPTION
    const newUser = new User({
      email: email,
      account: {
        username: username,
        password: password,
      },
      newslletter: newsletter,
      token: token,
      salt: salt,
      hash: hash,
    });
    //SAUVEGARDE DE L'UTILISATEUR
    await newUser.save();
    const response = {
      _id: newUser._id,
      account: newUser.account,
      token: newUser.token,
    };
    res.json(response);
  } catch (error) {
    console.log(error.mesage);
    res.status(400).json(error.message);
  }
});
router.post("/user/login", async (req, res) => {
  try {
    // console.log(req.body);
    const { email, password } = req.body;
    // RECUPERER LE USER CORRESPONDANT AU MAIL RECU
    const user = await User.findOne({ email: email });
    // Si on en trouve pas on envoie une erreur
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    // NOUVEAU HASH DE CONNEXION VIA SALT DU USER TROUVE + MDP RECU
    console.log(user);
    const newHash = SHA256(user.salt + password).toString(encBase64);
    console.log(newHash);
    // SI HASH DIFFERENTS : ERREUR
    if (newHash !== user.hash) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    // SI HASH IDEM BDD : CONNEXION OK
    res.json({
      _id: user._id,
      account: user.account,
      token: user.token,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/fkjezejf", () => {});

// RECUPERER LES DONNEES USER
router.get("/user", async (req, res) => {
  try {
    const allUsers = await User.find();
    res.json(allUsers);
  } catch (error) {
    console.log(error.message);
    res.status(400).json(error.message);
  }
});
module.exports = router;
