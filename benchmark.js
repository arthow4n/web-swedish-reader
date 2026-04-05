// using jsdom instead to simulate localStorage without playwright
import { JSDOM } from "jsdom";

const dom = new JSDOM("", { url: "http://localhost" });
const localStorage = dom.window.localStorage;

// Fill localStorage with dummy data
localStorage.clear();
for (let i = 0; i < 5000; i++) {
  localStorage.setItem(`articleFromLocalStorageKey=${i}`, "data");
}
for (let i = 0; i < 5000; i++) {
  localStorage.setItem(`otherKey=${i}`, "data");
}

// Original buggy version
const startOriginal = performance.now();
for (let i = 0; i < localStorage.length; i++) {
  const keyName = localStorage.key(i);
  if (keyName && keyName.startsWith("articleFromLocalStorageKey=")) {
    localStorage.removeItem(keyName);
  }
}
const endOriginal = performance.now();
console.log(`Original Time: ${endOriginal - startOriginal} ms`);

let remainingOriginal = 0;
for (let i = 0; i < localStorage.length; i++) {
  if (localStorage.key(i).startsWith("articleFromLocalStorageKey="))
    remainingOriginal++;
}
console.log(
  `Remaining matching keys after Original (BUG!): ${remainingOriginal}`,
);

// Fill again
localStorage.clear();
for (let i = 0; i < 5000; i++) {
  localStorage.setItem(`articleFromLocalStorageKey=${i}`, "data");
}
for (let i = 0; i < 5000; i++) {
  localStorage.setItem(`otherKey=${i}`, "data");
}

// New version
const startNew = performance.now();
const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
  const keyName = localStorage.key(i);
  if (keyName && keyName.startsWith("articleFromLocalStorageKey=")) {
    keysToRemove.push(keyName);
  }
}
for (const key of keysToRemove) {
  localStorage.removeItem(key);
}

const endNew = performance.now();
console.log(`New Time: ${endNew - startNew} ms`);

let remainingNew = 0;
for (let i = 0; i < localStorage.length; i++) {
  if (localStorage.key(i).startsWith("articleFromLocalStorageKey="))
    remainingNew++;
}
console.log(`Remaining matching keys after New: ${remainingNew}`);

// Second new version (backwards iteration)
localStorage.clear();
for (let i = 0; i < 5000; i++) {
  localStorage.setItem(`articleFromLocalStorageKey=${i}`, "data");
}
for (let i = 0; i < 5000; i++) {
  localStorage.setItem(`otherKey=${i}`, "data");
}

const startNew2 = performance.now();
for (let i = localStorage.length - 1; i >= 0; i--) {
  const keyName = localStorage.key(i);
  if (keyName && keyName.startsWith("articleFromLocalStorageKey=")) {
    localStorage.removeItem(keyName);
  }
}
const endNew2 = performance.now();
console.log(`New Time 2 (backwards): ${endNew2 - startNew2} ms`);
