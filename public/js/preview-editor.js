(() => {
    const page = document.querySelector('.page');
    const toolbar = document.querySelector('.toolbar');
    const toggleEditButton = document.getElementById('toggle-edit');
    const uploadImageInput = document.getElementById('upload-image');
    const uploadImageLabel = document.getElementById('upload-image-label');
    const addTextButton = document.getElementById('add-text-block');
    const saveTemplateButton = document.getElementById('save-template-fragments');
    const config = window.previewEditorConfig || {};

    if (!page || !toolbar || !toggleEditButton || !uploadImageInput || !uploadImageLabel || !addTextButton || !saveTemplateButton) {
        return;
    }

    const editableSelectors = [
        'h1',
        '.sub',
        '.meta div',
        '.section-title',
        'th',
        'td',
        '.footer',
    ];

    const style = document.createElement('style');
    style.textContent = `
        .page { position: relative; }
        .edit-mode .editable-target[contenteditable="true"] {
            outline: 1px dashed #8e5757;
            outline-offset: 2px;
            cursor: text;
        }
        .draggable-item {
            position: absolute;
            border: 1px dashed #b7b7b7;
            background: rgba(255, 255, 255, 0.92);
            padding: 4px;
            user-select: none;
            z-index: 6;
            min-width: 48px;
            min-height: 28px;
        }
        .edit-mode .draggable-item { cursor: move; }
        .draggable-item img {
            display: block;
            max-width: 220px;
            height: auto;
            pointer-events: none;
        }
        .draggable-text {
            font: 14px Arial, sans-serif;
            color: #111;
        }
        .template-region {
            min-height: 26px;
        }
        .edit-status {
            margin-left: auto;
            font: 12px Arial, sans-serif;
            color: #555;
            align-self: center;
        }
    `;
    document.head.appendChild(style);

    let editMode = false;
    let dragState = null;

    const statusEl = document.createElement('span');
    statusEl.className = 'edit-status';
    statusEl.textContent = '';
    toolbar.appendChild(statusEl);

    const ensureTemplateFragment = (region) => {
        if (!region) {
            return;
        }

        if (!region.querySelector('.template-fragment')) {
            const fragment = document.createElement('div');
            fragment.className = 'template-fragment';
            fragment.innerHTML = '<div>Type here...</div>';
            region.appendChild(fragment);
        }
    };

    const setEditableState = (enabled) => {
        const nodes = page.querySelectorAll(editableSelectors.join(','));
        nodes.forEach((node) => {
            node.classList.add('editable-target');
            node.contentEditable = enabled ? 'true' : 'false';
        });

        const templateRegions = page.querySelectorAll('.template-region');
        templateRegions.forEach((region) => {
            ensureTemplateFragment(region);
            const fragment = region.querySelector('.template-fragment');
            if (fragment) {
                fragment.classList.add('editable-target');
                fragment.contentEditable = enabled ? 'true' : 'false';
            }
        });

        page.classList.toggle('edit-mode', enabled);
        uploadImageLabel.style.display = enabled ? 'inline-flex' : 'none';
        addTextButton.style.display = enabled ? 'inline-flex' : 'none';
        saveTemplateButton.style.display = enabled ? 'inline-flex' : 'none';
        toggleEditButton.textContent = enabled ? 'Done' : 'Edit';
        statusEl.textContent = enabled ? 'Edit mode enabled' : '';
    };

    const startDrag = (target, event) => {
        const pageRect = page.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();

        dragState = {
            target,
            offsetX: event.clientX - targetRect.left,
            offsetY: event.clientY - targetRect.top,
            pageRect,
        };
    };

    document.addEventListener('pointermove', (event) => {
        if (!dragState || !editMode) {
            return;
        }

        const { target, offsetX, offsetY, pageRect } = dragState;
        const maxLeft = Math.max(0, pageRect.width - target.offsetWidth);
        const maxTop = Math.max(0, pageRect.height - target.offsetHeight);

        let left = event.clientX - pageRect.left - offsetX;
        let top = event.clientY - pageRect.top - offsetY;
        left = Math.max(0, Math.min(maxLeft, left));
        top = Math.max(0, Math.min(maxTop, top));

        target.style.left = `${left}px`;
        target.style.top = `${top}px`;
    });

    document.addEventListener('pointerup', () => {
        dragState = null;
    });

    page.addEventListener('pointerdown', (event) => {
        if (!editMode) {
            return;
        }

        const target = event.target.closest('.draggable-item');
        if (!target) {
            return;
        }

        event.preventDefault();
        startDrag(target, event);
    });

    const addDraggableText = () => {
        const textItem = document.createElement('div');
        textItem.className = 'draggable-item draggable-text editable-target';
        textItem.contentEditable = 'true';
        textItem.textContent = 'Edit text';
        textItem.style.left = '40px';
        textItem.style.top = '40px';
        page.appendChild(textItem);
    };

    const addDraggableImage = (file) => {
        const reader = new FileReader();
        reader.onload = () => {
            const imageItem = document.createElement('div');
            imageItem.className = 'draggable-item';
            imageItem.style.left = '40px';
            imageItem.style.top = '40px';

            const image = document.createElement('img');
            image.src = String(reader.result || '');
            image.alt = file.name;
            imageItem.appendChild(image);
            page.appendChild(imageItem);
        };
        reader.readAsDataURL(file);
    };

    const collectText = (regionName) => {
        const region = page.querySelector(`.template-region[data-template-region="${regionName}"]`);
        if (!region) {
            return null;
        }

        const text = (region.textContent || '').trim();
        return text === '' ? null : text.slice(0, 1000);
    };

    const collectHtml = (regionName) => {
        const region = page.querySelector(`.template-region[data-template-region="${regionName}"]`);
        if (!region) {
            return null;
        }

        const html = region.innerHTML.trim();
        return html === '' ? null : html;
    };

    const saveTemplateFragments = async () => {
        if (!config.saveTemplateUrl || !config.csrfToken) {
            statusEl.textContent = 'Unable to save: preview configuration is missing.';
            return;
        }

        saveTemplateButton.disabled = true;
        statusEl.textContent = 'Saving header/footer...';

        try {
            const response = await fetch(config.saveTemplateUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': config.csrfToken,
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    header_html: collectHtml('header'),
                    footer_html: collectHtml('footer'),
                    header_text: collectText('header'),
                    footer_text: collectText('footer'),
                }),
            });

            if (!response.ok) {
                statusEl.textContent = 'Save failed. Check your changes and try again.';
                return;
            }

            statusEl.textContent = 'Header/footer saved. New exports will use these edits.';
        } catch (error) {
            statusEl.textContent = 'Save failed. Network error.';
        } finally {
            saveTemplateButton.disabled = false;
        }
    };

    toggleEditButton.addEventListener('click', () => {
        editMode = !editMode;
        setEditableState(editMode);
    });

    addTextButton.addEventListener('click', addDraggableText);

    uploadImageInput.addEventListener('change', (event) => {
        const target = event.target;
        const files = target && target.files ? Array.from(target.files) : [];
        files.forEach(addDraggableImage);
        uploadImageInput.value = '';
    });

    saveTemplateButton.addEventListener('click', saveTemplateFragments);
})();
