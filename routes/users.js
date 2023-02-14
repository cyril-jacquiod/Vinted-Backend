const express = require("express");
const router = express.Router();

const user = require("../models/User");

//CREATION D'UN NOUVEL UTILISATEUR
router.post("/user/signup", async (req, res) => {
  try {
    //DESTRUCTURING DU BODY
    const { email, username, description } = req.body;
    //VOIR POSTMANN POUR ENVOI REQUETE EMAIL USERNAME DESCRIPTION
    const newUser = new User({
      email: email,
      username: username,
      description: description,
    });

    await newUser.save();

    res.json(newUser);
  } catch (error) {
    console.log(error.mesage);
    res.status(400).json(error.message);
  }
});

// RECUPERER LES DONNEES USER
router.get("/users", async (req, res) => {
  try {
    const allUsers = await User.find();
    res.json(allUsers);
  } catch (error) {
    console.log(error.message);
    res.status(400).json(error.message);
  }
});
module.exports = router;
