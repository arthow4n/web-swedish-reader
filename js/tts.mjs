import { bindCheckboxToSetting, settingKeys } from "./settings.mjs";
import { sleep } from "./utils.mjs";

const ttsOnClick = bindCheckboxToSetting(
  ".settings-tts-on-click-checkbox",
  settingKeys.__settings_ttsOnClickCheckbox_checked,
  true
);

const keepSpeakerRunningAudioElement = document.querySelector(
  ".audio-keep-speaker-running"
);

const keepSpeakerRunning = bindCheckboxToSetting(
  ".settings-keep-speaker-running-checkbox",
  settingKeys.__settings_keepSpeakerRunning_checked,
  false,
  (checked) => {
    checked
      ? keepSpeakerRunningAudioElement.play()
      : keepSpeakerRunningAudioElement.pause();
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

    if (keepSpeakerRunningAudioElement.paused) {
      await keepSpeakerRunningAudioElement.play();
    }
    await sleep(200);
  }

  const u = new SpeechSynthesisUtterance(
    // Cast to lower case as upper case characters might be read separately.
    text.toLocaleLowerCase(lang)
  );
  u.lang = lang;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
};
