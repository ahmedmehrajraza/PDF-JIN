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

        // Dynamic labels for tools
        this.toolConfig = {
            'pdf-split': { title: 'Split PDF', accept: '.pdf' },
            'pdf-remove': { title: 'Remove Pages', accept: '.pdf' },
            'pdf-extract': { title: 'Extract Pages', accept: '.pdf' },
            'pdf-organize': { title: 'Organize PDF', accept: '.pdf' },
            'scan-pdf': { title: 'Scan to PDF', accept: 'image/*' },
            'pdf-repair': { title: 'Repair PDF', accept: '.pdf' },
            'pdf-ocr': { title: 'OCR PDF', accept: '.pdf' },
            'png-to-pdf': { title: 'PNG to PDF', accept: 'image/*' }, // native support
            'word-to-pdf': { title: 'Word to PDF', accept: '.docx,.doc' },
            'ppt-to-pdf': { title: 'PowerPoint to PDF', accept: '.pptx,.ppt' },
            'excel-to-pdf': { title: 'Excel to PDF', accept: '.xlsx,.xls' },
            'html-to-pdf': { title: 'HTML to PDF', accept: '.html,.htm' },
            'pdf-to-jpg': { title: 'PDF to JPG', accept: '.pdf' },
            'pdf-to-word': { title: 'PDF to Word', accept: '.pdf' },
            'pdf-to-ppt': { title: 'PDF to PowerPoint', accept: '.pdf' },
            'pdf-to-excel': { title: 'PDF to Excel', accept: '.pdf' },
            'pdf-to-pdfa': { title: 'PDF to PDF/A', accept: '.pdf' },
            'pdf-rotate': { title: 'Rotate PDF', accept: '.pdf' },
            'pdf-number': { title: 'Add Page Numbers', accept: '.pdf' },
            'pdf-watermark': { title: 'Add Watermark', accept: '.pdf' },
            'pdf-crop': { title: 'Crop PDF', accept: '.pdf' },
        };
    },

    // --- Navigation ---
    openTool(toolId) {
        document.getElementById('landing-view').style.display = 'none';
        document.querySelectorAll('.workspace').forEach(el => el.classList.remove('active'));

        const specificWorkspace = document.getElementById(toolId);
        if (specificWorkspace) {
            specificWorkspace.classList.add('active');
        } else {
            // Use universal workspace
            const universal = document.getElementById('universal-workspace');
            universal.classList.add('active');

            // Configure universal workspace
            const config = this.toolConfig[toolId] || { title: 'Tool', accept: '*' };
            document.getElementById('universal-title').textContent = config.title;
            const input = document.getElementById('input-universal');
            input.accept = config.accept;
            input.multiple = true; // allow multiple by default

            // Reset universal list
            document.getElementById('list-universal').innerHTML = '';
            document.getElementById('btn-universal').disabled = true;
        }

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
        // Handled via onclick in HTML
    },

    setupDragDrop() {
        // Native tools
        const nativeTools = ['png', 'merge', 'compress', 'extract'];
        const toolMap = {
            'png': 'png-to-pdf',
            'merge': 'pdf-merge',
            'compress': 'pdf-compress',
            'extract': 'pdf-to-png'
        };

        nativeTools.forEach(suffix => {
            this.bindDragDrop(`drop-zone-${suffix}`, `input-${suffix}`, toolMap[suffix]);
        });

        // Universal tool
        this.bindDragDrop('drop-zone-universal', 'input-universal', 'universal');
    },

    bindDragDrop(zoneId, inputId, toolKey) {
        const dropZone = document.getElementById(zoneId);
        const input = document.getElementById(inputId);

        dropZone.addEventListener('click', () => input.click());

        input.addEventListener('change', (e) => {
            this.handleFiles(toolKey, Array.from(e.target.files));
            input.value = '';
        });

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            this.handleFiles(toolKey, Array.from(e.dataTransfer.files));
        });
    },

    handleFiles(key, newFiles) {
        // If key is 'universal', we map it to current active tool
        const toolId = key === 'universal' ? this.state.activeTool : key;

        // Initialize state array if not exists
        if (!this.state.files[toolId]) {
            this.state.files[toolId] = [];
        }

        if (toolId === 'pdf-compress' || toolId === 'pdf-to-png') {
            this.state.files[toolId] = [newFiles[0]].filter(Boolean);
        } else {
            this.state.files[toolId] = [...this.state.files[toolId], ...newFiles];
        }

        this.updateUI(toolId);
    },

    updateUI(toolId) {
        const files = this.state.files[toolId] || [];
        let container, btn;

        if (toolId === 'png-to-pdf') {
            container = document.getElementById('preview-png');
            btn = document.getElementById('btn-convert-png');
            container.innerHTML = files.map((f) =>
                `<img src="${URL.createObjectURL(f)}" class="preview-img" title="${f.name}">`
            ).join('');
        } else if (toolId === 'pdf-merge') {
            container = document.getElementById('list-merge');
            btn = document.getElementById('btn-merge');
            container.innerHTML = this.renderFileList(files, toolId);
        } else if (toolId === 'pdf-compress' || toolId === 'pdf-to-png') {
            const suffix = toolId === 'pdf-compress' ? 'compress' : 'extract';
            container = document.getElementById(`list-${suffix}`);
            btn = document.getElementById(`btn-${suffix}`);
            container.innerHTML = this.renderFileList(files, toolId);
        } else {
            // Universal UI
            container = document.getElementById('list-universal');
            btn = document.getElementById('btn-universal');
            if (container) {
                container.innerHTML = this.renderFileList(files, toolId);
            }
        }

        if (btn) btn.disabled = files.length === 0;
    },

    renderFileList(files, toolId) {
        return files.map((f, i) => `
            <div class="file-item">
                <span>${f.name}</span>
                <button class="remove-file" onclick="app.removeFile('${toolId}', ${i})">&times;</button>
            </div>
        `).join('');
    },

    removeFile(toolId, index) {
        this.state.files[toolId] = this.state.files[toolId].filter((_, i) => i !== index);
        this.updateUI(toolId);
    },

    setupActionButtons() {
        const btnPng = document.getElementById('btn-convert-png');
        if (btnPng) btnPng.onclick = () => this.processPngToPdf();

        const btnMerge = document.getElementById('btn-merge');
        if (btnMerge) btnMerge.onclick = () => this.processMerge();

        const btnCompress = document.getElementById('btn-compress');
        if (btnCompress) btnCompress.onclick = () => this.processCompress();

        const btnExtract = document.getElementById('btn-extract');
        if (btnExtract) btnExtract.onclick = () => this.processExtract();

        // Universal button
        const btnUniversal = document.getElementById('btn-universal');
        if (btnUniversal) btnUniversal.onclick = () => this.processUniversal();
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
            const pdfBytes = await pdfDoc.save({ useObjectStreams: false });

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
                const viewport = page.getViewport({ scale: 3.0 }); // Increased scale for better quality
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({ canvasContext: context, viewport: viewport }).promise;

                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                zip.file(`page-${i}.png`, blob);

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

    // --- UNIVERSAL PROCESSORS ---
    async processUniversal() {
        // Router for universal processing
        const toolId = this.state.activeTool;

        if (toolId === 'pdf-split') return this.processSplit();
        if (toolId === 'pdf-rotate') return this.processRotate();
        if (toolId === 'pdf-watermark') return this.processWatermark();
        if (toolId === 'pdf-remove') return this.processRemove();
        if (toolId === 'pdf-number') return this.processPageNumbers();
        if (toolId === 'pdf-to-jpg') return this.processPdfToJpg();
        // Add more routers here as we build them

        alert(`The feature "${this.toolConfig[toolId].title}" requires server-side processing which is not available in this offline version yet.`);
    },

    async processSplit() {
        const btn = document.getElementById('btn-universal');
        btn.textContent = 'Splitting...';
        btn.disabled = true;
        try {
            const file = this.state.files['pdf-split'][0];
            const arrayBuffer = await file.arrayBuffer();
            const { PDFDocument } = PDFLib;
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            const totalPages = pdfDoc.getPageCount();

            const zip = new JSZip();

            for (let i = 0; i < totalPages; i++) {
                const newPdf = await PDFDocument.create();
                const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
                newPdf.addPage(copiedPage);
                const pdfBytes = await newPdf.save();
                zip.file(`${file.name.replace('.pdf', '')}_page_${i + 1}.pdf`, pdfBytes);
            }

            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, "split-pages.zip");
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            btn.textContent = 'Start Processing';
            btn.disabled = false;
        }
    },

    async processRotate() {
        const btn = document.getElementById('btn-universal');
        btn.textContent = 'Rotating...';
        btn.disabled = true;
        try {
            const file = this.state.files['pdf-rotate'][0];
            const arrayBuffer = await file.arrayBuffer();
            const { PDFDocument, degrees } = PDFLib;
            const pdfDoc = await PDFDocument.load(arrayBuffer);

            const pages = pdfDoc.getPages();
            pages.forEach(page => {
                const rotation = page.getRotation();
                page.setRotation(degrees(rotation.angle + 90));
            });

            const pdfBytes = await pdfDoc.save();
            this.downloadBlob(pdfBytes, `rotated-${file.name}`);
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            btn.textContent = 'Start Processing';
            btn.disabled = false;
        }
    },

    async processWatermark() {
        const btn = document.getElementById('btn-universal');
        btn.textContent = 'Stamping...';
        btn.disabled = true;
        try {
            const file = this.state.files['pdf-watermark'][0];
            const arrayBuffer = await file.arrayBuffer();
            const { PDFDocument, rgb, degrees } = PDFLib;
            const pdfDoc = await PDFDocument.load(arrayBuffer);

            const pages = pdfDoc.getPages();
            pages.forEach(page => {
                const { width, height } = page.getSize();
                page.drawText('PDF JIN', {
                    x: width / 2 - 50,
                    y: height / 2,
                    size: 50,
                    color: rgb(0.95, 0.1, 0.1),
                    opacity: 0.5,
                    rotate: degrees(45),
                });
            });

            const pdfBytes = await pdfDoc.save();
            this.downloadBlob(pdfBytes, `watermarked-${file.name}`);
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            btn.textContent = 'Start Processing';
            btn.disabled = false;
        }
    },

    async processRemove() {
        const input = prompt("Enter page numbers to remove (comma separated, e.g. 1,3):");
        if (!input) {
            document.getElementById('btn-universal').disabled = false;
            return;
        }
        const pagesToRemove = input.split(',').map(n => parseInt(n.trim()) - 1).filter(n => !isNaN(n));

        const btn = document.getElementById('btn-universal');
        btn.textContent = 'Removing...';
        btn.disabled = true;

        try {
            const file = this.state.files['pdf-remove'][0];
            const arrayBuffer = await file.arrayBuffer();
            const { PDFDocument } = PDFLib;
            const pdfDoc = await PDFDocument.load(arrayBuffer);

            // Delete pages in reverse order to avoid index shifting problems
            const sortedPages = pagesToRemove.sort((a, b) => b - a);
            for (const p of sortedPages) {
                if (p >= 0 && p < pdfDoc.getPageCount()) {
                    pdfDoc.removePage(p);
                }
            }

            const pdfBytes = await pdfDoc.save();
            this.downloadBlob(pdfBytes, `removed-pages-${file.name}`);
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            btn.textContent = 'Start Processing';
            btn.disabled = false;
        }
    },

    async processPageNumbers() {
        const btn = document.getElementById('btn-universal');
        btn.textContent = 'Numbering...';
        btn.disabled = true;

        try {
            const file = this.state.files['pdf-number'][0];
            const arrayBuffer = await file.arrayBuffer();
            const { PDFDocument, rgb, StandardFonts } = PDFLib;
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

            const pages = pdfDoc.getPages();
            const total = pages.length;

            pages.forEach((page, idx) => {
                const { width } = page.getSize();
                page.drawText(`${idx + 1} / ${total}`, {
                    x: width / 2 - 10,
                    y: 20,
                    size: 12,
                    font: helveticaFont,
                    color: rgb(0, 0, 0),
                });
            });

            const pdfBytes = await pdfDoc.save();
            this.downloadBlob(pdfBytes, `numbered-${file.name}`);
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            btn.textContent = 'Start Processing';
            btn.disabled = false;
        }
    },

    async processPdfToJpg() {
        const btn = document.getElementById('btn-universal');
        btn.textContent = 'Converting...';
        btn.disabled = true;

        try {
            const file = this.state.files['pdf-to-jpg'][0];
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

            const zip = new JSZip();
            const totalPages = pdf.numPages;

            for (let i = 1; i <= totalPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 3.0 }); // Increased scale for better quality
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({ canvasContext: context, viewport: viewport }).promise;

                // Maximum JPEG quality (1.0)
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 1.0));
                zip.file(`page-${i}.jpg`, blob);

                btn.textContent = `Converting ${i}/${totalPages}...`;
            }

            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, "converted-images.zip");
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            btn.textContent = 'Start Processing';
            btn.disabled = false;
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
