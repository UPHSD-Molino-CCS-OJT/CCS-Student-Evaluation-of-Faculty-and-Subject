(() => {
    const page = document.querySelector('.page');
    const toolbar = document.querySelector('.toolbar');
    const toggleEditButton = document.getElementById('toggle-edit');
    const templateRegionSelect = document.getElementById('template-target-region');
    const uploadImageInput = document.getElementById('upload-image');
    const uploadImageLabel = document.getElementById('upload-image-label');
    const replaceImageInput = document.getElementById('replace-image-input');
    const addTextButton = document.getElementById('add-text-block');
    const deleteSelectedButton = document.getElementById('delete-selected');
    const replaceImageButton = document.getElementById('replace-image');
    const imageWidthLabel = document.getElementById('image-width-label');
    const imageWidthInput = document.getElementById('image-width');
    const saveTemplateButton = document.getElementById('save-template-fragments');
    const config = window.previewEditorConfig || {};

    if (
        !page ||
        !toolbar ||
        !toggleEditButton ||
        !templateRegionSelect ||
        !uploadImageInput ||
        !uploadImageLabel ||
        !replaceImageInput ||
        !addTextButton ||
        !deleteSelectedButton ||
        !replaceImageButton ||
        !imageWidthLabel ||
        !imageWidthInput ||
        !saveTemplateButton
    ) {
        return;
    }

    const style = document.createElement('style');
    style.textContent = `
        .template-region {
            min-height: 24px;
        }

        .edit-mode .template-region {
            outline: 1px dashed #b7b7b7;
            outline-offset: 2px;
            padding: 3px;
        }

        .edit-mode .template-region [contenteditable="true"] {
            outline: 1px dashed #8e5757;
            outline-offset: 2px;
            cursor: text;
        }

        .template-selected {
            outline: 2px solid #8e5757;
            outline-offset: 2px;
        }

        .template-image {
            display: block;
            max-width: 100%;
            height: auto;
            cursor: pointer;
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
    let selectedNode = null;

    const statusEl = document.createElement('span');
    statusEl.className = 'edit-status';
    statusEl.textContent = '';
    toolbar.appendChild(statusEl);

    const templateRegions = () => Array.from(page.querySelectorAll('.template-region'));

    const getActiveRegion = () => {
        const value = templateRegionSelect.value || 'header';
        return page.querySelector(`.template-region[data-template-region="${value}"]`);
    };

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

    const clearSelectedNode = () => {
        if (selectedNode) {
            selectedNode.classList.remove('template-selected');
        }

        selectedNode = null;
        replaceImageButton.style.display = 'none';
        imageWidthLabel.style.display = 'none';
        imageWidthInput.style.display = 'none';
        imageWidthInput.value = '';
    };

    const setSelectedNode = (node) => {
        clearSelectedNode();

        if (!node || !editMode) {
            return;
        }

        selectedNode = node;
        selectedNode.classList.add('template-selected');

        if (selectedNode.tagName === 'IMG') {
            replaceImageButton.style.display = 'inline-flex';
            imageWidthLabel.style.display = 'inline-flex';
            imageWidthInput.style.display = 'inline-flex';
            const currentWidth = selectedNode.style.width
                ? parseInt(selectedNode.style.width, 10)
                : Math.round(selectedNode.getBoundingClientRect().width || selectedNode.naturalWidth || 0);
            imageWidthInput.value = Number.isFinite(currentWidth) && currentWidth > 0 ? String(currentWidth) : '';
        }
    };

    const makeRegionEditable = (region, enabled) => {
        ensureTemplateFragment(region);
        const editableNodes = region.querySelectorAll('div, p, span, strong, em, b, i, u, small, li, a, td, th');
        editableNodes.forEach((node) => {
            node.contentEditable = enabled ? 'true' : 'false';
        });
    };

    const setEditableState = (enabled) => {
        templateRegions().forEach((region) => {
            makeRegionEditable(region, enabled);
        });

        page.classList.toggle('edit-mode', enabled);
        templateRegionSelect.style.display = enabled ? 'inline-flex' : 'none';
        uploadImageLabel.style.display = enabled ? 'inline-flex' : 'none';
        addTextButton.style.display = enabled ? 'inline-flex' : 'none';
        deleteSelectedButton.style.display = enabled ? 'inline-flex' : 'none';
        saveTemplateButton.style.display = enabled ? 'inline-flex' : 'none';
        toggleEditButton.textContent = enabled ? 'Done' : 'Edit';
        statusEl.textContent = enabled ? 'Edit mode enabled' : '';

        if (!enabled) {
            clearSelectedNode();
        }
    };

    const addTextBlock = () => {
        const region = getActiveRegion();
        if (!region) {
            return;
        }

        const textItem = document.createElement('div');
        textItem.className = 'template-item';
        textItem.contentEditable = 'true';
        textItem.textContent = 'Edit text';
        region.appendChild(textItem);
        textItem.focus();
        setSelectedNode(textItem);
    };

    const addImageToRegion = (file) => {
        const region = getActiveRegion();
        if (!region) {
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const image = document.createElement('img');
            image.className = 'template-image template-item';
            image.src = String(reader.result || '');
            image.alt = file.name;
            image.style.width = '220px';
            image.style.maxWidth = '100%';
            region.appendChild(image);
            setSelectedNode(image);
        };
        reader.readAsDataURL(file);
    };

    const replaceSelectedImage = (file) => {
        if (!selectedNode || selectedNode.tagName !== 'IMG') {
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            selectedNode.src = String(reader.result || '');
            selectedNode.alt = file.name;
            statusEl.textContent = 'Image replaced.';
        };
        reader.readAsDataURL(file);
    };

    const deleteSelectedNode = () => {
        if (!selectedNode) {
            statusEl.textContent = 'Select an item in header/footer first.';
            return;
        }

        if (!selectedNode.closest('.template-region')) {
            return;
        }

        selectedNode.remove();
        clearSelectedNode();
        statusEl.textContent = 'Selected item deleted.';
    };

    const collectText = (regionName) => {
        const region = page.querySelector(`.template-region[data-template-region="${regionName}"]`);
        if (!region) {
            return null;
        }

        const text = (region.textContent || '').trim();
        return text === '' ? null : text.slice(0, 5000);
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
                let errorMessage = 'Save failed. Check your changes and try again.';
                try {
                    const payload = await response.json();
                    if (payload && typeof payload.message === 'string' && payload.message.trim() !== '') {
                        errorMessage = payload.message;
                    }
                } catch (error) {
                    // keep fallback error text
                }

                statusEl.textContent = errorMessage;
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

    addTextButton.addEventListener('click', addTextBlock);

    deleteSelectedButton.addEventListener('click', deleteSelectedNode);

    replaceImageButton.addEventListener('click', () => {
        if (!selectedNode || selectedNode.tagName !== 'IMG') {
            statusEl.textContent = 'Select an image first.';
            return;
        }

        replaceImageInput.click();
    });

    uploadImageInput.addEventListener('change', (event) => {
        const target = event.target;
        const files = target && target.files ? Array.from(target.files) : [];
        files.forEach(addImageToRegion);
        uploadImageInput.value = '';
    });

    replaceImageInput.addEventListener('change', (event) => {
        const target = event.target;
        const files = target && target.files ? Array.from(target.files) : [];
        if (files[0]) {
            replaceSelectedImage(files[0]);
        }
        replaceImageInput.value = '';
    });

    imageWidthInput.addEventListener('input', () => {
        if (!selectedNode || selectedNode.tagName !== 'IMG') {
            return;
        }

        const width = parseInt(imageWidthInput.value, 10);
        if (!Number.isFinite(width) || width < 20) {
            return;
        }

        selectedNode.style.width = `${width}px`;
        selectedNode.style.height = 'auto';
    });

    page.addEventListener('click', (event) => {
        if (!editMode) {
            return;
        }

        const target = event.target;
        if (!(target instanceof Element)) {
            return;
        }

        const selected = target.closest('.template-region img, .template-region [contenteditable="true"], .template-region .template-item');
        if (selected) {
            setSelectedNode(selected);
            return;
        }

        if (!target.closest('.template-region')) {
            clearSelectedNode();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (!editMode || event.key !== 'Delete') {
            return;
        }

        if (selectedNode) {
            event.preventDefault();
            deleteSelectedNode();
        }
    });

    saveTemplateButton.addEventListener('click', saveTemplateFragments);
})();
