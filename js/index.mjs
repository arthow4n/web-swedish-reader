import {
  hideDictionaryIfNotOpenedFromCheckBox,
  queryInput,
  showEnglishDictionary,
  updateDictionaryViews,
  englishReaderModeCheckBox,
} from "./dictionaryView.mjs";
import {
  wordSelectedInAreaClassName,
  toWordSpans,
  debounce,
} from "./utils.mjs";
import { speakOnClick } from "./tts.mjs";
import { getCurrentSourceLanguage } from "./dictionaryDatabase.mjs";
import { bindCheckboxToSetting, settingKeys } from "./settings.mjs";

navigator.serviceWorker.register("./serviceWorker.mjs", {
  scope: ".",
  type: "module",
});

const clearAndEditButtons = document.querySelectorAll(".control-clear");
const editButton = document.querySelector(".control-edit");
const importButtons = document.querySelectorAll(".control-import");
const finishEditButtons = document.querySelectorAll(".control-finish-edit");
const pasteButtons = document.querySelectorAll(".control-paste");
const pasteMarkdownButtons = document.querySelectorAll(".control-paste-markdown");
const pasteHtmlButtons = document.querySelectorAll(".control-paste-html");
const fullScreenButton = document.querySelector(".control-full-screen");
const clearArticleStorageButtons = document.querySelectorAll(
  ".control-settings-clear-article-storage-checkbox"
);
const main = document.querySelector("main");
const article = document.querySelector("article");

const articleFromLocalStorageKey = "articleFromLocalStorageKey";
const mainScrollQueryKey = "mainScrollId";

const setMainScrollState = (num) => {
  const url = new URL(location);
  let storageId = url.searchParams.get(mainScrollQueryKey);

  if (num) {
    if (!storageId) {
      // Not ideal but good enough.
      storageId = Date.now();
      url.searchParams.set(mainScrollQueryKey, storageId);
      history.replaceState({}, undefined, url);
      Object.keys(localStorage)
        .filter((k) => k.startsWith(`${mainScrollQueryKey}=`))
        .sort()
        .reverse()
        .slice(2048)
        .forEach((key) => localStorage.removeItem(key));
    }

    localStorage.setItem(`${mainScrollQueryKey}=${storageId}`, num);
    return;
  }

  if (!storageId) {
    return;
  }

  localStorage.removeItem(`${mainScrollQueryKey}=${storageId}`);
  history.replaceState({}, undefined, url);
};

const onMainScroll = debounce(() => {
  setMainScrollState(main.scrollTop);
});

const saveArticleToLocalStorage = bindCheckboxToSetting(
  ".settings-save-article-to-local-storage-checkbox",
  settingKeys.__settings_saveArticleToLocalStorageCheckbox_checked,
  false
);

const updateArticle = async (
  input,
  loadScrollPosition,
  updateArticleFromLocalStorageKeyQuery,
  isMarkdown = false
) => {
  if (saveArticleToLocalStorage.getSetting()) {
    if (updateArticleFromLocalStorageKeyQuery) {
      const newUrl = new URL(location);
      const randomNumbers = new Uint16Array(16);
      crypto.getRandomValues(randomNumbers);
      const articleFromLocalStorageKeyQuery = randomNumbers.toString();

      newUrl.searchParams.set(
        `${articleFromLocalStorageKey}`,
        articleFromLocalStorageKeyQuery
      );
      newUrl.hash = "";

      try {
        localStorage.setItem(
          `${articleFromLocalStorageKey}=${articleFromLocalStorageKeyQuery}`,
          input
        );
        localStorage.setItem(
          `${articleFromLocalStorageKey}=${articleFromLocalStorageKeyQuery}.isMarkdown`,
          isMarkdown
        );
      } catch (err) {
        console.error(err);
        alert(`Failed to save article into storage (storage quota exceeded?), try opening the settings and clear article storage.

${err.name}: ${err.message}
`);
      }

      history.pushState({}, undefined, newUrl);
    }
  } else {
    const newUrl = new URL(location);
    newUrl.searchParams.delete(`${articleFromLocalStorageKey}`);
    newUrl.hash = "text=" + encodeURIComponent(input) + (isMarkdown ? "&isMarkdown=true" : "");

    history.pushState({}, undefined, newUrl);
  }

  const text = input.trim();
  if (!text) {
    article.innerHTML = "";
    article.dataset.rawHtml = "";
    article.dataset.isMarkdown = "";
    return;
  }

  article.dataset.rawHtml = text;
  article.dataset.isMarkdown = isMarkdown ? "true" : "";

  if (isMarkdown) {
    const { marked } = await import("https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js");
    const html = marked.parse(text);
    const template = document.createElement("template");
    template.innerHTML = html;

    const processNodeBottomUp = (node) => {
      if (node.childNodes && node.childNodes.length > 0) {
        Array.from(node.childNodes).forEach(processNodeBottomUp);
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName === 'A') {
          const fragment = document.createDocumentFragment();
          while (node.firstChild) {
            fragment.appendChild(node.firstChild);
          }
          node.parentNode.replaceChild(fragment, node);
        } else if (node.tagName === 'IMG') {
          const t = document.createTextNode(node.alt || "");
          node.parentNode.replaceChild(t, node);
        }
      } else if (node.nodeType === Node.TEXT_NODE) {
         const nodeText = node.nodeValue;
         if (!nodeText.trim()) return;
         const tmp = document.createElement("template");
         tmp.innerHTML = toWordSpans(nodeText);
         node.parentNode.replaceChild(tmp.content, node);
      }
    };
    
    Array.from(template.content.childNodes).forEach(processNodeBottomUp);
    
    article.innerHTML = "";
    article.appendChild(template.content);
  } else {
    article.innerHTML = text
      .split("\n")
      .map((line) => {
        return (
          "<p>" +
          line
            .split(/\s+/)
            .filter((x) => x.trim())
            .map((x) => toWordSpans(x))
            .join(" ") +
          "</p>"
        );
      })
      .join("");
  }

  const url = new URL(location);
  if (!loadScrollPosition) {
    url.searchParams.delete(mainScrollQueryKey);
    history.replaceState({}, undefined, url);
  }

  main.scrollTo(
    0,
    loadScrollPosition
      ? parseInt(
          localStorage.getItem(
            `${mainScrollQueryKey}=${url.searchParams.get(mainScrollQueryKey)}`
          ),
          10
        ) || 0
      : 0
  );
  main.addEventListener("scroll", onMainScroll);
};

