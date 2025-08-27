document.addEventListener('DOMContentLoaded', function() {
    // Only one checkbox can be selected at a time
    const animalCheckboxes = document.querySelectorAll('input[name="animal"]');
    const animalImageDiv = document.getElementById('animal-image');
    let selectedAnimal = null;
    let animalImgEl = null;
    animalCheckboxes.forEach(cb => {
        cb.addEventListener('change', function() {
            animalCheckboxes.forEach(other => {
                if (other !== cb) other.checked = false;
            });
            animalImageDiv.innerHTML = '';
            selectedAnimal = null;
            animalImgEl = null;
            if (cb.checked) {
                selectedAnimal = cb.value;
                animalImgEl = document.createElement('img');
                animalImgEl.alt = cb.value;
                animalImgEl.src = `/static/images/${cb.value}.jpg`;
                animalImageDiv.appendChild(animalImgEl);
            }
            // Clear filter preview if animal changes
            const filteredImageDiv = document.getElementById('filtered-image');
            if (filteredImageDiv) filteredImageDiv.innerHTML = '';
        });
    });

    // File upload and filter
    const fileInput = document.getElementById('file-input');
    const fileInfoDiv = document.getElementById('file-info');
    const filterSelect = document.getElementById('filter-select');
    const applyBtn = document.getElementById('apply-filter-btn');
    const filteredImageDiv = document.getElementById('filtered-image');

    fileInput.addEventListener('change', function() {
        const file = fileInput.files[0];
        if (file) {
            fileInfoDiv.innerHTML = `<strong>Name:</strong> ${file.name}<br><strong>Size:</strong> ${file.size} bytes<br><strong>Type:</strong> ${file.type}`;
        } else {
            fileInfoDiv.innerHTML = '';
        }
        filteredImageDiv.innerHTML = '';
        // Uncheck animal if file is uploaded
        if (file) {
            animalCheckboxes.forEach(cb => cb.checked = false);
            animalImageDiv.innerHTML = '';
            selectedAnimal = null;
            animalImgEl = null;
        }
    });
    // Theme toggle with switch
    const themeSwitchCheckbox = document.getElementById('theme-switch-checkbox');
    const switchIcon = document.querySelector('.switch-icon');
    const dayText = document.querySelector('.switch-text.day');
    const nightText = document.querySelector('.switch-text.night');
    function setTheme(dark) {
        if (dark) {
            document.body.classList.add('dark');
            if (switchIcon) switchIcon.textContent = '🌙';
        } else {
            document.body.classList.remove('dark');
            if (switchIcon) switchIcon.textContent = '☀️';
        }
    }
    themeSwitchCheckbox.addEventListener('change', function() {
        setTheme(themeSwitchCheckbox.checked);
    });
    // Set initial icon
    setTheme(themeSwitchCheckbox.checked);

    applyBtn.addEventListener('click', async function() {
        const file = fileInput.files[0];
        const filter = filterSelect.value;
        let imageBlob = null;
        let filename = null;
        if (file) {
            imageBlob = file;
            filename = file.name;
        } else if (selectedAnimal && animalImgEl) {
            // Fetch the animal image as blob
            try {
                const imgResp = await fetch(animalImgEl.src);
                if (!imgResp.ok) throw new Error('Could not load animal image');
                imageBlob = await imgResp.blob();
                filename = selectedAnimal + '.jpg';
            } catch (e) {
                filteredImageDiv.innerHTML = `<span style='color:red;'>Error loading animal image.</span>`;
                return;
            }
        } else {
            alert('Please select an animal or upload a file to apply the filter.');
            return;
        }
        const formData = new FormData();
        formData.append('file', imageBlob, filename);
        formData.append('filter_name', filter);
        filteredImageDiv.innerHTML = 'Processing...';
        try {
            const response = await fetch('/api/filter', {
                method: 'POST',
                body: formData
            });
            if (!response.ok) {
                const err = await response.json();
                filteredImageDiv.innerHTML = `<span style="color:red;">${err.error || 'Error applying filter.'}</span>`;
                return;
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            filteredImageDiv.innerHTML = `<img src="${url}" alt="Filtered Image" style="max-width:200px; border-radius:8px; box-shadow:0 1px 4px rgba(0,0,0,0.08);" />`;
            // Add download link
            const downloadDiv = document.getElementById('download-link');
            if (downloadDiv) {
                downloadDiv.innerHTML = `<a href="${url}" download="filtered-image.png" style="display:inline-block;margin-top:10px;font-size:1.1em;">⬇️ Download Image</a>`;
            }
        } catch (e) {
            filteredImageDiv.innerHTML = `<span style="color:red;">Error: ${e.message}</span>`;
        }
    });
});
