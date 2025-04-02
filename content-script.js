const state = new WeakMap();

function detectAllFileInputs() {
    const inputs = [...document.querySelectorAll('input[type="file"]')];
    state.set(document, {
        inputs,
        highlights: new Array(inputs.length).fill(null)
    });
    return inputs.map((inp, i) => ({ index: i, accept: inp.accept }));
}

function highlightInput(index) {
    const docState = state.get(document);
    if (!docState?.inputs[index]) return;
    removeHighlight(index);
    const input = docState.inputs[index];
    const rect = input.getBoundingClientRect();
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
        position: 'absolute',
        zIndex: '999999',
        pointerEvents: 'none',
        border: '2px dotted var(--primary)',
        borderRadius: '4px',
        top: `${rect.top + window.scrollY - 2}px`,
        left: `${rect.left - 2}px`,
        width: `${rect.width + 4}px`,
        height: `${rect.height + 4}px`,
        backgroundColor: 'rgba(76, 175, 80, 0.15)'
    });
    document.body.appendChild(overlay);
    docState.highlights[index] = overlay;
}

function removeHighlight(index) {
    const docState = state.get(document);
    if (index === undefined) {
        docState?.highlights.forEach(h => h?.remove());
        if (docState) docState.highlights = [];
    } else if (docState?.highlights[index]) {
        docState.highlights[index].remove();
        docState.highlights[index] = null;
    }
}

async function fillFileInput(index, url, isDataUrl) {
    const docState = state.get(document);
    if (!docState?.inputs[index]) return;
    try {
        const input = docState.inputs[index];
        let file, filename = 'image.png';
        if (isDataUrl) {
            const res = await fetch(url);
            file = await res.blob();
        } else {
            filename = url.split('/').pop() || filename;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            file = await res.blob();
        }
        const dt = new DataTransfer();
        dt.items.add(new File([file], filename, { type: file.type }));
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
    } catch (err) {
        console.error('Upload failed:', err);
        alert(`Error: ${err.message}`);
    }
}

chrome.runtime.onMessage.addListener((msg, _, sendResponse) => {
    switch (msg.action) {
        case 'detectAllFileInputs':
            sendResponse(detectAllFileInputs());
            break;
        case 'highlight':
            highlightInput(msg.index);
            break;
        case 'unhighlight':
            removeHighlight(msg.index);
            break;
        case 'fillFileInput':
            fillFileInput(msg.index, msg.url, msg.isDataUrl);
            break;
        case 'cleanup':
            removeHighlight();
            break;
    }
    return true;
});