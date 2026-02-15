import {
  set,
  get,
  createStore,
} from "https://cdn.jsdelivr.net/npm/idb-keyval@6/+esm";
import { uniq } from "./utils.mjs";

const dictionaryStore = createStore("wsr-dictionary", "wsr-dictionary");

const installDictionary = async (dictionaryName, moduleDataAccessor) => {
  const storageKey = `_2_${dictionaryName}`;
  const dir = `${location.origin}/web-swedish-reader-data/${dictionaryName}`;

  try {
    const { getInfo } = await import(`${dir}/${dictionaryName}.meta.mjs`);
    const { chunks, totalEntriesCount } = getInfo();

    if (chunks.length !== 1) {
      throw new Error(`Can't update ${dictionaryName}.`);
    }
    const { name, version: expectedVersion, entriesCount } = chunks[0];

    const stored = await get(storageKey, dictionaryStore);

    if (stored?.version === expectedVersion) {
      return stored.data;
    }

    const dictionaryModule = await import(`${dir}/${name}`);
    const { version: fetchedVersion } = dictionaryModule;
    if (fetchedVersion !== expectedVersion) {
      throw new Error(
        `Remote version mistmatch: fetchedVersion=${fetchedVersion}, expectedVersion=${expectedVersion}`
      );
    }

    const data = moduleDataAccessor(dictionaryModule);
    await set(
      storageKey,
      {
        version: fetchedVersion,
        data,
      },
      dictionaryStore
    );
    return data;
  } catch (err) {
    queryAlternativesLocal.innerHTML = `Error! ${queryAlternativesLocal.innerHTML}`;
    throw err;
  }
};

const installDictionaries = async () => {
  const [folketsCompound, folketsSven] = await Promise.all([
    installDictionary("folkets-compound", (m) => new Set(m.getCompoundParts())),
    installDictionary("folkets-sven", (m) => m.getTranslationLookUp()),
  ]);

  return {
    folketsCompound,
    folketsSven,
  };
};

const installationPromise = installDictionaries();

export const queryCompounds = async (word) => {
  const { folketsCompound } = await installationPromise;

  const compoundsSet = new Set();

  const sliceDownForward = (word, init = false, power = 0) => {
    if (!word) {
      return [];
    }

    if (word.length === 1) {
      return [word];
    }

    if (folketsCompound.has(word) && power <= 0) {
      // Break down trailing s because it often causes query miss on Folkets Lexikon.
      if (!init && word.startsWith("s")) {
        const withoutLeadingS = word.slice(1);

        if (folketsCompound.has(withoutLeadingS)) {
          return ["s", withoutLeadingS];
        }
      }

      return [word];
    }

    for (let i = word.length - 1; i > 0; i--) {
      const slice = word.slice(0, i);

      if (!init && slice.startsWith("s")) {
        const withoutLeadingS = slice.slice(1);

        if (folketsCompound.has(withoutLeadingS)) {
          return [
            "s",
            withoutLeadingS,
            sliceDownForward(word.slice(i), false, power - 1),
          ];
        }
      }

      if (folketsCompound.has(slice)) {
        return [slice, sliceDownForward(word.slice(i), false, power - 1)];
      }
    }

    const drop = word.slice(1);
    return drop ? [word[0], sliceDownForward(drop, false, power - 1)] : [word];
  };

  const sliceDownBackward = (word, init = false, power = 0) => {
    if (!word) {
      return [];
    }

    if (word.length === 1) {
      return [word];
    }

    if (folketsCompound.has(word) && power <= 0) {
      if (!init && word.endsWith("s")) {
        const withoutEndingS = word.slice(0, word.length - 1);

        if (folketsCompound.has(withoutEndingS)) {
          return [withoutEndingS, "s"];
        }
      }

      return [word];
    }

    for (let i = 1; i < word.length; i++) {
      const slice = word.slice(i, word.length);

      if (!init && slice.endsWith("s")) {
        const withoutEndingS = word.slice(i, word.length - 1);

        if (folketsCompound.has(withoutEndingS)) {
          return [
            sliceDownBackward(word.slice(0, i), false, power - 1),
            withoutEndingS,
            "s",
          ];
        }
      }

      if (folketsCompound.has(slice)) {
        return [sliceDownBackward(word.slice(0, i), false, power - 1), slice];
      }
    }

    const drop = word.slice(0, word.length - 1);
    return drop
      ? [sliceDownBackward(drop, false, power - 1), word.slice(-1)]
      : [word];
  };

  const join = (x) => {
    const joined = x
      .flat(Infinity)
      .filter((x) => x)
      .join("+")
      // Attemp to clean up the result to make better guess for example elgitarr+s+r+i+f+f => elgitarr+s+riff
      .replace(
        // First 2 groups are mandatory to not join e.g. o+gillar
        /(^|\+)([^s])(?:\+([^s]))(?:\+([^s]))?(?:\+([^s]))?(?:\+([^s]))?(?:\+([^s]))?(?:\+([^s]))?(?:\+([^s]))?(?:\+([^s]))?(?:\+([^s]))?/gu,
        (match, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11) =>
          [p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11]
            .filter((x) => x)
            .join("")
      );

    console.log(`Compound tree for ${word}: ${joined} => ${JSON.stringify(x)}`);
    return joined;
  };

  const f0 = join(sliceDownForward(word, true));
  const f1 = join(sliceDownForward(word, true, 1));
  compoundsSet.add(f0);
  compoundsSet.add(f1);

  const b0 = join(sliceDownBackward(word, true));
  const b1 = join(sliceDownBackward(word, true, 1));
  compoundsSet.add(b0);
  compoundsSet.add(b1);

  // Move/append the original word to the end,
  // so it's easier for the user to jump back from query alternatives to the original word.
  compoundsSet.delete(word);
  compoundsSet.add(word);

  return {
    baseforms: [],
    compounds: Array.from(compoundsSet).filter((x) => x),
  };
};

export const getCurrentSourceLanguage = () => {
  const sourceLanguage =
    new URLSearchParams(location.search).get("sourceLanguage") || "sv";
  return sourceLanguage;
};

export const queryEnglishTranslation = async (word) => {
  const sourceLanguage = getCurrentSourceLanguage();
  if (sourceLanguage !== "sv") {
    try {
      const res = await fetch(
        `https://fetch-swe-compounds.deno.dev/analyse?cacheBuster=5&sourceLanguage=${sourceLanguage}&word=${encodeURIComponent(
          word
        )}`
      ).then((x) => x.json());

      return uniq(res.flatMap((r) => r.definitions));
    } catch (err) {
      console.error(err);
      return [];
    }
  }

  const { folketsSven } = await installationPromise;

  return folketsSven[word] ?? [];
};
