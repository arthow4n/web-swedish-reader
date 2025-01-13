import {
  wordClassName,
  toWordSpans,
  uniq,
  isElementVisible,
} from "./utils.mjs";
import {
  queryCompounds,
  queryEnglishTranslation,
  getCurrentSourceLanguage,
} from "./dictionaryDatabase.mjs";
import {
  bindTextInputToSetting,
  readSetting,
  settingKeys,
  writeSetting,
} from "./settings.mjs";

export const queryInput = document.querySelector(".dics-query-input");
const keepDictionaryVisibleCheckBox = document.querySelector(
  ".label-dics-expand input"
);
const queryAlternativesContainer = document.querySelector(
  ".query-alternatives"
);
const queryAlternativesLocal = document.querySelector(
  ".query-alternatives-line-local"
);
const queryAlternativesRemote = document.querySelector(
  ".query-alternatives-line-remote"
);
const queryAlternativesSwedishDefinition = document.querySelector(
  ".query-alternatives-line-swedish-definition"
);
const queryAlternativesSwedishDefinition2 = document.querySelector(
  ".query-alternatives-line-swedish-definition-2"
);
const queryAlternativesEnglishTranslation = document.querySelector(
  ".query-alternatives-line-english-translation"
);
const youglishSwedishButton = document.querySelector(
  ".control-youglish-swedish"
);
export const englishReaderModeCheckBox = document.querySelector(
  ".settings-english-reader-mode-checkbox"
);

// const folkets = document.querySelector(".dic-folkets");
const saol = document.querySelector(".dic-saol");
const dicSubSingle = document.querySelector(".dic-sub-single");
const englishDictionary = document.querySelector(".dic-english");

const searchGoogleButton = document.querySelector(".control-search-google");
const searchWiktionaryButton = document.querySelector(
  ".control-search-wiktionary"
);
const searchSlangopediaButton = document.querySelector(
  ".control-search-slangopedia"
);
const toggleSoButton = document.querySelector(".control-toggle-so");

const openExternal = (link) => {
  window.open(link, "_blank", "noopener,noreferrer");
};

const isDictionaryVisibleClassName = "is-dictionary-visible";

export const checkIsDictionaryVisible = () => {
  return document.body.classList.contains(isDictionaryVisibleClassName);
};

export const setIsDictionaryVisible = (isVisible) => {
  document.body.classList.remove(isDictionaryVisibleClassName);
  // Don't clean up SAOL iframe's src, because it could be that the user wants to quickly toggle between states.

  if (isVisible) {
    document.body.classList.add(isDictionaryVisibleClassName);
    if (saol.src !== saol.dataset.src && saol.dataset.src) {
      saol.src = saol.dataset.src;
    }
  }
};

export const hideDictionaryIfNotOpenedFromCheckBox = () => {
  if (!keepDictionaryVisibleCheckBox.checked) {
    setIsDictionaryVisible(false);
  }
};

keepDictionaryVisibleCheckBox.addEventListener("change", () => {
  writeSetting(
    settingKeys.__settings_keepDictionaryVisibleCheckBox_checked,
    keepDictionaryVisibleCheckBox.checked
  );
  setIsDictionaryVisible(keepDictionaryVisibleCheckBox.checked);
});

keepDictionaryVisibleCheckBox.checked = readSetting(
  settingKeys.__settings_keepDictionaryVisibleCheckBox_checked,
  true
);
setIsDictionaryVisible(keepDictionaryVisibleCheckBox.checked);

