import { bindCheckboxToSetting, settingKeys } from "./settings.mjs";
import { sleep } from "./utils.mjs";

const ttsOnClick = bindCheckboxToSetting(
  ".settings-tts-on-click-checkbox",
  settingKeys.__settings_ttsOnClickCheckbox_checked,
  true
);

let audioContext = null;

const keepSpeakerRunning = bindCheckboxToSetting(
  ".settings-keep-speaker-running-checkbox",
  settingKeys.__settings_keepSpeakerRunning_checked,
  false,
  (checked) => {
    if (checked) {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = "sine";
        oscillator.frequency.value = 20; // Low frequency
        gainNode.gain.value = 0.0001; // Almost silent

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.start();
      }
      if (audioContext.state === "suspended") {
        audioContext.resume();
      }
    } else {
      if (audioContext) {
        audioContext.suspend();
      }
    }
  }
);

export const speakOnClick = async (lang, text) => {
  if (!ttsOnClick.getSetting()) {
    return;
  }

  if (keepSpeakerRunning.getSetting()) {
    // Some speakers (USB-C, Bluetooth, ...) might have a delay when starting to play a sound,
    // a bit like resuming from the sleep state.
    // If there isn't already another sound that's keeping the speaker awake,
    // this will cause the first few milliseconds of sound being cut when playing.
    // Therefore here's a setting to keep the speaker warm and ready.

    if (audioContext && audioContext.state === "suspended") {
      await audioContext.resume();
    }
    // No need to sleep here as the oscillator is already running or resuming instantly
  }

  const u = new SpeechSynthesisUtterance(
    // Cast to lower case as upper case characters might be read separately.
    text.toLocaleLowerCase(lang)
  );
  u.lang = lang;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
};
