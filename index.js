const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

app.post("/extract-lpp", async (req, res) => {
  const { base64Images, promptText, model = "gpt-4o" } = req.body;

  // 1️⃣ Few-shot + consignes strictes
  const systemPrompt = `
Tu es un expert en prévoyance suisse.
Tu vas analyser des fiches LPP (Loi sur la prévoyance professionnelle) et en extraire des informations précises.
Réponds **SEULEMENT** avec un objet JSON strict contenant exactement ces clés, et **TOUS** les montants sous forme de chaînes (entre guillemets), même si la valeur est "0" ou "null" :

{
  "lpp_cp": "Nom de la caisse de pension",
  "lpp_annee": "Année du certificat",
  "lpp_capital_acc": "Capital accumulé",
  "lpp_rente_retraite": "Rente retraite",
  "lpp_rente_invalidite": "Rente invalidité",
  "lpp_rente_partenaire": "Rente partenaire",
  "lpp_rente_enfant": "Rente enfant"
}

Si tu n’es pas certain d’une valeur, mets "null". Ne rajoute aucun commentaire, aucune explication, aucune autre clé.

---  
**Exemple 1 (SERVISA)**  
Caisse de pension : SERVISA  
Année : 2024  
Capital accumulé : 15230.50  
Rente retraite : 0  
Rente invalidité : 12480.00  
Rente partenaire : 8320.00  
Rente enfant : 2560.00

\`\`\`json
{
  "lpp_cp": "SERVISA",
  "lpp_annee": "2024",
  "lpp_capital_acc": "15230.50",
  "lpp_rente_retraite": "0",
  "lpp_rente_invalidite": "12480.00",
  "lpp_rente_partenaire": "8320.00",
  "lpp_rente_enfant": "2560.00"
}
\`\`\`

**Exemple 2 (CPEV)**  
Caisse de pension : CPEV  
Année : 2025  
Capital accumulé : 21345.75  
Rente retraite : 3175.00  
Rente invalidité : 16840.00  
Rente partenaire : 10560.00  
Rente enfant : 3520.00

\`\`\`json
{
  "lpp_cp": "CPEV",
  "lpp_annee": "2025",
  "lpp_capital_acc": "21345.75",
  "lpp_rente_retraite": "3175.00",
  "lpp_rente_invalidite": "16840.00",
  "lpp_rente_partenaire": "10560.00",
  "lpp_rente_enfant": "3520.00"
}
\`\`\`
`;

  // 2️⃣ Construction des messages
  const messages = [{ role: "system", content: systemPrompt }];

  if (promptText) {
    messages.push({ role: "user", content: promptText });
  } else if (Array.isArray(base64Images) && base64Images.length > 0) {
    messages.push({
      role: "user",
      content: [
        { type: "text", text: "Voici ma fiche LPP. Merci de l’analyser :" },
        ...base64Images.map((img) => ({
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${img}` },
        })),
      ],
    });
  } else {
    return res
      .status(400)
      .json({ error: "Aucune donnée fournie (ni promptText ni base64Images)." });
  }

  // 3️⃣ Appel à l’API OpenAI
  try {
    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.0,
          max_tokens: 1200,
        }),
      }
    );

    const json = await response.json();
    return res.status(200).json(json);
  } catch (err) {
    console.error("❌ OpenAI Error:", err);
    return res.status(500).json({
      error: "Erreur lors de l’appel à l’API OpenAI",
      details: err.toString(),
    });
  }
});

app.listen(3000, () =>
  console.log("✅ Serveur LPP lancé sur le port 3000 (index.js)")
);
