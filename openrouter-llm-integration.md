# OpenRouter API LLM Integration for web-swedish-reader

## Overview

This document outlines a proposal and implementation guide for integrating the OpenRouter API into `web-swedish-reader`. The goal is to leverage an LLM to enhance the user's learning experience, moving beyond static dictionary lookups to context-aware explanations and grammatical insights.

As `web-swedish-reader` is a client-side heavy application, we will adopt a "Bring Your Own Key" (BYOK) model for the OpenRouter integration to avoid exposing private API keys or needing to run a backend service.

## Product Requirements Document (PRD)

### Problem Statement

Currently, when a user clicks a word in the reader, the app queries several static dictionaries (SAOL, Folkets Lexikon, Wiktionary, etc.). Swedish has many compound words, idioms, and context-dependent meanings. A static dictionary lookup often returns many definitions, leaving the user to guess which one applies to the specific sentence they are reading.

### Proposed Features

1. **Context-Aware Word Explanation (Primary Feature)**
   - When a user clicks a word, they should have the option to get an AI-generated explanation of that word *in the context of the sentence*.
   - The LLM should explain:
     - The word's meaning in context.
     - The base form (lemma) of the word.
     - For compound words, a breakdown of the parts.
     - Grammatical information (e.g., noun gender, definite/indefinite, verb conjugation).
2. **"Bring Your Own Key" (BYOK) Setup**
   - The user must provide their own OpenRouter API key in the app's settings.
   - The key must be stored securely in the browser's `localStorage`.
3. **UI Integration**
   - **Settings Panel:** Add a text input in the existing Settings modal for the `OpenRouter API Key`. Add a dropdown or text input to select the preferred model (e.g., `google/gemini-2.5-flash`, `openai/gpt-4o-mini`, or `openrouter/auto`).
   - **Dictionary Sidebar:** Add an "AI Explain" button in the `.query-alternatives-floating-button-row` or directly in the query area.
   - **Results View:** Display the LLM's response below the query alternatives but above the iframe dictionaries.

## Implementation Guide

This section is intended for the coding agent that will implement these features.

### 1. Settings Updates (`js/settings.ts` & `index.html`)

**HTML Changes (`index.html`)**

In the `<dialog class="settings-modal">`, add a new section for LLM configuration:

```html
<section>
  <h3>OpenRouter AI Integration</h3>
  <label>
    OpenRouter API Key:
    <input type="password" class="settings-openrouter-api-key" placeholder="sk-or-v1-..." />
  </label>
  <p><small>Get your API key from <a href="https://openrouter.ai/settings/keys" target="_blank">openrouter.ai</a>. The key is stored locally in your browser.</small></p>
  <label>
    OpenRouter Model:
    <input type="text" class="settings-openrouter-model" value="openrouter/auto" />
  </label>
</section>
```

**TypeScript Changes (`js/settings.ts`)**

Add the keys to `settingKeys`:

```typescript
export const settingKeys = {
  // ... existing keys
  __settings_openRouterApiKey: "__settings_openRouterApiKey",
  __settings_openRouterModel: "__settings_openRouterModel",
};
```

Export settings binders so the app can retrieve them:

```typescript
export const openRouterApiKeySetting = bindTextInputToSetting({
  selector: ".settings-openrouter-api-key",
  settingKey: settingKeys.__settings_openRouterApiKey,
  defaultValue: "",
});

export const openRouterModelSetting = bindTextInputToSetting({
  selector: ".settings-openrouter-model",
  settingKey: settingKeys.__settings_openRouterModel,
  defaultValue: "openrouter/auto",
});
```

### 2. Context Extraction Helper (`js/utils.ts`)

To provide context to the LLM, you need the sentence surrounding the clicked word. Create a function that finds the clicked `HTMLElement` and walks its siblings/parents to extract the current sentence or paragraph.

```typescript
// Example snippet to add to utils.ts or dictionaryView.ts
export const getContextForElement = (element: HTMLElement): string => {
  // simplest approach: get the text content of the parent paragraph
  const parent = element.closest('p');
  return parent ? parent.innerText : element.innerText;
};
```

### 3. OpenRouter Service (`js/llm.ts`)

Create a new file `js/llm.ts` to handle the API calls. We will use native `fetch` to keep dependencies minimal.

**Prompting Strategy:** It's critical to separate the `system` instructions from the `user` input context. The system prompt sets the persona and output constraints, while the user prompt supplies the dynamic content.

```typescript
import { openRouterApiKeySetting, openRouterModelSetting } from "./settings";

export const fetchAIExplanation = async (word: string, context: string): Promise<string> => {
  const apiKey = openRouterApiKeySetting.getSetting();
  const model = openRouterModelSetting.getSetting() || 'openrouter/auto';

  if (!apiKey) {
    throw new Error("OpenRouter API Key not set. Please add it in settings.");
  }

  const systemPrompt = `You are an expert Swedish language tutor. Your task is to explain a Swedish word chosen by the user, specifically focusing on its meaning within the provided sentence context.

