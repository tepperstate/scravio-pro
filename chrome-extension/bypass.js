(function() {
  const isMockUrl = (url) => typeof url === 'string' && url.includes('server.echobot.dev');

  const mockResponseText = JSON.stringify({
    result: {
      user: {
        id: "mock_pro_user",
        email: "super@scravio.com",
        username: "super_scravio",
      },
      subscription: {
        isPro: true,
        isCanceled: false,
        subscriptionId: "mock_sub_123",
        expireDate: 9999999999999, // Way in the future
      },
      isPro: true,
      success: true
    }
  });

  const mockToken = "mock_scravio_pro_token_99999";

  // Intercept XHR
  const originalXhrOpen = XMLHttpRequest.prototype.open;
  const originalXhrSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url) {
    this._url = url;
    return originalXhrOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function(body) {
    if (isMockUrl(this._url)) {
      console.log("[SuperScravio Bypass] Intercepted XHR:", this._url);
      
      // Simulate Parse Server login/session behavior
      if (this._url.includes('/login') || this._url.includes('/users') || this._url.includes('/functions/')) {
         Object.defineProperty(this, 'response', { writable: true });
         Object.defineProperty(this, 'responseText', { writable: true });
         Object.defineProperty(this, 'status', { writable: true });
         Object.defineProperty(this, 'readyState', { writable: true });
         
         this.status = 200;
         this.readyState = 4;
         this.response = mockResponseText;
         this.responseText = mockResponseText;

         if (this.onreadystatechange) {
            this.onreadystatechange();
         }
         if (this.onload) {
            this.onload();
         }
         return; // Don't actually send
      }
    }
    return originalXhrSend.apply(this, arguments);
  };

  // Intercept Fetch
  const originalFetch = window.fetch;
  window.fetch = async function() {
    const url = arguments[0];
    if (isMockUrl(url)) {
      console.log("[SuperScravio Bypass] Intercepted Fetch:", url);
      return new Response(mockResponseText, {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return originalFetch.apply(this, arguments);
  };

  // Overwrite local storage tokens if they are being checked
  try {
      localStorage.setItem('Parse/echobot/currentUser', mockResponseText);
      localStorage.setItem('Parse/echobot/installationId', 'mock_install_id');
  } catch(e) {}
  
  console.log("[SuperScravio Bypass] Installed successfully.");
})();
