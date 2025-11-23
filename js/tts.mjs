import { bindCheckboxToSetting, settingKeys } from "./settings.mjs";
import { sleep } from "./utils.mjs";

const ttsOnClick = bindCheckboxToSetting(
  ".settings-tts-on-click-checkbox",
  settingKeys.__settings_ttsOnClickCheckbox_checked,
  true
);

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let oscillator = null;
let gainNode = null;

const keepSpeakerRunning = bindCheckboxToSetting(
  ".settings-keep-speaker-running-checkbox",
  settingKeys.__settings_keepSpeakerRunning_checked,
  false,
  (checked) => {
    if (!checked) {
      if (audioContext.state === "running") {
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
    // After the sound is started programmatically,
    // we still need to wait a bit so the speaker is really started.

    if (!oscillator) {
      oscillator = audioContext.createOscillator();
      gainNode = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = 20; // Low frequency
      gainNode.gain.value = 0.001; // Almost silent

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start();
      await sleep(200); 
    }

    if (audioContext.state === "suspended") {
      await audioContext.resume();
      await sleep(200);
    }
  }

  const u = new SpeechSynthesisUtterance(
    // Cast to lower case as upper case characters might be read separately.
    text.toLocaleLowerCase(lang)
  );
  u.lang = lang;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
};
