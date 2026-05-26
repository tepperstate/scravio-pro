import sys
import os

content_path = r'C:\Users\Robocop\Downloads\Scravio-pro\chrome-extension\content-script.js'

with open(content_path, 'r', encoding='utf-8') as f:
    content = f.read()

patchCode = """
// Mocker injected to bypass paywall in content script
if (typeof window !== 'undefined') {
    window.MOCK_IS_PRO = true;
    
    // Override chrome.storage.local.get to return PRO status
    if (window.chrome && chrome.storage && chrome.storage.local) {
        const originalGet = chrome.storage.local.get;
        chrome.storage.local.get = function(keys, callback) {
            if (typeof keys === 'function') {
                callback = keys;
                keys = null;
            }
            
            originalGet.call(chrome.storage.local, keys, function(result) {
                // Force PRO status in webAuthData
                if (result && result.webAuthData) {
                    try {
                        let authData = typeof result.webAuthData === 'string' ? JSON.parse(result.webAuthData) : result.webAuthData;
                        if (!authData.subscription) authData.subscription = {};
                        authData.subscription.isPro = true;
                        authData.subscription.plan = 'PRO';
                        authData.subscription.isCanceled = false;
                        result.webAuthData = typeof result.webAuthData === 'string' ? JSON.stringify(authData) : authData;
                    } catch(e) {}
                } else if (!result) {
                    result = {};
                }
                
                // Add a fake one if it doesn't exist
                if (!result.webAuthData) {
                    result.webAuthData = {
                        user: { id: '1', email: 'pro@example.com' },
                        subscription: { isPro: true, plan: 'PRO', isCanceled: false }
                    };
                }
                
                callback(result);
            });
        };
    }
}
"""

if 'MOCK_IS_PRO = true' not in content:
    with open(content_path, 'w', encoding='utf-8') as f:
        f.write(patchCode + '\n' + content)
    print('Patched content-script.js')
else:
    print('content-script.js is already patched')
