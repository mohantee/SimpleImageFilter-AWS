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

    // Chat widget logic
    (function(){
      const widget = document.getElementById('chat-widget');
      const toggle = document.getElementById('chat-toggle');
      const panel = widget.querySelector('.chat-panel');
      const closeBtn = document.getElementById('chat-close');
      const form = document.getElementById('chat-form');
      const input = document.getElementById('chat-input');
      const messages = document.getElementById('chat-messages');

      let expanded = false;
      let lastSent = 0;

      function setExpanded(val){
        expanded = val;
        widget.classList.toggle('chat-expanded', val);
        widget.classList.toggle('chat-collapsed', !val);
        panel.hidden = !val;
        widget.setAttribute('aria-hidden', !val);
        if(val){ input.focus(); }
      }

      toggle.addEventListener('click', ()=> setExpanded(!expanded));
      closeBtn.addEventListener('click', ()=> setExpanded(false));

      // Simple markdown-to-HTML for chat assistant (safe subset)
      function renderMarkdown(text) {
        if (!text) return '';
        let html = text
          .replace(/\n{2,}/g, '</p><p>') // paragraphs
          .replace(/\n/g, '<br>')
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') // bold
          .replace(/\*(.+?)\*/g, '<em>$1</em>') // italic
          .replace(/`([^`]+)`/g, '<code>$1</code>') // inline code
          .replace(/^- (.+)$/gm, '<ul><li>$1</li></ul>') // unordered list
          .replace(/\n<ul>/g, '<ul>')
          .replace(/<\/li><ul>/g, '</li><ul>')
          .replace(/<\/ul><ul>/g, '')
          .replace(/\n/g, '<br>');
        // Remove multiple <ul> in a row
        html = '<p>' + html + '</p>';
        html = html.replace(/<p><\/p>/g, '');
        return html;
      }

      function appendMessage(text, who='assistant'){
        const el = document.createElement('div');
        el.className = 'chat-bubble ' + (who === 'user' ? 'user' : 'assistant');
        if(who === 'assistant'){
          const maxChars = 600;
          if(text.length > maxChars){
            const short = text.slice(0, maxChars).trim();
            el.innerHTML = renderMarkdown(short + '…');
            const more = document.createElement('button');
            more.className = 'chat-more';
            more.textContent = 'Show more';
            more.style.marginLeft = '8px';
            more.style.background = 'transparent';
            more.style.border = 'none';
            more.style.color = 'var(--accent, #0078d4)';
            more.style.cursor = 'pointer';
            more.addEventListener('click', ()=> { el.innerHTML = renderMarkdown(text); });
            el.appendChild(more);
          } else {
            el.innerHTML = renderMarkdown(text);
          }
        } else {
          el.textContent = text;
        }
        messages.appendChild(el);
        messages.scrollTop = messages.scrollHeight;
      }

      async function sendPrompt(prompt){
        // simple rate limit: 1 request per 800ms
        const now = Date.now();
        if(now - lastSent < 800) return;
        lastSent = now;

        appendMessage(prompt, 'user');
        appendMessage('Thinking…', 'assistant');
        const thinking = messages.querySelector('.chat-bubble.assistant:last-child');

        try{
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
          });
          if(!res.ok) throw new Error('Network response not ok');
          const j = await res.json();
          // Replace thinking with actual response
          thinking.remove();
          const text = (j && j.output) ? String(j.output).trim() : 'No response.';
          appendMessage(text, 'assistant');
        }catch(err){
          thinking.remove();
          appendMessage('Sorry, something went wrong. ' + (err.message || ''), 'assistant');
          console.error('chat error', err);
        }
      }

      form.addEventListener('submit', (e)=>{
        e.preventDefault();
        const v = input.value.trim();
        if(!v) return;
        input.value = '';
        sendPrompt(v);
      });

      // keyboard shortcut: Cmd/Ctrl+K opens widget
      window.addEventListener('keydown', (e)=>{
        if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'){
          e.preventDefault();
          setExpanded(true);
        }
      });
    })();
});
