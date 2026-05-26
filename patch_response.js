const fs = require('fs');

const mockScript = `(function() {
    try {
        if (typeof XMLHttpRequest !== 'undefined') {
            const _origOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function() {
                this._url = arguments[1];
                return _origOpen.apply(this, arguments);
            };
            const _origSend = XMLHttpRequest.prototype.send;
            XMLHttpRequest.prototype.send = function() {
                this.addEventListener('readystatechange', function() {
                    if (this.readyState === 4 && this._url && this._url.includes('/auth/info')) {
                        try {
                            const data = JSON.parse(this.responseText);
                            if (data && data.data) {
                                data.data.isPro = true;
                                if (data.data.trialExtInfo) {
                                    data.data.trialExtInfo.isTrial = false;
                                    data.data.trialExtInfo.isFinished = false;
                                    data.data.trialExtInfo.left = 9999998;
                                    data.data.trialExtInfo.max = 9999999;
                                }
                                Object.defineProperty(this, 'responseText', { get: () => JSON.stringify(data) });
                                Object.defineProperty(this, 'response', { get: () => JSON.stringify(data) });
                            }
                        } catch(e) {}
                    }
                });
                return _origSend.apply(this, arguments);
            };
        }
        if (typeof globalThis.fetch !== 'undefined') {
            const _origFetch = globalThis.fetch;
            globalThis.fetch = async function(...args) {
                const res = await _origFetch.apply(this, args);
                if (typeof args[0] === 'string' && args[0].includes('/auth/info')) {
                    try {
                        const clonedRes = res.clone();
                        const data = await clonedRes.json();
                        if (data && data.data) {
                            data.data.isPro = true;
                            if (data.data.trialExtInfo) {
                                data.data.trialExtInfo.isTrial = false;
                                data.data.trialExtInfo.isFinished = false;
                                data.data.trialExtInfo.left = 9999998;
                                data.data.trialExtInfo.max = 9999999;
                            }
                            return new Response(JSON.stringify(data), {
                                status: res.status,
                                statusText: res.statusText,
                                headers: res.headers
                            });
                        }
                    } catch(e) {}
                }
                return res;
            };
        }
    } catch(e) {}
})();`;

let files = ['dashboard.js', 'popup.js', 'background.js', 'chunk-common.js', 'chunk-vendors.js'];
files.forEach(file => {
    let path = 'C:\\\\Users\\\\Robocop\\\\Downloads\\\\Scravio-pro\\\\chrome-extension\\\\' + file;
    if (fs.existsSync(path)) {
        let code = fs.readFileSync(path, 'utf8');
        // Remove old mock that started with (function() { try { const _origOpen = ...
        let cleanCode = code.replace(/^\(function\(\) \{\n    try \{\n        const _origOpen[\s\S]*?\n\n/m, '');
        // Actually, let's just restore from original ZIP again to be absolutely clean, 
        // OR better: search and replace any older block.
    }
});