export const updateDictionaryViews = async (
  text,
  {
    cleanup = true,
    keepQueryAlternatives = false,
    shouldSetDictionaryToVisible = true,
  } = {}
) => {
  const cleanedText = (
    cleanup ? text.replace(/(^[^\p{L}]+|[^\p{L}]+$)/gu, "") : text
  ).toLocaleLowerCase();
  const encodedText = encodeURIComponent(cleanedText);
  dicSubSingle.classList.remove("active");

  if (!encodedText) {
    searchGoogleButton.onclick = undefined;
    searchWiktionaryButton.onclick = undefined;
    youglishSwedishButton.onclick = undefined;
    toggleSoButton.onclick = undefined;
    queryAlternativesLocal.innerHTML = "";
    queryAlternativesRemote.innerHTML = "";
    queryAlternativesEnglishTranslation.innerHTML = "";
    // folkets.removeAttribute("src");
    saol.removeAttribute("src");
    englishDictionary.removeAttribute("src");
    return;
  }

  queryInput.value = cleanedText;
  searchGoogleButton.onclick = () => {
    openExternal(`https://www.google.com/search?q=${encodedText}`);
  };
  searchWiktionaryButton.onclick = () => {
    openExternal(`https://sv.wiktionary.org/wiki/${encodedText}#Svenska`);
  };
  searchSlangopediaButton.onclick = () => {
    openExternal(
      `https://mobil.slangopedia.se/mobil/ordlista/?ord=${encodedText}`
    );
  };
  youglishSwedishButton.onclick = () => {
    openExternal(`https://youglish.com/pronounce/${encodedText}/swedish?`);
  };
  toggleSoButton.onclick = () => {
    queryAlternativesContainer.classList.toggle(
      "query-alternatives-so-expanded"
    );
  };
  // {
  //   const next = `https://folkets-lexikon.csc.kth.se/folkets/service?lang=sv&interface=sv&word=${encodedText}`;
  //   if (folkets.src !== next) folkets.src = next;
  // }
  {
    const next = `https://svenska.se/tre/?sok=${encodedText}`;
    saol.dataset.src = next;

    if (checkIsDictionaryVisible() && getCurrentSourceLanguage() === "sv") {
      if (saol.src !== next) {
        saol.src = next;
      }
    } else {
      saol.removeAttribute("src");
    }

    if (shouldSetDictionaryToVisible) {
      setIsDictionaryVisible(true);
    }
  }

  const markAvailableEnglishTranslationsInDescendants = async (element) => {
    await Promise.all(
      [...element.querySelectorAll("." + wordClassName)].map(
        async (wordElement) => {
          const word = wordElement.innerText;
          const translations = await queryEnglishTranslation(word);
          if (translations.length) {
            wordElement.classList.add("word-has-english-translation");
          }
        }
      )
    );
  };

  const setLocal = async () => {
    queryAlternativesLocal.innerHTML = "";

    if (getCurrentSourceLanguage() !== "sv") {
      return;
    }

    const localEntry = await queryCompounds(cleanedText);
    if (queryInput.value === cleanedText) {
      queryAlternativesLocal.innerHTML = !localEntry
        ? ""
        : toWordSpans(
            uniq([...localEntry.compounds, ...localEntry.baseforms])
              .filter((x) => x)
              .join(", ")
          );

      markAvailableEnglishTranslationsInDescendants(queryAlternativesLocal);
    }
  };

  const setRemote = async () => {
    const remoteCompounds = await new Promise(async (resolve) => {
      queryAlternativesRemote.innerHTML = "";
      queryAlternativesSwedishDefinition.innerHTML = "";
      queryAlternativesSwedishDefinition2.innerHTML = "";

      const resolveEmpty = () => {
        resolve([]);
      };

      if (location.origin !== "https://arthow4n.github.io") {
        resolveEmpty();
        return;
      }

      if (getCurrentSourceLanguage() !== "sv") {
        resolveEmpty();
        return;
      }

      try {
        const res = await fetch(
          `https://fetch-swe-compounds.deno.dev/analyse?cacheBuster=3&word=${encodedText}`
        );
        if (res.status !== 200) {
          return resolveEmpty();
        }
        resolve(await res.json());
      } catch {
        resolveEmpty();
      }
    });

    if (queryInput.value === cleanedText) {
      const saolCompounds = remoteCompounds.filter(
        (r) => r.upstream === "saol"
      );
      const soCompounds = remoteCompounds.filter((r) => r.upstream === "so");

      const wordParts = uniq([
        saolCompounds.map((r) => r.baseform).join("+"),
        saolCompounds.flatMap((r) => r.compoundsLemma).join("+"),
        saolCompounds.flatMap((r) => r.compounds).join("+"),
      ])
        .filter((x) => x)
        .join(", ");

      queryAlternativesRemote.innerHTML = toWordSpans(wordParts);
      markAvailableEnglishTranslationsInDescendants(queryAlternativesRemote);

      queryAlternativesSwedishDefinition.innerHTML = toWordSpans(
        saolCompounds.flatMap((r) => r.definitions).join("; ")
      );
      markAvailableEnglishTranslationsInDescendants(
        queryAlternativesSwedishDefinition
      );

      queryAlternativesSwedishDefinition2.innerHTML = toWordSpans(
        soCompounds.flatMap((r) => r.definitions).join("; ")
      );
      markAvailableEnglishTranslationsInDescendants(
        queryAlternativesSwedishDefinition2
      );
    }
  };

  const setEnglishTranslation = async () => {
    queryAlternativesEnglishTranslation.innerHTML = "";

    const translations = await queryEnglishTranslation(cleanedText);

    if (queryInput.value === cleanedText) {
      queryAlternativesEnglishTranslation.innerHTML = toWordSpans(
        translations.length ? translations.join("; ") : cleanedText,
        {
          className: "word-english",
        }
      );
    }
  };

  Promise.all([
    !keepQueryAlternatives && setLocal().catch(console.error),
    !keepQueryAlternatives && setRemote().catch(console.error),
    setEnglishTranslation().catch(console.error),
  ]).then(() => {
    if (queryInput.value === cleanedText && !keepQueryAlternatives) {
      queryAlternativesContainer.scrollTo(0, 0);
    }
  });
};

