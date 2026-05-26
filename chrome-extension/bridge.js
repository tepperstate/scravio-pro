
// bridge.js - injected by Scravio Pro
console.log('Scravio Pro bridge injected');

// Listen for messages from the web app
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
    console.log('Received external message:', request, sender);
    
    if (request.action === 'PING') {
        sendResponse({ status: 'OK', version: chrome.runtime.getManifest().version });
        return true;
    }
    
    if (request.action === 'START_SCRAPING') {
        // Forward the message to the extension's internal listener
        // Or store it and trigger the UI
        chrome.storage.local.set({ 
            scravio_task: request.task_data 
        }, () => {
            sendResponse({ status: 'STARTED' });
            
            // Optionally open the extension popup or a new tab to start the process
            if (request.open_tab) {
                chrome.tabs.create({ url: 'https://www.instagram.com/' });
            }
        });
        return true;
    }
});
