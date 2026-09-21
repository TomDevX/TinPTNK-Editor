// ==UserScript==
// @name         TinPTNK Simplified Submitter
// @namespace    http://tampermonkey.net/
// @version      1.2
// @license      MIT
// @description  Text Editor GUI for TinPTNK OJ - with auto file detector, hotkeys (Ctrl+S, Alt+S) and submit through text
// @author       TomDev
// @match        http://www.tinptnk.com/*
// @match        http://haitppt.ddns.net:81/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const sidebar = document.querySelector('.jumbotron .col-sm-3');
    const nativeFileInput = document.querySelector('input#file.chk-file');
    const nativeForm = document.querySelector('form[action="upload.php"]');

    if (!sidebar || !nativeFileInput || !nativeForm) return;

    sidebar.innerHTML = `
    <div id="better-cses-box" style="background: #fff; padding: 15px; border: 1px solid #ddd; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
    <h4 style="margin-top: 0; margin-bottom: 12px; font-size: 15px; font-weight: bold; color: #333; border-bottom: 1px solid #eee; padding-bottom: 6px;">
    <span style="color: #3b5998;">●</span> Fast submit
    </h4>

    <div style="margin-bottom: 8px;">
    <label style="display:block; margin-bottom: 4px; font-size: 12px; font-weight: bold; color: #555;">File name (If blank, auto scan for freopen):</label>
    <input type="text" id="cf-probname" placeholder="E.g: aplusb, counting"
    style="width: 100%; padding: 5px 8px; font-size: 12px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
    </div>

    <div style="margin-bottom: 10px;">
    <textarea id="cf-codearea" placeholder="Paste C++ file here"
    style="width: 100%; height: 160px; font-family: 'Courier New', Courier, monospace; font-size: 12px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; resize: vertical; box-sizing: border-box;"></textarea>
    </div>

    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px;">
    <div style="display: flex; gap: 6px;">
    <button type="button" id="cf-submit-btn" style="background-color: #3b5998; color: white; border: none; padding: 6px 12px; font-size: 13px; font-weight: bold; border-radius: 4px; cursor: pointer; transition: background 0.2s;">
    Submit (Ctrl+S)
    </button>
    <button type="button" id="cf-upload-btn" style="background-color: #f3f3f4; color: #333; border: 1px solid #d1d1d4; padding: 6px 12px; font-size: 13px; font-weight: 500; border-radius: 4px; cursor: pointer; transition: background 0.2s;">
    Upload (Alt+S)
    </button>
    </div>
    <span id="cf-status" style="font-size: 11px; font-weight: bold; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: right;"></span>
    </div>
    </div>
    `;

    const btn = document.getElementById('cf-submit-btn');
    const uploadBtn = document.getElementById('cf-upload-btn');
    const codeArea = document.getElementById('cf-codearea');
    const probInput = document.getElementById('cf-probname');
    const statusSpan = document.getElementById('cf-status');

    nativeFileInput.style.display = 'none';

    function extractFilenameFromCode(code) {
        if (!code) return null;
        // Quét regex linh hoạt hơn cho freopen/fopen ở bất kỳ vị trí nào trong file
        const fileMatch = code.match(/(?:freopen|fopen)\s*\(\s*["']([^"'\s]+)\.(inp|in|out|sol|txt)["']/i);
        if (fileMatch && fileMatch[1]) {
            return fileMatch[1].trim() + '.cpp';
        }
        return null;
    }

    function updateFilePreview() {
        const manualName = probInput.value.trim();
        if (manualName) {
            statusSpan.innerText = `File: ${manualName}.cpp`;
            statusSpan.style.color = '#3b5998';
        } else {
            const fileName = extractFilenameFromCode(codeArea.value);
            if (fileName) {
                statusSpan.innerText = `File: ${fileName}`;
                statusSpan.style.color = '#555';
            } else {
                statusSpan.innerText = '';
            }
        }
    }

    probInput.addEventListener('input', updateFilePreview);
    codeArea.addEventListener('input', updateFilePreview);

    function renderPendingSubmissions() {
        const logTableBody = document.querySelector('#logs table tbody');
        if (!logTableBody) return;

        const pending = JSON.parse(localStorage.getItem('ptnk_pending_subs') || '{}');

        for (const [fileName, timeStamp] of Object.entries(pending)) {
            const isFileProcessed = Array.from(logTableBody.querySelectorAll('tr td:nth-child(2)'))
            .some(td => td.innerText.trim() === fileName);

            if (isFileProcessed) {
                delete pending[fileName];
                localStorage.setItem('ptnk_pending_subs', JSON.stringify(pending));
                continue;
            }

            const newRow = document.createElement('tr');
            newRow.className = 'better-cses-pending-row';
            newRow.style.backgroundColor = '#fff9e6';

            const btnDel = document.createElement('button');
            btnDel.innerHTML = 'X';
            btnDel.style.cssText = 'color: white; background: #e74c3c; border: none; padding: 2px 6px; border-radius: 3px; cursor: pointer; font-size: 10px; margin-left: 10px;';
            btnDel.onclick = function() {
                if (confirm(`Remove ${fileName} from queue?`)) {
                    const currentPending = JSON.parse(localStorage.getItem('ptnk_pending_subs') || '{}');
                    delete currentPending[fileName];
                    localStorage.setItem('ptnk_pending_subs', JSON.stringify(currentPending));
                    newRow.remove();
                }
            };

            newRow.innerHTML = `
            <td>--</td>
            <td style="font-weight: bold;">${fileName}</td>
            <td><span style="color: #f39c12; font-weight: bold;">[Waiting for judge...]</span></td>
            <td>--</td>
            <td><span style="color: #f39c12;"><i class="icon refresh"></i> Waiting...</span></td>
            `;
            newRow.cells[4].appendChild(btnDel);
            logTableBody.insertBefore(newRow, logTableBody.firstChild);
        }
    }

    if (typeof window.jQuery !== 'undefined') {
        const originalLoad = window.jQuery.fn.load;
        window.jQuery.fn.load = function(url, ...args) {
            if (typeof url === 'string' && url.includes('logs.php')) {
                const callback = args.find(arg => typeof arg === 'function');
                const newCallback = function(...cbArgs) {
                    if (callback) callback.apply(this, cbArgs);
                    renderPendingSubmissions();
                };
                const cbIndex = args.findIndex(arg => typeof arg === 'function');
                if (cbIndex !== -1) args[cbIndex] = newCallback;
                else args.push(newCallback);
            }
            return originalLoad.apply(this, [url, ...args]);
        };
    }

    setTimeout(renderPendingSubmissions, 500);

    function sendFileToServer(file, name) {
        statusSpan.innerText = 'Submitting...';
        statusSpan.style.color = '#3b5998';

        const formData = new FormData();
        formData.append('file', file);

        fetch('upload.php', { method: 'POST', body: formData })
        .then(response => {
            if (response.ok) {
                statusSpan.innerText = 'Completed!';
                statusSpan.style.color = '#00aa00';
                const pending = JSON.parse(localStorage.getItem('ptnk_pending_subs') || '{}');
                pending[name] = Date.now();
                localStorage.setItem('ptnk_pending_subs', JSON.stringify(pending));
                renderPendingSubmissions();
                if (typeof window.jQuery !== 'undefined') window.jQuery('#logs').load('logs.php');
            } else {
                statusSpan.innerText = 'Server error!';
                statusSpan.style.color = '#cc0000';
            }
        })
        .catch(err => {
            console.error(err);
            statusSpan.innerText = 'Connection error!';
            statusSpan.style.color = '#cc0000';
        });
    }

    function executeSubmit(overrideCode) {
        const codeText = (overrideCode && overrideCode.trim()) ? overrideCode : codeArea.value;
        if (!codeText.trim()) return;

        let fileName = '';
        const manualName = probInput.value.trim();

        if (manualName) {
            fileName = manualName.endsWith('.cpp') ? manualName : manualName + '.cpp';
        } else {
            fileName = extractFilenameFromCode(codeText);
        }

        if (!fileName) {
            statusSpan.innerText = 'Missing file name!';
            statusSpan.style.color = '#cc0000';
            return;
        }

        const blob = new Blob([codeText], { type: 'text/plain' });
        const file = new File([blob], fileName, { type: 'text/plain' });

        codeArea.value = '';
        sendFileToServer(file, fileName);
    }

    btn.addEventListener('click', () => executeSubmit());

    uploadBtn.addEventListener('click', function() {
        nativeFileInput.click();
    });

    nativeFileInput.addEventListener('change', function() {
        if (nativeFileInput.files && nativeFileInput.files.length > 0) {
            const selectedFile = nativeFileInput.files[0];
            sendFileToServer(selectedFile, selectedFile.name);
        }
    });

    // Bridge trung gian paste và nộp bài
    function capturePasteAndSubmit() {
        const hiddenArea = document.createElement('textarea');
        hiddenArea.style.position = 'fixed';
        hiddenArea.style.left = '-9999px';
        hiddenArea.style.top = '0';
        hiddenArea.style.opacity = '0';
        document.body.appendChild(hiddenArea);
        hiddenArea.focus();

        let pasted = false;
        try {
            pasted = document.execCommand('paste');
        } catch (e) {}

        if (pasted && hiddenArea.value.trim()) {
            const clipText = hiddenArea.value;
            codeArea.value = clipText;
            updateFilePreview();
            document.body.removeChild(hiddenArea);
            executeSubmit(clipText);
            return;
        }
        document.body.removeChild(hiddenArea);

        // Fallback: Nếu trình duyệt cho phép đọc qua API Clipboard
        if (navigator.clipboard && navigator.clipboard.readText) {
            navigator.clipboard.readText().then(clipText => {
                if (clipText && clipText.trim()) {
                    codeArea.value = clipText;
                    updateFilePreview();
                    executeSubmit(clipText);
                } else {
                    executeSubmit();
                }
            }).catch(() => {
                executeSubmit();
            });
            return;
        }

        executeSubmit();
    }

    // Lắng nghe sự kiện phím tắt Global ở giai đoạn Capture Phase
    window.addEventListener('keydown', function(e) {
        const isCtrlOrMeta = e.ctrlKey || e.metaKey;
        const isKeyS = e.key === 's' || e.key === 'S' || e.code === 'KeyS';

        if (isCtrlOrMeta && isKeyS) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            capturePasteAndSubmit();
        } else if (e.altKey && isKeyS) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            nativeFileInput.click();
        }
    }, true);
})();