queryInput.closest("form").addEventListener("submit", (event) => {
  event.preventDefault();
  updateDictionaryViews(queryInput.value, { cleanup: false });
});

queryInput.addEventListener("focus", (event) => {
  queryInput.select();
});

queryInput.addEventListener("paste", (event) => {
  const text = event.clipboardData.getData("Text");
  if (text) {
    event.preventDefault();
    // Cleaning pasted data makes it easier to paste from SAOL.
    updateDictionaryViews(text);
  }
});

// Force blur away from SAOL iframe for once because SAOL steals focus to its input with its JS
{
  let getFocusBackFromSaolInterval;
  saol.addEventListener("load", () => {
    clearInterval(getFocusBackFromSaolInterval);
    getFocusBackFromSaolInterval = setInterval(() => {
      if (document.activeElement === saol) {
        clearInterval(getFocusBackFromSaolInterval);
        saol.blur();
      }
    }, 50);
  });
}

let hasShownEnglishDictionaryDelayedPrompt = false;

export const showEnglishDictionary = (word) => {
  dicSubSingle.classList.add("active");
  setIsDictionaryVisible(true);

  const show = () => {
    const next = `https://www.thefreedictionary.com/${encodeURIComponent(
      word
    )}#Definition`;
    if (englishDictionary.src !== next) {
      // There's a very aggressive cookie modal inside that doesn't stop showing even after accepting.
      englishDictionary.sandbox = "";
      englishDictionary.src = next;
    }
  };

  if (hasShownEnglishDictionaryDelayedPrompt) {
    show();
  } else {
    hasShownEnglishDictionaryDelayedPrompt = true;
    setTimeout(show, 1000);
  }
};

window.addEventListener("resize", () => {
  if (!isElementVisible(keepDictionaryVisibleCheckBox)) {
    keepDictionaryVisibleCheckBox.checked = true;
    setIsDictionaryVisible(keepDictionaryVisibleCheckBox.checked);
  }
});

const englishReaderModeClassName = "english-reader-mode";
englishReaderModeCheckBox.addEventListener("change", () => {
  dicSubSingle.classList.add("active");
  document.body.classList.remove(englishReaderModeClassName);
  if (englishReaderModeCheckBox.checked) {
    hasShownEnglishDictionaryDelayedPrompt = true;
    document.body.classList.add(englishReaderModeClassName);
  }
});
