const fs = require('fs');
const path = require('path');

const mock_xhr = `(function() {
    try {
        const _origOpen = XMLHttpRequest.prototype.open;
        const _origSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.open = function() {
            this._url = arguments[1];
            return _origOpen.apply(this, arguments);
        };
        XMLHttpRequest.prototype.send = function() {
            if (this._url && this._url.includes('/auth/info')) {
                Object.defineProperty(this, 'readyState', { value: 4, configurable: true });
                Object.defineProperty(this, 'status', { value: 200, configurable: true });
                const mockResponse = JSON.stringify({ code: 200, data: { user: { id: "1", email: "pro@example.com" }, subscription: { isPro: true, plan: "PRO", isCanceled: false } } });
                Object.defineProperty(this, 'response', { value: mockResponse, configurable: true });
                Object.defineProperty(this, 'responseText', { value: mockResponse, configurable: true });
                this.getAllResponseHeaders = function() { return "content-type: application/json\\r\\n"; };
                setTimeout(() => {
                    if (this.onreadystatechange) this.onreadystatechange();
                    if (this.onload) this.onload();
                }, 10);
                return;
            }
            return _origSend.apply(this, arguments);
        };
    } catch(e) {}
    try {
        const _origFetch = globalThis.fetch;
        if (_origFetch) {
            globalThis.fetch = async function(...args) {
                if (typeof args[0] === 'string' && args[0].includes('/auth/info')) {
                    return new Response(JSON.stringify({ code: 200, data: { user: { id: "1", email: "pro@example.com" }, subscription: { isPro: true, plan: "PRO", isCanceled: false } } }));
                }
                return _origFetch.apply(this, args);
            };
        }
    } catch(e) {}
})();`;

const dir_path = 'C:\\\\Users\\\\Robocop\\\\Downloads\\\\Scravio-pro\\\\chrome-extension';

['popup.js', 'dashboard.js', 'content-script.js', 'background.js', 'auth.js'].forEach(filename => {
    const filepath = path.join(dir_path, filename);
    let content = fs.readFileSync(filepath, 'utf8');
    fs.writeFileSync(filepath, mock_xhr + '\n' + content);
    console.log('Injected mock into ' + filename);
});

const dash_path = path.join(dir_path, 'dashboard.js');
let dash = fs.readFileSync(dash_path, 'utf8');
dash = dash.replace(/e\.extractEmailCount>=e\.trialCount\|\|e\.localExtractEmailCount>=e\.trialCount/g, 'false===true');
fs.writeFileSync(dash_path, dash);
console.log('Patched dashboard.js trial limit');

const popup_path = path.join(dir_path, 'popup.js');
let popup = fs.readFileSync(popup_path, 'utf8');
popup = popup.replace(/t\.extractEmailCount>=t\.trialCount/g, 'false===true');
popup = popup.replace(/this\.extractEmailCount>=this\.trialCount/g, 'false===true');
fs.writeFileSync(popup_path, popup);
console.log('Patched popup.js trial limit');
