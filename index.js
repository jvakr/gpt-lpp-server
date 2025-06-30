const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.post("/extract-lpp", async (req, res) => {
  const { base64Images, promptText, model = "gpt-4o" } = req.body;

  // Prompt principal pour toutes les requêtes
  const systemPrompt = `
Tu es un expert en prévoyance suisse. Tu vas analyser une fiche LPP (Loi sur la prévoyance professionnelle) et en extraire des informations précises. 
Tu dois retourner un objet JSON contenant uniquement les champs suivants, même si certains sont vides :

{
  "lpp_cp": (nom de la caisse de pension),
  "lpp_annee": (année du certificat, au format 2025),
  "lpp_capital_acc": (capital de prévoyance accumulé, en francs suisses),
  "lpp_rente_retraite": (rente de retraite annuelle, en CHF),
  "lpp_rente_invalidite": (rente d'invalidité annuelle, en CHF),
  "lpp_rente_partenaire": (rente au conjoint/partenaire en cas de décès, en CHF),
  "lpp_rente_enfant": (rente pour enfant, en CHF)
}

Réponds uniquement avec ce JSON strict, sans aucun commentaire ou texte autour. Si tu ne trouves pas une information, indique null ou 0 selon le champ.
  `.trim();

  const messages = [
    {
      role: "system",
      content: systemPrompt,
    },
  ];

  if (promptText) {
    messages.push({
      role: "user",
      content: promptText,
    });
  } else if (base64Images && Array.isArray(base64Images)) {
    messages.push({
      role: "user",
      content: [
        {
          type: "text",
          text: "Voici une fiche LPP. Peux-tu me sortir les informations demandées dans un JSON uniquement ?",
        },
        ...base64Images.map((image) => ({
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${image}`,
          },
        })),
      ],
    });
  } else {
    return res.status(400).json({ error: "Aucune donnée fournie (ni promptText ni base64Images)." });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    const json = await response.json();
    res.send(json);
  } catch (error) {
    res.status(500).json({
      error: "Erreur lors de l’appel à l’API OpenAI",
      details: error.toString(),
    });
  }
});

app.listen(3000, () => console.log("✅ Serveur lancé sur le port 3000"));
