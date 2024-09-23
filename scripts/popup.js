console.log('popup.js loaded');

document.addEventListener('DOMContentLoaded', function () {
    const apiKeyInput = document.getElementById('apiKeyInput');
    const openNewTabCheckbox = document.getElementById('openNewTabCheckbox');
    const anonymousUploadCheckbox = document.getElementById('anonymousUploadCheckbox');
    const saveButton = document.getElementById('saveButton');
    const clearButton = document.getElementById('clearButton');

    chrome.storage.sync.get(['tutuApiKey', 'openNewTab', 'anonymousUpload'], function (result) {
        apiKeyInput.value = result.tutuApiKey || '';
        openNewTabCheckbox.checked = result.openNewTab || false;
        anonymousUploadCheckbox.checked = result.anonymousUpload || false;
    });
    saveButton.addEventListener('click', function () {
        const apiKey = apiKeyInput.value;
        const openNewTab = openNewTabCheckbox.checked;
        const anonymousUpload = anonymousUploadCheckbox.checked;
        chrome.storage.sync.set({ tutuApiKey: apiKey, openNewTab: openNewTab, anonymousUpload: anonymousUpload }, function () {
            showMessage('设置已保存！', 'success');
        });
    });

    clearButton.addEventListener('click', function () {
        apiKeyInput.value = '';
        chrome.storage.sync.set({ tutuApiKey: '' }, function () {
            showMessage('API 密钥已清除！', 'info');
        });
    });
    function showMessage(message, type) {
        const messageElement = document.createElement('div');
        messageElement.textContent = message;
        messageElement.className = `message ${type}`;
        document.body.appendChild(messageElement);

        setTimeout(() => {
            messageElement.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(messageElement);
            }, 300);
        }, 2000);
    }

    const style = document.createElement('style');
    style.textContent = `
        .message {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 10px 20px;
            border-radius: 4px;
            color: white;
            font-size: 14px;
            opacity: 1;
            transition: opacity 0.3s;
        }
        .success { background-color: #4CAF50; }
        .info { background-color: #2196F3; }
    `;
    document.head.appendChild(style);
});
