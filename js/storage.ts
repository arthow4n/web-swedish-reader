import { set, get, del, keys, createStore } from "idb-keyval";

export const articleFromLocalStorageKey = "articleFromLocalStorageKey";
export const mainScrollQueryKey = "mainScrollId";

export const dataStore = createStore("wsr-data", "wsr-data");

export interface StoredArticle {
  text: string;
  isMarkdown: boolean;
}

export const migrateLocalStorageToIndexedDB = async (): Promise<void> => {
  try {
    const keysToMigrate: string[] = [];
    const settingKeysToCopy: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        if (
          key.startsWith(`${articleFromLocalStorageKey}=`) ||
          key.startsWith(`${mainScrollQueryKey}=`)
        ) {
          keysToMigrate.push(key);
        } else if (key.startsWith("__settings_")) {
          settingKeysToCopy.push(key);
        }
      }
    }

    for (const key of keysToMigrate) {
      const value = localStorage.getItem(key);
      if (value !== null) {
        await set(key, value, dataStore);
        localStorage.removeItem(key);
      }
    }

    for (const key of settingKeysToCopy) {
      const settingVal = localStorage.getItem(key);
      if (settingVal !== null) {
        await set(key, settingVal, dataStore);
      }
    }
  } catch (err) {
    console.error(
      "Failed to migrate data from localStorage to IndexedDB:",
      err,
    );
  }
};

export const saveArticleToStorage = async ({
  key,
  text,
  isMarkdown,
}: {
  key: string;
  text: string;
  isMarkdown: boolean;
}): Promise<void> => {
  await set(`${articleFromLocalStorageKey}=${key}`, text, dataStore);
  await set(
    `${articleFromLocalStorageKey}=${key}.isMarkdown`,
    isMarkdown.toString(),
    dataStore,
  );
};

export const getArticleFromStorage = async ({
  key,
}: {
  key: string;
}): Promise<StoredArticle | null> => {
  const storageTextKey = `${articleFromLocalStorageKey}=${key}`;
  const storageMarkdownKey = `${articleFromLocalStorageKey}=${key}.isMarkdown`;

  let text = await get<string>(storageTextKey, dataStore);
  let isMarkdownRaw = await get<string>(storageMarkdownKey, dataStore);

  // Fallback and migrate on-the-fly if key was still in localStorage
  if (text === undefined) {
    const legacyText = localStorage.getItem(storageTextKey);
    if (legacyText !== null) {
      text = legacyText;
      await set(storageTextKey, text, dataStore);
      localStorage.removeItem(storageTextKey);
    }
  }

  if (isMarkdownRaw === undefined) {
    const legacyMarkdown = localStorage.getItem(storageMarkdownKey);
    if (legacyMarkdown !== null) {
      isMarkdownRaw = legacyMarkdown;
      await set(storageMarkdownKey, isMarkdownRaw, dataStore);
      localStorage.removeItem(storageMarkdownKey);
    }
  }

  if (text === undefined || text === null) {
    return null;
  }

  return {
    text,
    isMarkdown: isMarkdownRaw === "true",
  };
};

export const clearAllArticlesFromStorage = async (): Promise<void> => {
  try {
    const allKeys = await keys(dataStore);
    for (const key of allKeys) {
      if (
        typeof key === "string" &&
        key.startsWith(`${articleFromLocalStorageKey}=`)
      ) {
        await del(key, dataStore);
      }
    }
  } catch (err) {
    console.error("Failed to clear articles from IndexedDB:", err);
  }

  const legacyKeysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(`${articleFromLocalStorageKey}=`)) {
      legacyKeysToRemove.push(key);
    }
  }
  for (const key of legacyKeysToRemove) {
    localStorage.removeItem(key);
  }
};

export const saveScrollPosition = async ({
  storageId,
  position,
}: {
  storageId: string;
  position: number;
}): Promise<void> => {
  await set(
    `${mainScrollQueryKey}=${storageId}`,
    position.toString(),
    dataStore,
  );
};

export const getScrollPosition = async ({
  storageId,
}: {
  storageId: string;
}): Promise<number> => {
  const scrollKey = `${mainScrollQueryKey}=${storageId}`;
  let val = await get<string>(scrollKey, dataStore);

  if (val === undefined) {
    const legacyVal = localStorage.getItem(scrollKey);
    if (legacyVal !== null) {
      val = legacyVal;
      await set(scrollKey, val, dataStore);
      localStorage.removeItem(scrollKey);
    }
  }

  return val ? parseInt(val, 10) || 0 : 0;
};

export const removeScrollPosition = async ({
  storageId,
}: {
  storageId: string;
}): Promise<void> => {
  const scrollKey = `${mainScrollQueryKey}=${storageId}`;
  await del(scrollKey, dataStore);
  localStorage.removeItem(scrollKey);
};

export const pruneScrollPositions = async (): Promise<void> => {
  try {
    const allKeys = await keys(dataStore);
    const scrollKeys = allKeys
      .filter(
        (k): k is string =>
          typeof k === "string" && k.startsWith(`${mainScrollQueryKey}=`),
      )
      .sort()
      .reverse()
      .slice(2048);

    for (const key of scrollKeys) {
      await del(key, dataStore);
    }
  } catch (err) {
    console.error("Failed to prune scroll positions from IndexedDB:", err);
  }
};
