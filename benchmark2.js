// using jsdom instead to simulate localStorage without playwright
import { JSDOM } from "jsdom";

const dom = new JSDOM("", { url: "http://localhost" });
const localStorage = dom.window.localStorage;

// The previous benchmark showed that JSDOM's localStorage behaves weirdly and was slower.
// Let's create a pure JS Map simulation to see actual logic time vs overhead.
class MockLocalStorage {
  constructor() {
    this.store = new Map();
    this.keys = [];
  }

  setItem(key, value) {
    if (!this.store.has(key)) {
      this.keys.push(key);
    }
    this.store.set(key, value);
  }

  getItem(key) {
    return this.store.get(key) || null;
  }

  removeItem(key) {
    if (this.store.has(key)) {
      this.store.delete(key);
      this.keys = this.keys.filter((k) => k !== key); // naive but reflects shifting keys
    }
  }

  clear() {
    this.store.clear();
    this.keys = [];
  }

  key(index) {
    return this.keys[index] || null;
  }

  get length() {
    return this.keys.length;
  }
}

const mockStorage = new MockLocalStorage();

function fill() {
  mockStorage.clear();
  for (let i = 0; i < 5000; i++) {
    mockStorage.setItem(`articleFromLocalStorageKey=${i}`, "data");
  }
  for (let i = 0; i < 5000; i++) {
    mockStorage.setItem(`otherKey=${i}`, "data");
  }
}

fill();
const startOriginal = performance.now();
for (let i = 0; i < mockStorage.length; i++) {
  const keyName = mockStorage.key(i);
  if (keyName && keyName.startsWith("articleFromLocalStorageKey=")) {
    mockStorage.removeItem(keyName);
  }
}
const endOriginal = performance.now();
console.log(`Original Time: ${endOriginal - startOriginal} ms`);

let remainingOriginal = 0;
for (let i = 0; i < mockStorage.length; i++) {
  if (mockStorage.key(i).startsWith("articleFromLocalStorageKey="))
    remainingOriginal++;
}
console.log(
  `Remaining matching keys after Original (BUG!): ${remainingOriginal}`,
);

fill();
const startNew = performance.now();
const keysToRemove = [];
for (let i = 0; i < mockStorage.length; i++) {
  const keyName = mockStorage.key(i);
  if (keyName && keyName.startsWith("articleFromLocalStorageKey=")) {
    keysToRemove.push(keyName);
  }
}
for (const key of keysToRemove) {
  mockStorage.removeItem(key);
}
const endNew = performance.now();
console.log(`New Time (Array): ${endNew - startNew} ms`);

fill();
const startNew2 = performance.now();
for (let i = mockStorage.length - 1; i >= 0; i--) {
  const keyName = mockStorage.key(i);
  if (keyName && keyName.startsWith("articleFromLocalStorageKey=")) {
    mockStorage.removeItem(keyName);
  }
}
const endNew2 = performance.now();
console.log(`New Time 2 (backwards): ${endNew2 - startNew2} ms`);

// Actually the fastest way if we don't have a fake mock that shifts array:
// In browser, removeItem is fast, but shifting keys is what makes it O(n^2) potentially or just backwards.
// Let's use Object.keys instead since we are in browser environment and testing this issue.
