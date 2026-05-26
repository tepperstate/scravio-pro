import os

mock_script = """(function() {
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function() {
        this._url = arguments[1];
        return origOpen.apply(this, arguments);
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
        return origSend.apply(this, arguments);
    };
    const origFetch = window.fetch;
    if (origFetch) {
        window.fetch = async function(...args) {
            if (typeof args[0] === 'string' && args[0].includes('/auth/info')) {
                return new Response(JSON.stringify({ code: 200, data: { user: { id: "1", email: "pro@example.com" }, subscription: { isPro: true, plan: "PRO", isCanceled: false } } }));
            }
            return origFetch.apply(this, args);
        };
    }
    
    // Mock chrome.storage.local.get to return fake webAuthData
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const origGet = chrome.storage.local.get;
        chrome.storage.local.get = function(keys, callback) {
            let callbackFunc = callback;
            let mockData = { webAuthData: { id: "1", email: "pro@example.com", token: "fake_token" } };
            
            if (typeof keys === 'string' && keys === 'webAuthData') {
                if (callbackFunc) callbackFunc(mockData);
                return Promise.resolve(mockData);
            }
            if (Array.isArray(keys) && keys.includes('webAuthData')) {
                if (typeof callbackFunc === 'function') {
                    const origCallback = callbackFunc;
                    callbackFunc = function(res) {
                        res.webAuthData = mockData.webAuthData;
                        origCallback(res);
                    };
                    const prom = origGet.call(this, keys, callbackFunc);
                    if (prom) return prom.then(res => { res.webAuthData = mockData.webAuthData; return res; });
                    return prom;
                } else {
                    const prom = origGet.call(this, keys);
                    if (prom) return prom.then(res => { res.webAuthData = mockData.webAuthData; return res; });
                    return prom;
                }
            }
            return origGet.apply(this, arguments);
        };
    }
})();
"""

dir_path = r'C:\Users\Robocop\Downloads\Scravio-pro\chrome-extension'

# Remove old patches and apply new mock script to all entry points
for filename in ['popup.js', 'dashboard.js', 'background.js', 'auth.js']:
    filepath = os.path.join(dir_path, filename)
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            code = f.read()
            
        # Clean up any old injected wrapper if present
        if code.startswith('(function() {\n    const origOpen'):
            # find end of previous wrapper
            end_idx = code.find('})();\n')
            if end_idx != -1:
                code = code[end_idx + 6:]
                
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(mock_script + '\n' + code)
        print(f'Patched {filename} with API and Storage mocker')
