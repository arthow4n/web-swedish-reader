import {
  hideDictionaryIfNotOpenedFromCheckBox,
  queryInput,
  showCambridgeDictionary,
  updateDictionaryViews,
  englishReaderModeCheckBox,
} from "./dictionaryView.mjs";
import {
  wordSelectedInAreaClassName,
  toWordSpans,
  debounce,
} from "./utils.mjs";
import { speakOnClick } from "./tts.mjs";

const clearAndEditButtons = document.querySelectorAll(".control-clear");
const editButton = document.querySelector(".control-edit");
const importButtons = document.querySelectorAll(".control-import");
const finishEditButtons = document.querySelectorAll(".control-finish-edit");
const ocrButtons = document.querySelectorAll(".control-ocr");
const fullScreenButton = document.querySelector(".control-full-screen");
const main = document.querySelector("main");
const article = document.querySelector("article");

const mainScrollQueryKey = "mainScrollId";
const setMainScrollState = (num) => {
  const url = new URL(location);
  let storageId = url.searchParams.get(mainScrollQueryKey);

  if (num) {
    if (!storageId) {
      // Not ideal but good enough.
      storageId = Date.now();
      url.searchParams.set(mainScrollQueryKey, storageId);
      history.replaceState(undefined, undefined, url);
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
  history.replaceState(undefined, undefined, url);
};

const onMainScroll = debounce(() => {
  setMainScrollState(main.scrollTop);
});

const updateArticle = (input, init = false) => {
  history.pushState(undefined, undefined, "#text=" + encodeURIComponent(input));

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
  if (!init) {
    url.searchParams.delete(mainScrollQueryKey);
    history.replaceState(undefined, undefined, url);
  }

  main.scrollTo(
    0,
    init
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
    updateArticle(article.innerText);
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

  const hashQuery = new URLSearchParams(location.hash.slice(1));
  const hashText = hashQuery.get("text");

  if (hashText) {
    updateArticle(hashText, true);
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
    showCambridgeDictionary(event.target.innerText);
    return;
  }

  if (!event.target.classList.contains("word")) {
    return;
  }

  speakOnClick("sv", event.target.innerText);

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

ocrButtons.forEach((ocrButton) =>
  ocrButton.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.hidden = true;
    input.onchange = (event) => {
      (async () => {
        const files = [...event.target.files];
        const progressSlots = files.map(() => 0);
        ocrButton.innerText = "Preparing...";
        ocrButton.disabled = true;

        const results = await Promise.all(
          files.map(async (file, fileIndex) => {
            await import(
              "https://unpkg.com/tesseract.js@v2.1.0/dist/tesseract.min.js"
            );

            const text = await Tesseract.recognize(file, "swe", {
              logger: ({ status, progress }) => {
                if (status === "recognizing text") {
                  progressSlots[fileIndex] = progress;
                  ocrButton.innerText =
                    (
                      progressSlots.reduce((prev, curr) => prev + curr, 0) * 100
                    ).toFixed(2) + "%";
                }
              },
            })
              .then(({ data: { text } }) => text)
              .catch(() => "");

            return {
              fileName: file.name,
              text,
            };
          })
        );
        document.body.removeChild(input);
        article.innerText = results
          .map(
            (r) => `==start: ${r.fileName}\n\n${r.text}\n\n==end: ${r.fileName}`
          )
          .join("\n\n");
        setIsEditMode(false);
      })()
        .catch()
        .finally(() => {
          ocrButton.innerText = "📸";
          ocrButton.disabled = false;
        });
    };

    document.body.appendChild(input);
    input.click();
  })
);
