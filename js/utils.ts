export const wordClassName = "word";
export const wordSelectedInAreaClassName = "word-selected-in-area";

export const toWordSpans = (
  text: string,
  { className }: { className: string },
) =>
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

export const uniq = <T>(x: T[]): T[] => Array.from(new Set(x));

export const debounce = <T extends (...args: any[]) => void>(
  fn: T,
  ms: number,
) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  };
};

export const isElementVisible = (x: HTMLElement) => {
  return x.offsetWidth || x.offsetHeight || x.getClientRects().length;
};

export const sleep = async (ms: number): Promise<void> => {
  await new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
};
