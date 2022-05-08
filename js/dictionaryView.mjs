import { wordClassName, toWordSpans, uniq } from "./utils.mjs";
import {
  queryCompounds,
  queryEnglishTranslation,
} from "./dictionaryDatabase.mjs";

const queryInput = document.querySelector(".dics-query-input");
const expandCheckbox = document.querySelector(".label-dics-expand input");
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
const queryAlternativesEnglishTranslation = document.querySelector(
  ".query-alternatives-line-english-translation"
);
const deeperAlternativesButton = document.querySelector(
  ".control-deeper-alternatives"
);

// const folkets = document.querySelector(".dic-folkets");
const saol = document.querySelector(".dic-saol");
const dicSubSingle = document.querySelector(".dic-sub-single");
const cambridge = document.querySelector(".dic-cambridge");

const searchGoogleButton = document.querySelector(".control-search-google");
const searchWiktionaryButton = document.querySelector(
  ".control-search-wiktionary"
);
const searchTydaButton = document.querySelector(".control-search-tyda");

const openExternal = (link) => {
  window.open(link, "_blank", "noopener,noreferrer");
};

export const updateDictionaryViews = async (
  text,
  { cleanup = true, keepQueryAlternatives = false } = {}
) => {
  const cleanedText = (
    cleanup ? text.replace(/(^[^\p{L}]+|[^\p{L}]+$)/gu, "") : text
  ).toLocaleLowerCase();
  const encodedText = encodeURIComponent(cleanedText);
  const url = new URL(location);

  dicSubSingle.classList.remove("active");

  if (!encodedText) {
    url.searchParams.delete("dictionaryQuery");
    history.replaceState(undefined, undefined, url);
    searchGoogleButton.onclick = undefined;
    searchWiktionaryButton.onclick = undefined;
    searchTydaButton.onclick = undefined;
    queryAlternativesLocal.innerHTML = "";
    queryAlternativesRemote.innerHTML = "";
    queryAlternativesEnglishTranslation.innerHTML = "";
    // folkets.removeAttribute("src");
    saol.removeAttribute("src");
    cambridge.removeAttribute("src");
    return;
  }

  url.searchParams.set("dictionaryQuery", cleanedText);
  history.replaceState(undefined, undefined, url);
  queryInput.value = cleanedText;
  searchGoogleButton.onclick = () => {
    openExternal(`https://www.google.com/search?q=${encodedText}`);
  };
  searchWiktionaryButton.onclick = () => {
    openExternal(`https://sv.wiktionary.org/wiki/${encodedText}#Svenska`);
  };
  searchTydaButton.onclick = () => {
    openExternal(`https://tyda.se/search/${encodedText}`);
  };
  // {
  //   const next = `https://folkets-lexikon.csc.kth.se/folkets/service?lang=sv&interface=sv&word=${encodedText}`;
  //   if (folkets.src !== next) folkets.src = next;
  // }
  {
    const next = `https://svenska.se/tre/?sok=${encodedText}`;
    if (saol.src !== next) saol.src = next;
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
      const resolveEmpty = () => {
        resolve({
          baseform: "",
          compounds: [],
          compoundsLemma: [],
          alternatives: [],
          definitions: [],
        });
      };

      if (location.origin !== "https://arthow4n.github.io") {
        resolveEmpty();
        return;
      }

      try {
        // Server was on Fly.io because I thought I needed a bigger DB,
        // moved to Heroku to sleep better on the free tier network bandwidth.
        const res = await fetch(
          `https://nameless-sierra-00019.herokuapp.com/compounds?cacheBuster=2&word=${encodedText}`
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
      const wordParts = uniq([
        remoteCompounds.alternatives.join("+"),
        remoteCompounds.compoundsLemma.join("+"),
        remoteCompounds.compounds.join("+"),
        remoteCompounds.baseform,
      ])
        .filter((x) => x)
        .join(", ");
      queryAlternativesRemote.innerHTML = toWordSpans(wordParts);
      markAvailableEnglishTranslationsInDescendants(queryAlternativesRemote);

      const definitions = remoteCompounds.definitions.join("; ");
      queryAlternativesSwedishDefinition.innerHTML = toWordSpans(definitions);
    }
  };

  const setEnglishTranslation = async () => {
    const translations = await queryEnglishTranslation(cleanedText);

    if (queryInput.value === cleanedText) {
      queryAlternativesEnglishTranslation.innerHTML = toWordSpans(
        translations.join("; "),
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

deeperAlternativesButton.addEventListener("click", () => {
  updateDictionaryViews(queryInput.value);
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

export const setIsQueryExpanded = (isExpanded) => {
  expandCheckbox.checked = isExpanded;
  document.body.classList.remove("is-query-expanded");
  if (isExpanded) {
    document.body.classList.add("is-query-expanded");
  }
};

expandCheckbox.addEventListener("change", () => {
  setIsQueryExpanded(expandCheckbox.checked);
});
