import { wordClassName, toWordSpans, uniq, isElementVisible } from "./utils";
import {
  queryCompounds,
  queryEnglishTranslation,
  getCurrentSourceLanguage,
} from "./dictionaryDatabase";
import {
  bindTextInputToSetting,
  readSetting,
  settingKeys,
  writeSetting,
} from "./settings";

const _queryInput = document.querySelector(".dics-query-input");
if (!(_queryInput instanceof HTMLInputElement)) {
  throw new Error("Query input not found");
}
export const queryInput = _queryInput;

const keepDictionaryVisibleCheckBox = document.querySelector(
  ".label-dics-expand input",
);
if (!(keepDictionaryVisibleCheckBox instanceof HTMLInputElement)) {
  throw new Error("Keep dictionary visible checkbox not found");
}

const queryAlternativesContainer = document.querySelector(
  ".query-alternatives",
);
if (!(queryAlternativesContainer instanceof HTMLElement)) {
  throw new Error("Query alternatives container not found");
}

export const queryAlternativesLocal = document.querySelector(
  ".query-alternatives-line-local",
);
if (!(queryAlternativesLocal instanceof HTMLElement)) {
  throw new Error("Query alternatives local not found");
}

const queryAlternativesRemote = document.querySelector(
  ".query-alternatives-line-remote",
);
if (!(queryAlternativesRemote instanceof HTMLElement)) {
  throw new Error("Query alternatives remote not found");
}

const queryAlternativesSwedishDefinition = document.querySelector(
  ".query-alternatives-line-swedish-definition",
);
if (!(queryAlternativesSwedishDefinition instanceof HTMLElement)) {
  throw new Error("Query alternatives Swedish definition not found");
}

const queryAlternativesSwedishDefinition2 = document.querySelector(
  ".query-alternatives-line-swedish-definition-2",
);
if (!(queryAlternativesSwedishDefinition2 instanceof HTMLElement)) {
  throw new Error("Query alternatives Swedish definition 2 not found");
}

const queryAlternativesEnglishTranslation = document.querySelector(
  ".query-alternatives-line-english-translation",
);
if (!(queryAlternativesEnglishTranslation instanceof HTMLElement)) {
  throw new Error("Query alternatives English translation not found");
}

const youglishSwedishButton = document.querySelector(
  ".control-youglish-swedish",
);
if (!(youglishSwedishButton instanceof HTMLButtonElement)) {
  throw new Error("Youglish Swedish button not found");
}

const _englishReaderModeCheckBox = document.querySelector(
  ".settings-english-reader-mode-checkbox",
);
if (!(_englishReaderModeCheckBox instanceof HTMLInputElement)) {
  throw new Error("English reader mode checkbox not found");
}
export const englishReaderModeCheckBox = _englishReaderModeCheckBox;

const saol = document.querySelector(".dic-saol");
if (!(saol instanceof HTMLIFrameElement)) {
  throw new Error("SAOL iframe not found");
}

const dicSubSingle = document.querySelector(".dic-sub-single");
if (!(dicSubSingle instanceof HTMLElement)) {
  throw new Error("Dic sub single not found");
}

const englishDictionary = document.querySelector(".dic-english");
if (!(englishDictionary instanceof HTMLIFrameElement)) {
  throw new Error("English dictionary iframe not found");
}

const searchGoogleButton = document.querySelector(".control-search-google");
if (!(searchGoogleButton instanceof HTMLButtonElement)) {
  throw new Error("Search Google button not found");
}

const searchWiktionaryButton = document.querySelector(
  ".control-search-wiktionary",
);
if (!(searchWiktionaryButton instanceof HTMLButtonElement)) {
  throw new Error("Search Wiktionary button not found");
}

const searchKorpButton = document.querySelector(".control-search-korp");
if (!(searchKorpButton instanceof HTMLButtonElement)) {
  throw new Error("Search Korp button not found");
}

const searchSlangopediaButton = document.querySelector(
  ".control-search-slangopedia",
);
if (!(searchSlangopediaButton instanceof HTMLButtonElement)) {
  throw new Error("Search Slangopedia button not found");
}

