const settingsButton = document.querySelector(".control-settings");
const closeButtons = document.querySelectorAll(".control-settings-close");
const modal = document.querySelector(
  ".settings-modal",
) as HTMLDialogElement | null;

closeButtons.forEach((b) => {
  b.addEventListener("click", () => {
    modal?.close();
  });
});

settingsButton?.addEventListener("click", () => {
  modal?.showModal();
});

export const writeSetting = (key: string, value: any) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const readSetting = <T>(key: string, defaultValue: T): T => {
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
  __settings_saveArticleToLocalStorageCheckbox_checked:
    "__settings_saveArticleToLocalStorageCheckbox_checked",
  __settings_ttsVolume: "__settings_ttsVolume",
};

export const bindCheckboxToSetting = ({
  selector,
  settingKey,
  defaultValue,
  onChange,
}: {
  selector: string;
  settingKey: string;
  defaultValue: boolean;
  onChange?: ((checked: boolean) => void) | null;
}) => {
  const checkbox = document.querySelector(selector) as HTMLInputElement | null;
  if (!checkbox) throw new Error(`Checkbox not found: ${selector}`);

  checkbox.checked = readSetting(settingKey, defaultValue);
  checkbox.addEventListener("change", () => {
    writeSetting(settingKey, checkbox.checked);
    if (onChange) {
      onChange(checkbox.checked);
    }
  });

  return {
    getSetting: () => checkbox.checked,
    element: checkbox,
  };
};

export const bindTextInputToSetting = ({
  selector,
  settingKey,
  defaultValue,
  onChange,
}: {
  selector: string;
  settingKey: string;
  defaultValue: string;
  onChange?: ((value: string) => void) | null;
}) => {
  const input = document.querySelector(selector) as HTMLInputElement | null;
  if (!input) throw new Error(`Input not found: ${selector}`);

  input.value = readSetting(settingKey, defaultValue);
  input.addEventListener("change", () => {
    writeSetting(settingKey, input.value);
    if (onChange) {
      onChange(input.value);
    }
  });

  return {
    getSetting: () => input.value,
    element: input,
  };
};
