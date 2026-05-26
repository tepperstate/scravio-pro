// dashboard-bridge.js - Injected into the Scravio Dashboard
console.log('Scravio Pro Dashboard Bridge Injected', chrome.runtime.id);

// Inject a script tag to expose the ID to the page context
const script = document.createElement('script');
script.textContent = `window.SCRAVIO_EXTENSION_ID = "${chrome.runtime.id}";`;
(document.head || document.documentElement).appendChild(script);
script.remove();

// Listen for messages from the web page and forward them to the extension
window.addEventListener('message', (event) => {
    // We only accept messages from ourselves
    if (event.source !== window) return;

    if (event.data && event.data.type === 'SCRAVIO_START_SCRAPING') {
        console.log('Forwarding start scraping message to extension');
        chrome.runtime.sendMessage({
            action: 'START_SCRAPING',
            task_data: event.data.payload,
            open_tab: true
        });
    }
});