let currentSelectedWordElementInArticle = null;

const setIsEditMode = (isEditable, init = false, forceIsMarkdown = null) => {
  document.body.classList.remove("is-edit-mode");

  if (isEditable) {
    main.removeEventListener("scroll", onMainScroll);
    setMainScrollState(0);

    document.body.classList.add("is-edit-mode");
    currentSelectedWordElementInArticle?.classList.remove(
      wordSelectedInAreaClassName
    );

    if (article.dataset.rawHtml !== undefined) {
       article.innerText = article.dataset.rawHtml;
    }

    article.contentEditable = "plaintext-only";
    article.focus();

    return;
  }

  if (!init) {
    const isMarkdown = forceIsMarkdown !== null ? forceIsMarkdown : (article.dataset.isMarkdown === "true");
    updateArticle(article.innerText, false, true, isMarkdown);
  }

  article.contentEditable = false;
};

{
  // dictionaryQuery=... is mainly for jumping directly to the dictionary view
  // when loading web-swedish-reader from browser custom search engine.
  const dictionaryQuery = new URL(location).searchParams.get("dictionaryQuery");
  if (dictionaryQuery) {
    updateDictionaryViews(dictionaryQuery);
  }

  const articleFromLocalStorageKeyQuery = new URL(location).searchParams.get(
    articleFromLocalStorageKey
  );
  const textFromLocalStorage =
    articleFromLocalStorageKeyQuery &&
    localStorage.getItem(
      `${articleFromLocalStorageKey}=${articleFromLocalStorageKeyQuery}`
    );
  const isMarkdownFromLocalStorage = 
    articleFromLocalStorageKeyQuery &&
    localStorage.getItem(
      `${articleFromLocalStorageKey}=${articleFromLocalStorageKeyQuery}.isMarkdown`
    ) === "true";

  const hashQuery = new URLSearchParams(location.hash.slice(1));
  const textFromHash = hashQuery.get("text");
  const isMarkdownFromHash = hashQuery.get("isMarkdown") === "true";

  const articleText = textFromLocalStorage || textFromHash;
  const isMarkdown = textFromLocalStorage ? isMarkdownFromLocalStorage : isMarkdownFromHash;

  if (articleText) {
    updateArticle(articleText, true, !articleFromLocalStorageKeyQuery, isMarkdown);
  }

  setIsEditMode(!articleText?.trim(), true);
}

let lastSwedishWordClickEventTarget = null;
document.addEventListener("click", (event) => {
  if (
    (article.isContentEditable && event.target.closest("article")) ||
    !event.target.closest("article,.query-alternatives")
  ) {
    return;
  }

  if (
    event.target.classList.contains("word-english") ||
    englishReaderModeCheckBox.checked
  ) {
    speakOnClick("en", event.target.innerText);
    showEnglishDictionary(event.target.innerText);
    return;
  }

  if (!event.target.classList.contains("word")) {
    return;
  }

  speakOnClick(getCurrentSourceLanguage(), event.target.innerText);

  const isInsideArticle = event.target.closest("article");
  if (isInsideArticle) {
    currentSelectedWordElementInArticle?.classList.remove(
      wordSelectedInAreaClassName
    );
    currentSelectedWordElementInArticle = event.target;
    currentSelectedWordElementInArticle.classList.add(
      wordSelectedInAreaClassName
    );
    hideDictionaryIfNotOpenedFromCheckBox();
  }

  const isInsideAlternatives = !!event.target.closest(".query-alternatives");
  const shouldGoToDeeperAlternative =
    isInsideAlternatives &&
    lastSwedishWordClickEventTarget === event.target &&
    event.target.innerText === queryInput.value;

  updateDictionaryViews(
    event.target.innerText,
    shouldGoToDeeperAlternative
      ? undefined
      : {
          keepQueryAlternatives: isInsideAlternatives,
          shouldSetDictionaryToVisible:
            isInsideAlternatives &&
            lastSwedishWordClickEventTarget === event.target,
        }
  );

  lastSwedishWordClickEventTarget = event.target;
});

