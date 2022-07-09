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

export const settingKeys = {
  __settings_ttsOnClickCheckbox_checked:
    "__settings_ttsOnClickCheckbox_checked",
};
