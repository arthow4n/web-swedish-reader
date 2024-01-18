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

const clearAndEditButtons = document.querySelectorAll(".control-clear");
const editButton = document.querySelector(".control-edit");
const importButtons = document.querySelectorAll(".control-import");
const finishEditButtons = document.querySelectorAll(".control-finish-edit");
const pasteButtons = document.querySelectorAll(".control-paste");
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

const updateArticle = (
  input,
  loadScrollPosition,
  updateArticleFromLocalStorageKeyQuery
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

      localStorage.setItem(
        `${articleFromLocalStorageKey}=${articleFromLocalStorageKeyQuery}`,
        input
      );

      history.pushState({}, undefined, newUrl);
    }
  } else {
    const newUrl = new URL(location);
    newUrl.searchParams.delete(`${articleFromLocalStorageKey}`);
    newUrl.hash = "text=" + encodeURIComponent(input);

    history.pushState({}, undefined, newUrl);
  }

  const text = input.trim();
  if (!text) {
    article.innerHTML = "";
    return;
  }

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

const setIsEditMode = (isEditable, init = false) => {
  document.body.classList.remove("is-edit-mode");

  if (isEditable) {
    main.removeEventListener("scroll", onMainScroll);
    setMainScrollState(0);

    document.body.classList.add("is-edit-mode");
    currentSelectedWordElementInArticle?.classList.remove(
      wordSelectedInAreaClassName
    );

    article.contentEditable = "plaintext-only";
    article.focus();

    return;
  }

  if (!init) {
    updateArticle(article.innerText, false);
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

  const hashQuery = new URLSearchParams(location.hash.slice(1));
  const textFromHash = hashQuery.get("text");

  const articleText = textFromLocalStorage || textFromHash;

  if (articleText) {
    updateArticle(articleText, true, !articleFromLocalStorageKeyQuery);
  }

  setIsEditMode(!article.innerText.trim(), true);
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
    input.accept = "text/plain";
    input.multiple = true;
    input.hidden = true;
    input.onchange = async (event) => {
      const allFiles = await Promise.all(
        [...event.target.files].map(
          (file) =>
            new Promise((resolve) => {
              const r = new FileReader();
              r.onload = () => {
                resolve(
                  `==start: ${file.name}\n\n${r.result}\n\n==end: ${file.name}`
                );
              };
              r.onerror = (r) => {
                resolve("");
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

  document.documentElement.requestFullscreen();
});

pasteButtons.forEach((pasteButton) =>
  pasteButton.addEventListener("click", async () => {
    article.innerText = await navigator.clipboard.readText();
    setIsEditMode(false);
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
