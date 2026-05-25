// Scravio Extension Bridge Script
// Injected into the Scravio Dashboard to sync the auth token

(function() {
  'use strict';

  function syncToken() {
    const token = localStorage.getItem('SocialScravio_token');
    if (token) {
      // Send token to the extension background script
      chrome.runtime.sendMessage(
        "klhckdfmabjajononcligmdocabdkcdk", // We don't know the extension ID yet if it's unpacked, so we use generic postMessage or externally connectable.
        // Actually, since this is a content script injected by the extension, we can just use chrome.runtime.sendMessage directly!
        { action: 'saveToken', token: token },
        function(response) {
          if (chrome.runtime.lastError) {
            // Ignore connection errors if extension context invalidated
          } else {
            console.log('[Scravio Extension] Auth token synchronized successfully.');
          }
        }
      );
    }
  }

  // Sync immediately on load
  syncToken();

  // Watch for changes to localStorage (e.g., when the user logs in)
  window.addEventListener('storage', (e) => {
    if (e.key === 'SocialScravio_token') {
      syncToken();
    }
  });

  // Also hook into pushState/replaceState just in case it's set without triggering 'storage' event on the same window
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key, value) {
    const event = new Event('itemInserted');
    event.value = value; 
    event.key = key;
    document.dispatchEvent(event);
    originalSetItem.apply(this, arguments);
  };

  document.addEventListener("itemInserted", function(e) {
    if (e.key === 'SocialScravio_token') {
      syncToken();
    }
  }, false);

})();
