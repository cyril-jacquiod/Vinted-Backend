const express = require("express");
const cors = require("cors");
const stripe = require("stripe")("sk_test_votreCléPrivée");

const app = express();
app.use(express.json());
app.use(cors());

app.post("/payment", async (req, res) => {
  try {
    // RECEPTION TOKEN CREE VIA API STRIPE DEPUIS FRONTEND
    const stripeToken = req.body.stripeToken;
    // CREATION DE LA TRANSACTION
    const responseFromStripe = await stripe.charges.create({
      amount: 2000,
      currency: "eur",
      description: "La description de l'objet acheté",
      // On envoie ici le token
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
// Sauvegarder la transaction dans une BDD MongoDB

app.use(require("./routes/users"));

app.listen(3100, () => {
  console.log("Server started");
});
