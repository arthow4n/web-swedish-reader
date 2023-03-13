const settingsButton = document.querySelector(".control-settings");
const closeButtons = document.querySelectorAll(".control-settings-close");
const modal = document.querySelector(".settings-modal");

closeButtons.forEach((b) => {
  b.addEventListener("click", () => {
    modal.close();
  });
});

settingsButton.addEventListener("click", () => {
  modal.showModal();
});

export const writeSetting = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const readSetting = (key, defaultValue) => {
  const existing = localStorage.getItem(key);

  if (existing === null) {
    return defaultValue;
  }

  try {
    return JSON.parse(existing);
  } catch {
    return defaultValue;
  }
};

export const settingKeys = {
  __settings_ttsOnClickCheckbox_checked:
    "__settings_ttsOnClickCheckbox_checked",
  __settings_keepDictionaryVisibleCheckBox_checked:
    "__settings_keepDictionaryVisibleCheckBox_checked",
  __settings_keepSpeakerRunning_checked:
    "__settings_keepSpeakerRunning_checked",
  __settings_dic_cambridge_magic_number:
    "__settings_dic_cambridge_magic_number",
};

export const bindCheckboxToSetting = (
  selector,
  settingKey,
  defaultValue,
  onChange
) => {
  const checkbox = document.querySelector(selector);
  checkbox.checked = readSetting(settingKey, defaultValue);
  checkbox.addEventListener("change", () => {
    writeSetting(settingKey, checkbox.checked);
    onChange(checkbox.checked);
  });

  return {
    getSetting: () => checkbox.checked,
    element: checkbox,
  };
};

export const bindTextInputToSetting = (
  selector,
  settingKey,
  defaultValue,
  onChange
) => {
  const input = document.querySelector(selector);
  input.value = readSetting(settingKey, defaultValue);
  input.addEventListener("change", () => {
    writeSetting(settingKey, input.value);
    onChange(input.value);
  });

  return {
    getSetting: () => input.value,
    element: input,
  };
};
