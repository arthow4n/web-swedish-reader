export const wordClassName = "word";

export const toWordSpans = (text, { className = "" } = {}) =>
  text
    // Drop format characters e.g. soft hyphen (\u00AD) because it breaks a word into multiple parts which is often not desirable for searching dictionary,
    // although it could be useful for compoud guessing in some cases
    .replace(/\p{Cf}/gu, "")
    .replace(/[\p{L}&<>"']+/gu, (x) => {
      return `<span class="${wordClassName} ${className}" role="button" tabindex="0">${x
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")}</span>`;
    });

export const uniq = (x) => Array.from(new Set(x));

export const debounce = (fn, ms = 300) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  };
};
