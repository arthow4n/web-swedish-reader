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
};
