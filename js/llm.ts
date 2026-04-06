import { openRouterApiKeySetting, openRouterModelSetting } from "./settings";
import { getCurrentSourceLanguage } from "./dictionaryDatabase";

export const fetchAIExplanation = async (word: string, context: string): Promise<{content: string, modelUsed: string, timeTakenMs: number}> => {
  const apiKey = openRouterApiKeySetting.getSetting();
  const model = openRouterModelSetting.getSetting() || 'openrouter/auto';

  if (!apiKey) {
    throw new Error("OpenRouter API Key not set. Please add it in settings.");
  }

  const sourceLang = getCurrentSourceLanguage();
  const languageName = sourceLang === "sv" ? "Swedish" : (sourceLang === "no" ? "Norwegian" : (sourceLang === "da" ? "Danish" : "language"));

  const systemPrompt = `You are an expert ${languageName} language tutor. Your task is to explain a ${languageName} word chosen by the user, specifically focusing on its meaning within the provided sentence context.

Please provide your response strictly in the following Markdown format, keeping explanations concise:
1. **Meaning in Context**: (English translation of the word as used here)
2. **Base Form**: (The lemma of the word)
3. **Compound Breakdown**: (If it's a compound word, break it down. If not, say "N/A")
4. **Grammar Info**: (Brief details like gender, definite/indefinite, tense, or part of speech)`;

  const userPrompt = `I am reading a ${languageName} text and clicked on the word: "${word}".\nThe surrounding sentence context is: "${context}".\n\nPlease explain it.`;

  const startTime = Date.now();
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": window.location.href, // Recommended by OpenRouter for ranking
      "X-OpenRouter-Title": "web-swedish-reader", // Recommended by OpenRouter
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API Error: ${response.status} ${response.statusText}`);
  }

  const endTime = Date.now();
  const data = await response.json();

  return {
    content: data.choices[0].message.content,
    modelUsed: data.model || model, // openrouter/auto might resolve to a specific model
    timeTakenMs: endTime - startTime
  };
};