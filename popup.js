document.addEventListener('DOMContentLoaded', async () => {
  const noInputsUI = document.getElementById('noInputsUI');
  const multipleInputsUI = document.getElementById('multipleInputsUI');
  const singleInputUI = document.getElementById('singleInputUI');
  const backArrow = document.getElementById('backArrow');
  const inputsList = document.getElementById('inputsList');
  const imageUrlInput = document.getElementById('imageUrl');
  const fillBtn = document.getElementById('fillBtn');
  const cancelBtn = document.getElementById('cancelBtn');

  const titleElement = document.createElement('h1');
  titleElement.textContent = 'Image Upload Helper';
  titleElement.style.margin = '0';
  titleElement.style.fontSize = '16px';
  backArrow.parentNode.insertBefore(titleElement, backArrow.nextSibling);

  let selectedIndex = null;
  let totalInputs = 0;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  imageUrlInput.focus();

  document.addEventListener('paste', (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        const reader = new FileReader();
        reader.onload = (evt) => {
          imageUrlInput.value = evt.target.result;
          imageUrlInput.dispatchEvent(new Event('input', { bubbles: true }));
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  });

  chrome.tabs.sendMessage(tab.id, { action: 'detectAllFileInputs' }, (response) => {
    if (chrome.runtime.lastError) {
      noInputsUI.innerHTML = "<p>The extension cannot run on this page.</p>";
      noInputsUI.classList.remove('hidden');
      return;
    }
    const inputs = response || [];
    totalInputs = inputs.length;
    if (totalInputs === 0) {
      noInputsUI.classList.remove('hidden');
    } else if (totalInputs === 1) {
      selectedIndex = inputs[0].index;
      singleInputUI.classList.remove('hidden');
    } else {
      multipleInputsUI.classList.remove('hidden');
      inputs.forEach((item) => {
        const div = document.createElement('div');
        div.className = 'input-item';
        div.textContent = `INPUT #${item.index + 1}`;
        div.addEventListener('mouseenter', () => {
          chrome.tabs.sendMessage(tab.id, { action: 'highlight', index: item.index });
        });
        div.addEventListener('mouseleave', () => {
          chrome.tabs.sendMessage(tab.id, { action: 'unhighlight', index: item.index });
        });
        div.addEventListener('click', () => {
          selectedIndex = item.index;
          multipleInputsUI.classList.add('hidden');
          singleInputUI.classList.remove('hidden');
          backArrow.classList.remove('hidden');
          imageUrlInput.focus();
        });
        inputsList.appendChild(div);
      });
    }
  });

  backArrow.addEventListener('click', () => {
    singleInputUI.classList.add('hidden');
    multipleInputsUI.classList.remove('hidden');
    imageUrlInput.value = '';
    backArrow.classList.add('hidden');
  });

  fillBtn.addEventListener('click', () => {
    const url = imageUrlInput.value.trim();
    if (!url) return;
    fillBtn.textContent = "Sending...";
    fillBtn.disabled = true;
    chrome.tabs.sendMessage(tab.id, {
      action: 'fillFileInput',
      index: selectedIndex,
      url,
      isDataUrl: url.startsWith('data:image')
    }, () => {
      imageUrlInput.value = '';
      fillBtn.textContent = "✓ Sent!";
      setTimeout(() => {
        fillBtn.textContent = "SEND";
        fillBtn.disabled = false;
      }, 1500);
    });
  });
  cancelBtn.addEventListener('click', () => window.close());
});