clearAndEditButtons.forEach((x) =>
  x.addEventListener("click", () => {
    article.innerHTML = "";
    article.dataset.rawHtml = "";
    article.dataset.isMarkdown = "";
    setIsEditMode(true);
  })
);
editButton.addEventListener("click", () => {
  setIsEditMode(true);
});
finishEditButtons.forEach((x) => {
  x.addEventListener("click", () => {
    setIsEditMode(false);
  });
});

importButtons.forEach((x) =>
  x.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "text/plain,text/html";
    input.multiple = true;
    input.hidden = true;
    input.onchange = async (event) => {
      const allFiles = await Promise.all(
        [...event.target.files].map(
          (file) =>
            new Promise((resolve) => {
              const r = new FileReader();

              const withFileStartEnd = (content) =>
                `==start: ${file.name}\n\n${content}\n\n==end: ${file.name}`;

              r.onload = () => {
                if (file.type === "text/html") {
                  const document = new DOMParser().parseFromString(
                    r.result,
                    "text/html"
                  );
                  resolve(withFileStartEnd(document.body.innerText));
                  return;
                }

                resolve(withFileStartEnd(r.result));
              };
              r.onerror = () => {
                resolve(withFileStartEnd(""));
              };

              r.readAsText(file);
            })
        )
      );
      document.body.removeChild(input);
      article.innerText = allFiles.join("\n\n");
      setIsEditMode(false);
    };

    document.body.appendChild(input);
    input.click();
  })
);

fullScreenButton.addEventListener("click", () => {
  if (document.fullscreenElement) {
    document.exitFullscreen();
    return;
  }

  document.documentElement.requestFullscreen({
    navigationUI: "hide",
  });
});

pasteButtons.forEach((pasteButton) =>
  pasteButton.addEventListener("click", async () => {
    article.innerText = await navigator.clipboard.readText();
    setIsEditMode(false, false, false);
  })
);

pasteMarkdownButtons.forEach((pasteButton) =>
  pasteButton.addEventListener("click", async () => {
    article.innerText = await navigator.clipboard.readText();
    setIsEditMode(false, false, true);
  })
);

pasteHtmlButtons.forEach((pasteButton) =>
  pasteButton.addEventListener("click", async () => {
    let htmlContent = "";
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        if (item.types.includes("text/html")) {
          const blob = await item.getType("text/html");
          htmlContent = await blob.text();
          break;
        }
      }
    } catch (e) {
      console.warn("Failed to read HTML from clipboard", e);
    }

    if (!htmlContent) {
      try {
        htmlContent = await navigator.clipboard.readText();
      } catch (e) {
        console.warn("Failed to read text from clipboard", e);
      }
    }

    if (!htmlContent) return;

    const DOMPurifyModule = import("https://cdn.jsdelivr.net/npm/dompurify@3.0.6/+esm");
    const TurndownServiceModule = import("https://cdn.jsdelivr.net/npm/turndown@7.1.3/+esm");
    const TurndownPluginGfmModule = import("https://cdn.jsdelivr.net/npm/turndown-plugin-gfm@1.0.2/+esm");
    const { default: DOMPurify } = await DOMPurifyModule;
    const { default: TurndownService } = await TurndownServiceModule;
    const { gfm } = await TurndownPluginGfmModule;

    const cleanHtml = DOMPurify.sanitize(htmlContent);

    const turndownService = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced"
    });

    turndownService.use(gfm);

    turndownService.addRule('tableCell', {
      filter: ['th', 'td'],
      replacement: function (content, node) {
        const index = Array.prototype.indexOf.call(node.parentNode.childNodes, node);
        let prefix = ' ';
        if (index === 0) prefix = '| ';
        
        let safeContent = content.trim().replace(/\n+/g, '<br>').replace(/\|/g, '\\|');
        return prefix + safeContent + ' |';
      }
    });

    turndownService.keep((node) => {
      return node.nodeName.includes("-");
    });

    const markdown = turndownService.turndown(cleanHtml);
    article.innerText = markdown;
    setIsEditMode(false, false, true);
  })
);

clearArticleStorageButtons.forEach((clearArticleStorageButton) => {
  clearArticleStorageButton.addEventListener("click", () => {
    for (let i = 0; i < localStorage.length; i++) {
      const localStorageKeyName = localStorage.key(i);
      if (localStorageKeyName.startsWith(`${articleFromLocalStorageKey}=`)) {
        localStorage.removeItem(localStorageKeyName);
      }
    }
  });
});
