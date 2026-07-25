// ==UserScript==
// @name         TinPTNK Submitter
// @namespace    http://tampermonkey.net/
// @version      1.0
// @license      MIT
// @description  Ace Editor GUI for TinPTNK OJ - with auto file detector and submit through text
// @author       TomDev
// @match        http://www.tinptnk.com/*
// @match        http://haitppt.ddns.net:81/*
// @grant        none
// @downloadURL https://update.greasyfork.org/scripts/588506/TinPTNK%20Submitter.user.js
// @updateURL https://update.greasyfork.org/scripts/588506/TinPTNK%20Submitter.meta.js
// ==/UserScript==

(function() {
    'use strict';

    if (window.Notification) {
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    function triggerBrowserNotification(fileName, resultText) {
        if (!window.Notification) return;
        if (Notification.permission === 'granted') {
            const title = `Judged: ${fileName}`;
            const options = {
                body: `Result: ${resultText}`,
                tag: fileName,
                requireInteraction: false
            };
            const notification = new Notification(title, options);
            notification.onclick = function() {
                window.focus();
            };
        }
    }

    const resultSection = document.querySelector('.content-type-2');
    const nativeFileInput = document.querySelector('input#file.chk-file');
    const nativeForm = document.querySelector('form[action="upload.php"]');

    if (!resultSection || !nativeForm) return;

    if (nativeFileInput) {
        nativeFileInput.style.display = 'block';
    }

    const style = document.createElement('style');
    style.innerHTML = `
        .vnoj-wrapper {
            margin-top: 20px;
            margin-bottom: 25px;
            background: #fff;
            border: 1px solid #ccc;
            border-radius: 4px;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            box-sizing: border-box;
            transition: all 0.3s ease;
        }
        .vnoj-header {
            font-size: 20px;
            font-weight: 500;
            color: #231F20;
            margin-top: 0;
            margin-bottom: 0;
            padding-bottom: 10px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: pointer;
            user-select: none;
        }
        .vnoj-header.has-border {
            border-bottom: 1px solid #eee;
            margin-bottom: 15px;
        }
        .vnoj-form-row { margin-bottom: 15px; }
        .vnoj-label { display: block; font-size: 13px; font-weight: bold; color: #333; margin-bottom: 5px; }
        .vnoj-input-text { width: 100%; max-width: 300px; padding: 6px 10px; font-size: 13px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
        .vnoj-toolbar { background: #f5f5f5; border: 1px solid #ccc; border-bottom: none; border-radius: 4px 4px 0 0; padding: 10px 12px; display: flex; align-items: center; gap: 10px; }
        .vnoj-file-label { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; background-color: #fff; border: 1px solid #ccc; border-radius: 4px; font-size: 12px; font-weight: 600; color: #333; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .vnoj-file-label:hover { background-color: #e9e9e9; border-color: #999; }
        .vnoj-editor-frame { border: 1px solid #ccc; border-radius: 0 0 4px 4px; background: #fff; padding: 0; }
        #vnoj-ace-editor { position: relative; width: 100%; height: 380px; border-radius: 0 0 4px 4px; }
        #vnoj-ace-editor, #vnoj-ace-editor * { font-family: Consolas, 'Courier New', monospace !important; font-size: 14px !important; letter-spacing: 0 !important; word-spacing: 0 !important; line-height: 1.5 !important; text-shadow: none !important; }
        .vnoj-select { width: 100%; max-width: 200px; padding: 6px 10px; font-size: 13px; border: 1px solid #ccc; border-radius: 4px; background: #fff; }
        .vnoj-submit-bar { display: flex; align-items: center; gap: 15px; margin-top: 15px; }
        .vnoj-button { background-color: #231F20; color: #fff; border: 1px solid #231F20; padding: 8px 24px; font-size: 13px; font-weight: bold; border-radius: 4px; cursor: pointer; transition: background 0.15s; }
        .vnoj-button:hover { background-color: #403b3c; border-color: #403b3c; }
        .vnoj-status { font-size: 13px; font-weight: bold; }
        .btn-remove-pending { color: white; background: #e74c3c; border: none; padding: 4px 10px; border-radius: 3px; cursor: pointer; font-size: 10px; margin-left: 10px; transition: background 0.2s; font-weight: bold; }
        .btn-remove-pending:hover { background: #c0392b; }
        .btn-toggle-frame { background: #eee; border: 1px solid #ccc; padding: 4px 10px; font-size: 11px; font-weight: bold; cursor: pointer; border-radius: 4px; transition: background 0.2s; }
        .btn-toggle-frame:hover { background: #ddd; }
    `;
    document.head.appendChild(style);

    const vnojSection = document.createElement('div');
    vnojSection.className = 'row';
    vnojSection.innerHTML = `
        <div class="col-sm-12">
            <div class="vnoj-wrapper">
                <h2 class="vnoj-header has-border" id="vnoj-header-click">
                    <span>Submit Solution</span>
                    <button id="vnoj-toggle-btn" class="btn-toggle-frame">Collapse</button>
                </h2>

                <div id="vnoj-foldable-body">
                    <div class="vnoj-form-row">
                        <label class="vnoj-label">Problem Code Name (Leave blank for automatic freopen check):</label>
                        <input type="text" id="vnoj-prob-input" class="vnoj-input-text" placeholder="Ví dụ: plane, bitonic">
                    </div>
                    <div class="vnoj-form-row">
                        <div class="vnoj-toolbar">
                            <label class="vnoj-file-label" for="vnoj-file-loader">Load from file...</label>
                            <input type="file" id="vnoj-file-loader" style="display: none;">
                            <label class="vnoj-file-label" for="vnoj-submit-loader" style="background:#e1f5fe; border-color:#b3e5fc;">Upload & Submit</label>
                            <input type="file" id="vnoj-submit-loader" style="display: none;">
                        </div>
                        <div class="vnoj-editor-frame">
                            <div id="vnoj-ace-editor"></div>
                        </div>
                    </div>
                    <div class="vnoj-form-row">
                        <select id="vnoj-lang-select" class="vnoj-select">
                            <option value="c_cpp" selected>C++ (Themis)</option>
                            <option value="pascal">Pascal (Themis)</option>
                            <option value="python">Python 3</option>
                        </select>
                    </div>
                    <div class="vnoj-submit-bar">
                        <button type="button" id="vnoj-action-btn" class="vnoj-button">Submit Current!</button>
                        <span id="vnoj-status-node" class="vnoj-status"></span>
                    </div>
                </div>
            </div>
        </div>
    `;
    resultSection.parentNode.insertBefore(vnojSection, resultSection);

    const foldableBody = document.getElementById('vnoj-foldable-body');
    const headerClick = document.getElementById('vnoj-header-click');
    const toggleBtn = document.getElementById('vnoj-toggle-btn');
    const headerElement = document.querySelector('.vnoj-header');

    let isFolded = localStorage.getItem('vnoj_frame_folded') === 'true';

    function updateFrameVisibility() {
        if (isFolded) {
            foldableBody.style.display = 'none';
            toggleBtn.innerText = 'Expand';
            headerElement.classList.remove('has-border');
        } else {
            foldableBody.style.display = 'block';
            toggleBtn.innerText = 'Collapse';
            headerElement.classList.add('has-border');
            if (editor) {
                editor.resize();
            }
        }
    }

    function toggleFrame(e) {
        e.stopPropagation();
        isFolded = !isFolded;
        localStorage.setItem('vnoj_frame_folded', isFolded);
        updateFrameVisibility();
    }

    headerClick.addEventListener('click', toggleFrame);
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFrame(e);
    });

    let editor = null;
    const btnAction = document.getElementById('vnoj-action-btn');
    const inputProb = document.getElementById('vnoj-prob-input');
    const fileLoader = document.getElementById('vnoj-file-loader');
    const submitLoader = document.getElementById('vnoj-submit-loader');
    const statusNode = document.getElementById('vnoj-status-node');
    const langSelect = document.getElementById('vnoj-lang-select');

    function getRowSignature(tr) {
        if (!tr) return "";
        return Array.from(tr.cells)
            .map(cell => cell.innerText.trim())
            .join('|');
    }

    function findGradedRow(fileName) {
        const logTableBody = document.querySelector('#logs table tbody');
        if (!logTableBody) return null;
        const searchName = fileName.trim().toLowerCase();
        return Array.from(logTableBody.querySelectorAll('tr')).find(tr => {
            const tdFile = tr.cells[1];
            if (!tdFile || tdFile.innerText.trim().toLowerCase() !== searchName) return false;

            const tdStatus = tr.cells[2];
            if (tdStatus && tdStatus.innerText.includes('[Waiting for judge...]')) return false;

            return true;
        });
    }

    function detectProblemName(code, lang) {
        if (!code) return '';
        let match = null;

        if (lang === 'c_cpp') {
            const cppRegex = /freopen\s*\(\s*["']([^"'\s]+)\.(inp|in|out|sol|txt)["']/i;
            match = code.match(cppRegex);
        } else if (lang === 'pascal') {
            const pasRegex = /assign\s*\(\s*[a-zA-Z0-9_]+\s*,\s*['"]([^'"\s]+)\.(inp|in|out|sol|txt)['"]/i;
            match = code.match(pasRegex);
        } else if (lang === 'python') {
            const pyRegex = /open\s*\(\s*['"]([^'"\s]+)\.(inp|in|out|sol|txt)['"]/i;
            match = code.match(pyRegex);
        }

        if (!match) {
            const generalRegex = /(?:freopen|assign|open)\s*\(\s*(?:[a-zA-Z0-9_]+\s*,\s*)?['"]([^'"\s]+)\.(inp|in|out|sol|txt)['"]/i;
            match = code.match(generalRegex);
        }

        if (match && match[1]) {
            return match[1].trim();
        }
        return '';
    }

    const aceScript = document.createElement('script');
    aceScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.12/ace.js';
    aceScript.onload = function() {
        editor = ace.edit("vnoj-ace-editor");
        editor.setTheme("ace/theme/github");
        editor.session.setMode("ace/mode/c_cpp");
        editor.setOptions({
            fontFamily: "Consolas, 'Courier New', monospace",
            fontSize: "14px",
            behavioursEnabled: true,
            displayIndentGuides: true,
            showPrintMargin: false,
            highlightActiveLine: true,
            useSoftTabs: true,
            tabSize: 4
        });

        editor.session.on('change', () => {
            if (!inputProb.value.trim()) {
                const detected = detectProblemName(editor.getValue(), langSelect.value);
                if (detected) {
                    inputProb.placeholder = `Auto detect: ${detected}`;
                } else {
                    inputProb.placeholder = "E.g: aplusb, counting";
                }
            }
        });

        setTimeout(() => {
            editor.renderer.updateCharacterSize();
            editor.resize(true);
            updateFrameVisibility();
        }, 150);
    };
    document.head.appendChild(aceScript);

    langSelect.addEventListener('change', function() {
        if (editor) {
            editor.session.setMode("ace/mode/" + this.value);
            if (!inputProb.value.trim()) {
                const detected = detectProblemName(editor.getValue(), this.value);
                inputProb.placeholder = detected ? `Auto detect: ${detected}` : "E.g: aplusb, counting";
            }
        }
    });

    inputProb.addEventListener('input', function() {
        if (!this.value.trim() && editor) {
            const detected = detectProblemName(editor.getValue(), langSelect.value);
            this.placeholder = detected ? `Auto detect: ${detected}` : "E.g: aplusb, counting";
        }
    });

    if (nativeForm) {
        nativeForm.addEventListener('submit', function() {
            if (nativeFileInput && nativeFileInput.files && nativeFileInput.files[0]) {
                const fileName = nativeFileInput.files[0].name;

                const existingRow = findGradedRow(fileName);
                const sig = existingRow ? getRowSignature(existingRow) : "";

                const pending = JSON.parse(localStorage.getItem('ptnk_pending_subs') || '{}');
                pending[fileName] = {
                    submitTime: Date.now(),
                    lastSelfSignature: sig
                };
                localStorage.setItem('ptnk_pending_subs', JSON.stringify(pending));
            }
        });
    }

    function submitFileToServer(file, fileName, preSubmitSignature) {
        statusNode.innerText = 'Uploading...';
        statusNode.style.color = '#3b5998';
        const formData = new FormData();
        formData.append('file', file);
        fetch('upload.php', { method: 'POST', body: formData })
        .then(res => {
            if (res.ok) {
                statusNode.innerText = 'Success!'; statusNode.style.color = '#00aa00';

                const pending = JSON.parse(localStorage.getItem('ptnk_pending_subs') || '{}');
                pending[fileName] = {
                    submitTime: Date.now(),
                    lastSelfSignature: preSubmitSignature
                };
                localStorage.setItem('ptnk_pending_subs', JSON.stringify(pending));
                renderPendingSubmissions();
                if (window.jQuery) window.jQuery('#logs').load('logs.php');
            } else { statusNode.innerText = 'Error!'; statusNode.style.color = '#cc0000'; }
        })
        .catch(() => { statusNode.innerText = 'Net Error!'; statusNode.style.color = '#cc0000'; });
    }

    fileLoader.addEventListener('change', function() {
        if (this.files[0] && editor) {
            const file = this.files[0];
            const parts = file.name.split('.');
            const ext = parts.length > 1 ? parts.pop().toLowerCase() : '';
            const baseName = parts.join('.');

            if (ext === 'cpp' || ext === 'c') {
                langSelect.value = 'c_cpp';
            } else if (ext === 'pas') {
                langSelect.value = 'pascal';
            } else if (ext === 'py') {
                langSelect.value = 'python';
            }
            editor.session.setMode("ace/mode/" + langSelect.value);

            const reader = new FileReader();
            reader.onload = (e) => {
                editor.setValue(e.target.result, -1);
                const detected = detectProblemName(e.target.result, langSelect.value);
                inputProb.value = detected || baseName;
            };
            reader.readAsText(file);
        }
    });

    submitLoader.addEventListener('change', function() {
        if (this.files[0]) {
            const file = this.files[0];
            const existingRow = findGradedRow(file.name);
            const sig = existingRow ? getRowSignature(existingRow) : "";
            submitFileToServer(file, file.name, sig);
        }
    });

    btnAction.addEventListener('click', function() {
        if (!editor) return;
        const code = editor.getValue();
        const lang = langSelect.value;
        const ext = lang === 'pascal' ? '.pas' : (lang === 'python' ? '.py' : '.cpp');

        let probName = inputProb.value.trim();
        if (!probName) {
            probName = detectProblemName(code, lang);
        }

        if (!probName) {
            statusNode.innerText = 'Can not detect freopen, please fill file name manually';
            statusNode.style.color = '#cc0000';
            return;
        }

        const fileName = probName + ext;
        const file = new File([new Blob([code])], fileName, { type: 'text/plain' });

        const existingRow = findGradedRow(fileName);
        const sig = existingRow ? getRowSignature(existingRow) : "";

        submitFileToServer(file, fileName, sig);
    });

    function renderPendingSubmissions() {
        const logTableBody = document.querySelector('#logs table tbody');
        if (!logTableBody) return;
        const pending = JSON.parse(localStorage.getItem('ptnk_pending_subs') || '{}');

        for (const [fileName, subInfo] of Object.entries(pending)) {
            const lastSelfSignature = (subInfo && typeof subInfo === 'object') ? subInfo.lastSelfSignature : "";

            const processedRow = findGradedRow(fileName);

            if (processedRow) {
                const currentSig = getRowSignature(processedRow);

                if (currentSig !== lastSelfSignature) {
                    const resultText = processedRow.cells[2] ? processedRow.cells[2].innerText.trim() : 'Completed';

                    triggerBrowserNotification(fileName, resultText);

                    delete pending[fileName];
                    localStorage.setItem('ptnk_pending_subs', JSON.stringify(pending));
                    continue;
                }
            }

            const isAlreadyRendered = Array.from(logTableBody.querySelectorAll('tr')).some(tr => {
                const td = tr.cells[1];
                const tdStatus = tr.cells[2];
                return td && td.innerText.trim().toLowerCase() === fileName.trim().toLowerCase() &&
                       tdStatus && tdStatus.innerText.includes('[Waiting for judge...]');
            });
            if (isAlreadyRendered) continue;

            const newRow = document.createElement('tr');
            newRow.style.backgroundColor = '#fff9e6';

            const btnDel = document.createElement('button');
            btnDel.innerHTML = 'X';
            btnDel.className = 'btn-remove-pending';

            let clickCount = 0;
            let resetTimeout;
            btnDel.onclick = () => {
                clickCount++;
                if (clickCount === 1) {
                    btnDel.innerHTML = 'Sure?';
                    btnDel.style.backgroundColor = '#e67e22';
                    resetTimeout = setTimeout(() => {
                        btnDel.innerHTML = 'X';
                        btnDel.style.backgroundColor = '#e74c3c';
                        clickCount = 0;
                    }, 3000);
                } else if (clickCount === 2) {
                    clearTimeout(resetTimeout);
                    delete pending[fileName];
                    localStorage.setItem('ptnk_pending_subs', JSON.stringify(pending));
                    newRow.remove();
                }
            };

            newRow.innerHTML = `<td>--</td><td style="font-weight: bold;">${fileName}</td><td><span style="color: #f39c12; font-weight: bold;">[Waiting for judge...]</span></td><td>--</td><td></td>`;
            newRow.cells[4].appendChild(btnDel);
            logTableBody.insertBefore(newRow, logTableBody.firstChild);
        }
    }

    if (typeof window.jQuery !== 'undefined') {
        const originalLoad = window.jQuery.fn.load;
        window.jQuery.fn.load = function(url, ...args) {
            if (typeof url === 'string' && url.includes('logs.php')) {
                const cbIndex = args.findIndex(arg => typeof arg === 'function');
                if (cbIndex !== -1) {
                    const original = args[cbIndex];
                    args[cbIndex] = (...cbArgs) => { original.apply(this, cbArgs); renderPendingSubmissions(); };
                }
                else args.push(renderPendingSubmissions);
            }
            return originalLoad.apply(this, [url, ...args]);
        };
    }
    setTimeout(renderPendingSubmissions, 500);
})();