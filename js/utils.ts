export const wordClassName = "word";
export const wordSelectedInAreaClassName = "word-selected-in-area";

export const toWordSpans = (
  text: string,
  { className }: { className: string },
) => {
  const fragment = document.createDocumentFragment();
  // Drop format characters e.g. soft hyphen (\u00AD) because it breaks a word into multiple parts which is often not desirable for searching dictionary,
  // although it could be useful for compoud guessing in some cases
  const cleanedText = text.replace(/\p{Cf}/gu, "");

  const regex = /([\p{L}&<>"']+)/gu;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(cleanedText)) !== null) {
    if (match.index > lastIndex) {
      fragment.appendChild(
        document.createTextNode(cleanedText.slice(lastIndex, match.index))
      );
    }

    const span = document.createElement("span");
    span.className = `${wordClassName} ${className}`.trim();
    span.setAttribute("role", "button");
    span.setAttribute("tabindex", "0");
    span.textContent = match[0];
    fragment.appendChild(span);

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < cleanedText.length) {
    fragment.appendChild(
      document.createTextNode(cleanedText.slice(lastIndex))
    );
  }

  return fragment;
};

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
