const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" })); // on augmente la limite pour plusieurs pages

app.post("/extract-lpp", async (req, res) => {
  const { base64Images } = req.body;

  // Vérification basique
  if (!Array.isArray(base64Images) || base64Images.length === 0) {
    return res.status(400).json({
      error: {
        code: "invalid_input",
        message: "Le champ 'base64Images' doit être un tableau non vide.",
      },
    });
  }

  // Préparation des images
  const imageParts = base64Images.map((img) => ({
    type: "image_url",
    image_url: {
      url: `data:image/jpeg;base64,${img}`,
    },
  }));

  // Requête à l'API OpenAI
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "Tu es un expert en prévoyance suisse. Lis une fiche LPP et retourne les données dans un JSON strict avec les clés exactes : lpp_cp, lpp_annee, lpp_capital_acc, lpp_rente_retraite, lpp_rente_invalidite, lpp_rente_partenaire, lpp_rente_enfant.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Voici une fiche LPP. Peux-tu me sortir les informations demandées dans un JSON uniquement ?",
              },
              ...imageParts,
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    const json = await response.json();
    res.send(json);
  } catch (error) {
    console.error("❌ Erreur API OpenAI :", error);
    res.status(500).json({
      error: {
        code: "openai_error",
        message: "Erreur lors de la communication avec OpenAI",
      },
    });
  }
});

app.listen(3000, () => console.log("✅ Serveur lancé sur le port 3000"));
