// Scravio Extension Background Script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveToken') {
    if (request.token) {
      chrome.storage.local.set({ scravio_token: request.token }, () => {
        console.log('[Scravio Extension] Token saved securely.');
        sendResponse({ success: true });
      });
      return true; // Keep message channel open for async response
    }
  } else if (request.action === 'getToken') {
    chrome.storage.local.get(['scravio_token'], (result) => {
      sendResponse({ token: result.scravio_token || null });
    });
    return true;
  }
});
