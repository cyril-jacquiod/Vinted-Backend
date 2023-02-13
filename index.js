const express = require("express");
const formidable = require("express-formidable");
const cloudinary = require("cloudinary").v2;
const cors = require("cors");

const app = express();
app.use(formidable());
app.use(cors());

cloudinary.config({
  cloud_name: "dctdhq60n",
  api_key: "852832236852727",
  api_secret: "lmgnkN9BPElrEE1dxztJUBoq3gY",
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

app.listen(4000, () => {
  console.log("Serveur Started");
});