const toggleSoButton = document.querySelector(".control-toggle-so");
if (!(toggleSoButton instanceof HTMLButtonElement)) {
  throw new Error("Toggle SO button not found");
}

const openExternal = (link: string) => {
  window.open(link, "_blank", "noopener,noreferrer");
};

const isDictionaryVisibleClassName = "is-dictionary-visible";

export const checkIsDictionaryVisible = () => {
  return document.body.classList.contains(isDictionaryVisibleClassName);
};

export const setIsDictionaryVisible = (isVisible: boolean) => {
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
    keepDictionaryVisibleCheckBox.checked,
  );
  setIsDictionaryVisible(keepDictionaryVisibleCheckBox.checked);
});

keepDictionaryVisibleCheckBox.checked = readSetting(
  settingKeys.__settings_keepDictionaryVisibleCheckBox_checked,
  true,
);
setIsDictionaryVisible(keepDictionaryVisibleCheckBox.checked);

export const updateDictionaryViews = async ({
  text,
  cleanup,
  keepQueryAlternatives,
  shouldSetDictionaryToVisible,
}: {
  text: string;
  cleanup: boolean;
  keepQueryAlternatives: boolean;
  shouldSetDictionaryToVisible: boolean;
}) => {
  const cleanedText = (
    cleanup ? text.replace(/(^[^\p{L}]+|[^\p{L}]+$)/gu, "") : text
  ).toLocaleLowerCase();
  const encodedText = encodeURIComponent(cleanedText);
  dicSubSingle.classList.remove("active");

  if (!encodedText) {
    searchGoogleButton.onclick = null;
    searchWiktionaryButton.onclick = null;
    youglishSwedishButton.onclick = null;
    toggleSoButton.onclick = null;
    queryAlternativesLocal.replaceChildren();
    queryAlternativesRemote.replaceChildren();
    queryAlternativesEnglishTranslation.replaceChildren();
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
  searchKorpButton.onclick = () => {
    openExternal(
      `https://spraakbanken.gu.se/korp/#?cqp=%5B%5D&corpus=attasidor,da,svt-2004,svt-2005,svt-2006,svt-2007,svt-2008,svt-2009,svt-2010,svt-2011,svt-2012,svt-2013,svt-2014,svt-2015,svt-2016,svt-2017,svt-2018,svt-2019,svt-2020,svt-2021,svt-2022,svt-2023,svt-nodate&search=word%7C${encodedText}`,
    );
  };
  searchSlangopediaButton.onclick = () => {
    // Slangopedia uses ISO-8859-1 encoding so åäö encode differently than UTF-8
    openExternal(
      `https://mobil.slangopedia.se/mobil/ordlista/?ord=${encodeURIComponent(
        escape(cleanedText),
      ).replaceAll("%25", "%")}`,
    );
  };
  youglishSwedishButton.onclick = () => {
    openExternal(`https://youglish.com/pronounce/${encodedText}/swedish?`);
  };
  toggleSoButton.onclick = () => {
    queryAlternativesContainer.classList.toggle(
      "query-alternatives-so-expanded",
    );
  };
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

  const markAvailableEnglishTranslationsInDescendants = async (
    element: HTMLElement,
  ) => {
    await Promise.all(
      Array.from(element.querySelectorAll("." + wordClassName)).map(
        async (wordElement) => {
          if (!(wordElement instanceof HTMLElement)) return;
          const word = wordElement.innerText;
          const translations = await queryEnglishTranslation(word);
          if (translations.length) {
            wordElement.classList.add("word-has-english-translation");
          }
        },
      ),
    );
  };

  const setLocal = async () => {
    queryAlternativesLocal.replaceChildren();

    if (getCurrentSourceLanguage() !== "sv") {
      return;
    }

    const localEntry = await queryCompounds(cleanedText);
    if (queryInput.value === cleanedText) {
      if (!localEntry) {
        queryAlternativesLocal.replaceChildren();
      } else {
        queryAlternativesLocal.replaceChildren(
          toWordSpans(
            uniq([...localEntry.compounds, ...localEntry.baseforms])
              .filter((x) => x)
              .join(", "),
            { className: "" },
          )
        );
      }

      markAvailableEnglishTranslationsInDescendants(queryAlternativesLocal);
    }
  };

  const setRemote = async () => {
    const remoteCompounds = await new Promise<any[]>(async (resolve) => {
      queryAlternativesRemote.replaceChildren();
      queryAlternativesSwedishDefinition.replaceChildren();
      queryAlternativesSwedishDefinition2.replaceChildren();

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
          `https://fetch-swe-compounds.deno.dev/analyse?cacheBuster=5&word=${encodedText}`,
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
        (r: any) => r.upstream === "saol",
      );
      const soCompounds = remoteCompounds.filter(
        (r: any) => r.upstream === "so",
      );

      const wordParts = uniq([
        ...saolCompounds.map((r: any) => r.baseform),
        ...saolCompounds.map((r: any) => r.compoundsLemma.join("+")),
        ...saolCompounds.map((r: any) => r.compounds.join("+")),
      ])
        .filter((x) => x)
        .join(", ");

      queryAlternativesRemote.replaceChildren(
        toWordSpans(wordParts, { className: "" })
      );
      markAvailableEnglishTranslationsInDescendants(queryAlternativesRemote);

      queryAlternativesSwedishDefinition.replaceChildren(
        toWordSpans(
          saolCompounds.flatMap((r: any) => r.definitions).join("; "),
          { className: "" },
        )
      );
      markAvailableEnglishTranslationsInDescendants(
        queryAlternativesSwedishDefinition,
      );

      queryAlternativesSwedishDefinition2.replaceChildren(
        toWordSpans(
          soCompounds.flatMap((r: any) => r.definitions).join("; "),
          { className: "" },
        )
      );
      markAvailableEnglishTranslationsInDescendants(
        queryAlternativesSwedishDefinition2,
      );
    }
  };

  const setEnglishTranslation = async () => {
    queryAlternativesEnglishTranslation.replaceChildren();

    const translations = await queryEnglishTranslation(cleanedText);

    if (queryInput.value === cleanedText) {
      queryAlternativesEnglishTranslation.replaceChildren(
        toWordSpans(
          translations.length ? translations.join("; ") : cleanedText,
          {
            className: "word-english",
          },
        )
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

const form = queryInput.closest("form");
if (!(form instanceof HTMLFormElement)) {
  throw new Error("Form not found for query input");
}
form.addEventListener("submit", (event) => {
  event.preventDefault();
  updateDictionaryViews({
    text: queryInput.value,
    cleanup: false,
    keepQueryAlternatives: false,
    shouldSetDictionaryToVisible: true,
  });
});

queryInput.addEventListener("focus", (event) => {
  queryInput.select();
});

queryInput.addEventListener("paste", (event: ClipboardEvent) => {
  if (!event.clipboardData) return;
  const text = event.clipboardData.getData("Text");
  if (text) {
    event.preventDefault();
    // Cleaning pasted data makes it easier to paste from SAOL.
    updateDictionaryViews({
      text,
      cleanup: true,
      keepQueryAlternatives: false,
      shouldSetDictionaryToVisible: true,
    });
  }
});

// Force blur away from SAOL iframe for once because SAOL steals focus to its input with its JS
{
  let getFocusBackFromSaolInterval: number;
  saol.addEventListener("load", () => {
    window.clearInterval(getFocusBackFromSaolInterval);
    getFocusBackFromSaolInterval = window.setInterval(() => {
      if (document.activeElement === saol) {
        window.clearInterval(getFocusBackFromSaolInterval);
        saol.blur();
      }
    }, 50);
  });
}

let hasShownEnglishDictionaryDelayedPrompt = false;

export const showEnglishDictionary = (word: string) => {
  dicSubSingle.classList.add("active");
  setIsDictionaryVisible(true);

  const show = () => {
    const next = `https://www.thefreedictionary.com/${encodeURIComponent(
      word,
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
