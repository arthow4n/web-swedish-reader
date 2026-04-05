import {
  bindCheckboxToSetting,
  bindTextInputToSetting,
  settingKeys,
} from "./settings";
import { sleep } from "./utils";

const ttsOnClick = bindCheckboxToSetting({
  selector: ".settings-tts-on-click-checkbox",
  settingKey: settingKeys.__settings_ttsOnClickCheckbox_checked,
  defaultValue: true,
  onChange: null,
});

const updateVolumeLabel = (val: string) => {
  const label = document.querySelector(".settings-tts-volume-label");
  if (!(label instanceof HTMLElement)) {
    throw new Error("Settings TTS volume label not found");
  }
  label.textContent = `(${Math.round(parseFloat(val) * 100)}%)`;
};

const ttsVolume = bindTextInputToSetting({
  selector: ".settings-tts-volume",
  settingKey: settingKeys.__settings_ttsVolume,
  defaultValue: "1",
  onChange: updateVolumeLabel,
});
ttsVolume.element.addEventListener("input", (e) => {
  if (!(e.target instanceof HTMLInputElement)) return;
  updateVolumeLabel(e.target.value);
});
updateVolumeLabel(ttsVolume.getSetting());

const AudioContextClass =
  window.AudioContext || (window as any).webkitAudioContext;
const audioContext = new AudioContextClass();
let oscillator: OscillatorNode | null = null;
let gainNode: GainNode | null = null;

const keepSpeakerRunning = bindCheckboxToSetting({
  selector: ".settings-keep-speaker-running-checkbox",
  settingKey: settingKeys.__settings_keepSpeakerRunning_checked,
  defaultValue: false,
  onChange: (checked: boolean) => {
    if (!checked) {
      if (audioContext.state === "running") {
        audioContext.suspend();
      }
    }
  },
});

export const speakOnClick = async (lang: string, text: string) => {
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
    text.toLocaleLowerCase(lang),
  );
  u.lang = lang;
  u.volume = parseFloat(ttsVolume.getSetting());
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
};