Please provide your response strictly in the following Markdown format, keeping explanations concise:
1. **Meaning in Context**: (English translation of the word as used here)
2. **Base Form**: (The lemma of the word)
3. **Compound Breakdown**: (If it's a compound word, break it down. If not, say "N/A")
4. **Grammar Info**: (Brief details like gender, definite/indefinite, tense, or part of speech)`;

  const userPrompt = `I am reading a Swedish text and clicked on the word: "${word}".\nThe surrounding sentence context is: "${context}".\n\nPlease explain it.`;

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

  const data = await response.json();
  return data.choices[0].message.content;
};
```

### 4. Dictionary UI Integration (`js/dictionaryView.ts` and `index.html`)

**HTML Changes (`index.html`)**

Add a button to the `.flex` container in the `.form-dics-query` and an output container in the `.aside-row`:

```html
<!-- Inside <div class="flex"> in .form-dics-query -->
<button type="button" class="control-ai-explain" title="Explain with AI">AI</button>

<!-- Inside .query-alternatives or below it -->
<div class="ai-explanation-container" style="display: none; padding: 10px; background: #f5f5f5; border-radius: 4px; font-size: 0.9em;">
  <div class="ai-explanation-content"></div>
</div>
```

**TypeScript Changes (`js/dictionaryView.ts`)**

1. Query the elements.
2. Bind the AI button to `fetchAIExplanation`.

```typescript
// Need a way to track the currently active word and context
import { fetchAIExplanation } from "./llm";
import { getContextForElement } from "./utils"; // Assuming you implemented this
import { openRouterApiKeySetting } from "./settings";

let currentContext = "";
let currentWord = "";

// In index.ts where `handleClick` is defined:
// Update `currentContext` and `currentWord` when a word is clicked.
// This might require exporting a setter from dictionaryView.ts.

const aiExplainButton = document.querySelector(".control-ai-explain");
const aiExplanationContainer = document.querySelector(".ai-explanation-container");
const aiExplanationContent = document.querySelector(".ai-explanation-content");

aiExplainButton?.addEventListener("click", async () => {
  if (!openRouterApiKeySetting.getSetting()) {
     alert("Please configure your OpenRouter API key in settings first.");
     return;
  }

  if (!queryInput.value) return;

  aiExplanationContainer!.style.display = "block";
  aiExplanationContent!.textContent = "Loading AI explanation...";

  try {
    const text = await fetchAIExplanation(queryInput.value, currentContext);

    // Simple markdown parsing for the output (or use the existing 'marked' library used in index.ts)
    const { marked } = await import(/* webpackChunkName: "marked" */ "marked");
    const { default: DOMPurify } = await import(/* webpackChunkName: "dompurify" */ "dompurify");

    const html = await marked.parse(text);
    aiExplanationContent!.innerHTML = DOMPurify.sanitize(html);
  } catch (err: any) {
    aiExplanationContent!.textContent = `Error: ${err.message}`;
  }
});
```

### 5. Final Polish & Responsive CSS (`css/index.css`)

To ensure the "AI Explain" button and output container look excellent on both mobile and desktop screens, we need robust, responsive CSS.

**Button Styling:** The AI button inside the `.form-dics-query` `.flex` container needs to stand out without breaking the layout on narrow screens (like an iPhone 13).

```css
/* Update styling for the AI button to make it visually distinct */
.control-ai-explain {
  background-color: #e0f7fa;
  border: 1px solid #b2ebf2;
  color: #00838f;
  font-weight: bold;
  padding: 0 8px; /* Slightly wider padding for tap target on mobile */
  margin-left: 4px; /* Space from other buttons */
  flex-shrink: 0; /* Prevent shrinking on small screens */
}

.control-ai-explain:active {
  background-color: #b2ebf2;
}
```

**Container Styling:** The explanation container should scale fluidly and provide clear structure.

```css
/* AI Explanation Box */
.ai-explanation-container {
  padding: 12px;
  background-color: #f5f5f5;
  border-radius: 6px;
  font-size: 0.95em;
  margin-bottom: 12px;
  border-left: 4px solid #00bcd4; /* Accent color to indicate AI origin */
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  width: 100%; /* Ensure it spans the full width of the aside column */
  box-sizing: border-box; /* Prevent padding from overflowing the container */
}

/* Ensure markdown outputs wrap correctly on small screens */
.ai-explanation-content p,
.ai-explanation-content ol,
.ai-explanation-content ul {
  margin-top: 6px;
  margin-bottom: 6px;
  line-height: 1.5;
  word-wrap: break-word; /* Prevent long words from breaking layout */
}
```

- **Dependencies:** The application already includes `marked` and `dompurify` which are perfect for securely rendering the Markdown response from the OpenRouter API. Use them in the LLM response renderer.

## Summary

By making these changes, `web-swedish-reader` transforms from a static dictionary client into an intelligent reading assistant. The BYOK approach via `localStorage` keeps the repository strictly static without recurring API costs for the host, while unlocking powerful contextual awareness for language learners.