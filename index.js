const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" })); // Augmenté pour plusieurs pages PDF

app.post("/extract-lpp", async (req, res) => {
  const { base64Images } = req.body;

  if (!Array.isArray(base64Images) || base64Images.length === 0) {
    return res.status(400).json({ error: "Aucune image base64 reçue." });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `
Tu es un expert en prévoyance professionnelle suisse (LPP).
Analyse minutieusement une fiche de prévoyance (souvent fournie par une caisse de pension) et extrais les informations suivantes dans un format JSON strict, sans explication, avec exactement ces clés :
- lpp_cp (Nom de la caisse de pension)
- lpp_annee (Année du certificat)
- lpp_capital_acc (Capital de prévoyance accumulé)
- lpp_rente_retraite (Rente de vieillesse annuelle)
- lpp_rente_invalidite (Rente d’invalidité)
- lpp_rente_partenaire (Rente au conjoint ou partenaire survivant)
- lpp_rente_enfant (Rente pour enfant)

Réponds uniquement avec le JSON, sans préambule ni explication. Si les informations ne sont pas disponibles, mets null.
`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Voici le certificat LPP. Peux-tu extraire les informations dans un JSON strict ?"
              },
              ...base64Images.map(image => ({
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${image}`
                }
              }))
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 1200
      })
    });

    const json = await response.json();
    res.status(200).json(json);
  } catch (error) {
    console.error("❌ Erreur serveur Node.js :", error);
    res.status(500).json({ error: "Erreur lors de la requête à OpenAI." });
  }
});

app.listen(3000, () => console.log("✅ Serveur lancé sur le port 3000"));
