import { settingKeys } from "./settings.mjs";

const ttsOnClickCheckbox = document.querySelector(
  ".settings-tts-on-click-checkbox"
);

ttsOnClickCheckbox.checked = !!localStorage.getItem(
  settingKeys.__settings_ttsOnClickCheckbox_checked
);
ttsOnClickCheckbox.addEventListener("change", () => {
  if (ttsOnClickCheckbox.checked) {
    localStorage.setItem(
      settingKeys.__settings_ttsOnClickCheckbox_checked,
      true
    );
  } else {
    localStorage.removeItem(settingKeys.__settings_ttsOnClickCheckbox_checked);
  }
});

export const speakOnClick = (lang, text) => {
  // Known issue:
  // Some speakers (USB-C, Bluetooth, ...) might have a delay when starting to play a sound,
  // a bit like resuming from the sleep state,
  // causing the first few milliseconds of sound being cut when playing
  // if there isn't already another sound that's keeping the speaker awake.
  //
  // As a future workaround,
  // consider playing an unhearable sound to keep the speaker awake when the tab is active.

  if (!ttsOnClickCheckbox.checked) {
    return;
  }

  const u = new SpeechSynthesisUtterance(
    // Cast to lower case as upper case characters might be read separately.
    text.toLocaleLowerCase(lang)
  );
  u.lang = lang;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
};
