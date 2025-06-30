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
Réponds **SEULEMENT** avec un objet JSON strict contenant exactement ces clés, et **TOUS** les montants sous forme de chaînes de caractères (entre guillemets), même si la valeur est “0” ou “null” :

{
  "lpp_cp": "Nom de la caisse de pension",            // string
  "lpp_annee": "Année du certificat",                  // string, ex. "2025"
  "lpp_capital_acc": "Capital accumulé",               // string, ex. "25687.60"
  "lpp_rente_retraite": "Rente retraite",             // string, ex. "21640.00"
  "lpp_rente_invalidite": "Rente invalidité",         // string, ex. "12984.00"
  "lpp_rente_partenaire": "Rente partenaire",         // string, ex. "4328.00"
  "lpp_rente_enfant": "Rente enfant"                  // string, ex. "4328.00"
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

```json
{
  "lpp_cp": "SERVISA",
  "lpp_annee": "2024",
  "lpp_capital_acc": "15230.50",
  "lpp_rente_retraite": "0",
  "lpp_rente_invalidite": "12480.00",
  "lpp_rente_partenaire": "8320.00",
  "lpp_rente_enfant": "2560.00"
}
