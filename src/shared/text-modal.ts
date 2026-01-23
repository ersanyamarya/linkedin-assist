/* A simple modal to show text content
 * It includes a copy to clipboard button
 * and a close button.
 */

export const createTextModal = (text: string): void => {
  // Create backdrop
  const backdrop = document.createElement("div");
  backdrop.className = "linkedin-assist__modal-backdrop";
  // Close modal function
  const closeModal = () => {
    backdrop.remove();
  };
  // Create modal container
  const modal = document.createElement("div");
  modal.className = "linkedin-assist__modal";

  // Create modal content
  const content = document.createElement("div");
  content.className = "linkedin-assist__modal-content";
  content.textContent = text;

  // Create button container
  const buttonContainer = document.createElement("div");
  buttonContainer.className = "linkedin-assist__modal-buttons";

  // Create copy button
  const copyButton = document.createElement("button");
  copyButton.className =
    "linkedin-assist__modal-button linkedin-assist__modal-button--primary";
  copyButton.textContent = "Copy";
  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(text);
      copyButton.textContent = "Copied!";
      setTimeout(() => {
        closeModal();
      }, 500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  });

  // Create close button
  const closeButton = document.createElement("button");
  closeButton.className =
    "linkedin-assist__modal-button linkedin-assist__modal-button--secondary";
  closeButton.textContent = "Close";
  closeButton.addEventListener("click", closeModal);

  // Close on backdrop click
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) {
      closeModal();
    }
  });

  // Assemble modal
  buttonContainer.appendChild(copyButton);
  buttonContainer.appendChild(closeButton);
  modal.appendChild(content);
  modal.appendChild(buttonContainer);
  backdrop.appendChild(modal);

  // Inject into DOM
  document.body.appendChild(backdrop);
};
