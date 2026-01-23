const app = {
    state: {
        activeTool: null,
        files: {
            'png-to-pdf': [],
            'pdf-merge': [],
            'pdf-compress': [],
            'pdf-to-png': []
        }
    },

    init() {
        this.setupNavigation();
        this.setupDragDrop();
        this.setupActionButtons();
    },

    // --- Navigation ---
    openTool(toolId) {
        document.getElementById('landing-view').style.display = 'none';
        document.querySelectorAll('.workspace').forEach(el => el.classList.remove('active'));
        document.getElementById(toolId).classList.add('active');
        this.state.activeTool = toolId;
        this.resetState(toolId);
    },

    goHome() {
        document.querySelectorAll('.workspace').forEach(el => el.classList.remove('active'));
        document.getElementById('landing-view').style.display = 'block';
        this.state.activeTool = null;
    },

    resetState(toolId) {
        this.state.files[toolId] = [];
        this.updateUI(toolId);
    },

    // --- Event Listeners ---
    setupNavigation() {
        // Handled via onclick in HTML for simplicity
    },

    setupDragDrop() {
        const tools = ['png', 'merge', 'compress', 'extract']; // suffixes
        const toolMap = {
            'png': 'png-to-pdf',
            'merge': 'pdf-merge',
            'compress': 'pdf-compress',
            'extract': 'pdf-to-png'
        };

        tools.forEach(suffix => {
            const dropZone = document.getElementById(`drop-zone-${suffix}`);
            const input = document.getElementById(`input-${suffix}`);
            const toolId = toolMap[suffix];

            dropZone.addEventListener('click', () => input.click());

            input.addEventListener('change', (e) => {
                this.handleFiles(toolId, Array.from(e.target.files));
                input.value = ''; // reset
            });

            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });

            dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
                this.handleFiles(toolId, Array.from(e.dataTransfer.files));
            });
        });
    },

    handleFiles(toolId, newFiles) {
        // Validate
        const validFiles = newFiles.filter(f => {
            if (toolId === 'png-to-pdf') return f.type.startsWith('image/');
            return f.type === 'application/pdf';
        });

        if (toolId === 'pdf-compress' || toolId === 'pdf-to-png') {
            // Single file only for these demos (though logic could handle more)
            this.state.files[toolId] = [validFiles[0]].filter(Boolean);
        } else {
            this.state.files[toolId] = [...this.state.files[toolId], ...validFiles];
        }

        this.updateUI(toolId);
    },

    updateUI(toolId) {
        const files = this.state.files[toolId];
        let container, btn;

        if (toolId === 'png-to-pdf') {
            container = document.getElementById('preview-png');
            btn = document.getElementById('btn-convert-png');
            container.innerHTML = files.map((f, i) => 
                `<img src="${URL.createObjectURL(f)}" class="preview-img" title="${f.name}">`
            ).join('');
        } else if (toolId === 'pdf-merge') {
            container = document.getElementById('list-merge');
            btn = document.getElementById('btn-merge');
            container.innerHTML = files.map((f, i) => `
                <div class="file-item">
                    <span>${f.name}</span>
                    <button class="remove-file" onclick="app.removeFile('${toolId}', ${i})">&times;</button>
                </div>
            `).join('');
        } else {
            // Single file lists
            const suffix = toolId === 'pdf-compress' ? 'compress' : 'extract';
            container = document.getElementById(`list-${suffix}`);
            btn = document.getElementById(`btn-${suffix}`);
            if (files.length > 0) {
                container.innerHTML = `
                <div class="file-item">
                    <span>${files[0].name}</span>
                    <button class="remove-file" onclick="app.removeFile('${toolId}', 0)">&times;</button>
                </div>`;
            } else {
                container.innerHTML = '';
            }
        }

        btn.disabled = files.length === 0;
    },

    removeFile(toolId, index) {
        this.state.files[toolId] = this.state.files[toolId].filter((_, i) => i !== index);
        this.updateUI(toolId);
    },

    setupActionButtons() {
        document.getElementById('btn-convert-png').onclick = () => this.processPngToPdf();
        document.getElementById('btn-merge').onclick = () => this.processMerge();
        document.getElementById('btn-compress').onclick = () => this.processCompress();
        document.getElementById('btn-extract').onclick = () => this.processExtract();
    },

    // --- PROCESSORS ---

    async processPngToPdf() {
        const btn = document.getElementById('btn-convert-png');
        btn.textContent = 'Generating...';
        btn.disabled = true;

        try {
            const { PDFDocument } = PDFLib;
            const pdfDoc = await PDFDocument.create();
            
            for (const file of this.state.files['png-to-pdf']) {
                const arrayBuffer = await file.arrayBuffer();
                let image;
                if (file.type === 'image/jpeg') {
                    image = await pdfDoc.embedJpg(arrayBuffer);
                } else {
                    image = await pdfDoc.embedPng(arrayBuffer);
                }
                
                const page = pdfDoc.addPage([image.width, image.height]);
                page.drawImage(image, {
                    x: 0,
                    y: 0,
                    width: image.width,
                    height: image.height,
                });
            }

            const pdfBytes = await pdfDoc.save();
            this.downloadBlob(pdfBytes, 'converted-images.pdf');
        } catch (err) {
            alert('Error: ' + err.message);
            console.error(err);
        } finally {
            btn.textContent = 'Generate PDF';
            btn.disabled = false;
        }
    },

    async processMerge() {
        const btn = document.getElementById('btn-merge');
        btn.textContent = 'Merging...';
        btn.disabled = true;

        try {
            const { PDFDocument } = PDFLib;
            const mergedPdf = await PDFDocument.create();

            for (const file of this.state.files['pdf-merge']) {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await PDFDocument.load(arrayBuffer);
                const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            }

            const pdfBytes = await mergedPdf.save();
            this.downloadBlob(pdfBytes, 'merged.pdf');
        } catch (err) {
            alert('Error creating merge: ' + err.message);
        } finally {
            btn.textContent = 'Merge Files';
            btn.disabled = false;
        }
    },

    async processCompress() {
        const btn = document.getElementById('btn-compress');
        btn.textContent = 'Optimizing...';
        btn.disabled = true;

        try {
            const file = this.state.files['pdf-compress'][0];
            const arrayBuffer = await file.arrayBuffer();
            const { PDFDocument } = PDFLib;
            
            // Load and re-save is the basic opt we can do client-side
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            const pdfBytes = await pdfDoc.save({ useObjectStreams: false }); // sometimes switching setup helps, or just valid rewriting
            
            this.downloadBlob(pdfBytes, `optimized-${file.name}`);
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            btn.textContent = 'Optimize & Save';
            btn.disabled = false;
        }
    },

    async processExtract() {
        const btn = document.getElementById('btn-extract');
        const progressBar = document.querySelector('#progress-extract .progress-bar');
        document.getElementById('progress-extract').style.display = 'block';
        btn.textContent = 'Processing...';
        btn.disabled = true;

        try {
            const file = this.state.files['pdf-to-png'][0];
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            
            const zip = new JSZip();
            const totalPages = pdf.numPages;

            for (let i = 1; i <= totalPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for quality
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({ canvasContext: context, viewport: viewport }).promise;

                // Add to Zip
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                zip.file(`page-${i}.png`, blob);

                // Update Progress
                progressBar.style.width = `${(i / totalPages) * 100}%`;
            }

            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, "pdf-images.zip");

        } catch (err) {
            alert('Error: ' + err.message);
            console.error(err);
        } finally {
            btn.textContent = 'Convert to PNGs';
            btn.disabled = false;
            setTimeout(() => {
                document.getElementById('progress-extract').style.display = 'none';
                progressBar.style.width = '0%';
            }, 2000);
        }
    },

    downloadBlob(data, filename) {
        const blob = new Blob([data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
};

// Initialize
app.init();
