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

Create a new file `js/llm.ts` to handle the API calls. Note: The OpenRouter quickstart suggests using `@openrouter/sdk`. Since `web-swedish-reader` uses Rsbuild, you can install it via npm or just use native `fetch`.

**Option A: Using native `fetch` (Simpler, fewer dependencies):**

```typescript
import { openRouterApiKeySetting, openRouterModelSetting } from "./settings";

export const fetchAIExplanation = async (word: string, context: string): Promise<string> => {
  const apiKey = openRouterApiKeySetting.getSetting();
  const model = openRouterModelSetting.getSetting() || 'openrouter/auto';

  if (!apiKey) {
    throw new Error("OpenRouter API Key not set. Please add it in settings.");
  }

  const systemPrompt = `You are an expert Swedish language tutor.
The user is reading a Swedish text. They clicked on the word: "${word}".
The surrounding context is: "${context}".

Please provide:
1. The meaning of the word in this specific context (in English).
2. The base form (lemma) of the word.
3. If it's a compound word, break it down.
4. Brief grammatical info (e.g., gender, tense).
Keep the response very concise and formatted in Markdown.`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": window.location.href,
      "X-OpenRouter-Title": "web-swedish-reader",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: "user", content: systemPrompt }],
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

### 5. Final Polish

- **Dependencies:** The application already includes `marked` and `dompurify` which are perfect for securely rendering the Markdown response from the OpenRouter API. Use them in the LLM response renderer.
- **Dependencies (Optional):** If using `@openrouter/sdk` instead of `fetch`, add it via `npm install @openrouter/sdk`. (However, raw fetch is highly recommended here for bundle size and simplicity).
- **CSS:** Add basic styling for `.ai-explanation-container` so it visually fits between the static dictionary alternatives and the iframes.

## Summary

By making these changes, `web-swedish-reader` transforms from a static dictionary client into an intelligent reading assistant. The BYOK approach via `localStorage` keeps the repository strictly static without recurring API costs for the host, while unlocking powerful contextual awareness for language learners.