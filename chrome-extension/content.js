// Scravio IG Follower Export - Content Script
// Extracts follower data from Instagram profile pages

(function() {
  'use strict';

  // Global accumulation stores for virtual scrolling
  let accumulatedFollowers = new Map();
  let accumulatedFollowing = new Map();

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getFollowerData') {
      try {
        // Run one last extraction before sending
        mergeModalFollowers();
        const data = extractFollowerData();
        sendResponse({ success: true, data });
      } catch (error) {
        console.error('SocialScravio Error:', error);
        sendResponse({ success: false, error: error.message });
      }
    } else if (message.action === 'fetchFollowersApi') {
      (async () => {
        let userId = getUserId();
        const username = window.location.pathname.replace(/\//g, '');
        
        if (!userId && username) {
          try {
            const res = await fetch(`https://www.instagram.com/web/search/topsearch/?context=blended&query=${username}`);
            const data = await res.json();
            const user = data.users.find(u => u.user.username === username);
            if (user) userId = user.user.pk;
          } catch(e) {
            console.error('Failed to get userId via search API:', e);
          }
        }

        if (!userId) {
          sendResponse({ success: false, error: 'Could not find User ID. Please refresh the page.' });
          return;
        }
        
        try {
          const followers = await fetchFollowersApi(userId, message.limit || 1000);
          const pageData = extractFollowerData();
          pageData.followers = followers;
          sendResponse({ success: true, data: pageData });
        } catch(err) {
          sendResponse({ success: false, error: err.message });
        }
      })();
      return true; // Keep channel open for async response
    }
    return true;
  });

  // Extract user ID from page
  function getUserId() {
    const scripts = document.querySelectorAll('script');
    for (let script of scripts) {
      if (script.textContent.includes('profilePage_') || script.textContent.includes('"user_id":"')) {
        const match = script.textContent.match(/"profile_id":"(\d+)"/);
        if (match) return match[1];
        const match2 = script.textContent.match(/"user_id":"(\d+)"/);
        if (match2) return match2[1];
      }
    }
    const meta = document.querySelector('meta[property="al:ios:url"]');
    if (meta && meta.content) {
      const match = meta.content.match(/user\?id=(\d+)/);
      if (match) return match[1];
    }
    return null;
  }

  function getCsrfToken() {
    const match = document.cookie.match(/csrftoken=([^;]+)/);
    return match ? match[1] : '';
  }

  async function fetchFollowersApi(userId, limit = 1000) {
    let followers = [];
    let maxId = '';
    let hasNext = true;
    const csrf = getCsrfToken();

    while (hasNext && followers.length < limit) {
      try {
        const url = `https://www.instagram.com/api/v1/friendships/${userId}/followers/?count=50&search_surface=follow_list_page${maxId ? '&max_id=' + maxId : ''}`;
        const response = await fetch(url, {
          credentials: 'include',
          headers: {
            'x-ig-app-id': '936619743392459',
            'x-csrftoken': csrf,
            'x-asbd-id': '129477',
            'x-requested-with': 'XMLHttpRequest'
          }
        });

        if (!response.ok) {
          throw new Error('Rate limit or authentication error');
        }

        const data = await response.json();
        const users = data.users || [];
        
        users.forEach(u => {
          followers.push({
            username: u.username,
            fullName: u.full_name,
            isPrivate: u.is_private,
            followedByViewer: false
          });
        });

        // Notify popup of progress
        try {
          chrome.runtime.sendMessage({ action: 'fetchProgress', count: followers.length });
        } catch(e) {}

        if (data.next_max_id) {
          maxId = data.next_max_id;
          // Random delay 1-2.5s to prevent being blocked
          await new Promise(r => setTimeout(r, 1000 + Math.random() * 1500));
        } else {
          hasNext = false;
        }
      } catch (err) {
        console.error('API Fetch error:', err);
        break; 
      }
    }
    
    // De-duplicate in case Instagram returns duplicates
    return removeDuplicates(followers);
  }

  // Extract follower data from current page
  function extractFollowerData() {
    const data = {
      username: null,
      followers: [],
      following: [],
      fullName: null,
      bio: null,
      followersCount: 0,
      followingCount: 0,
    };

    // Try to get username from page
    const usernameElement = document.querySelector('header a[href*="/"]');
    if (usernameElement) {
      const href = usernameElement.getAttribute('href');
      if (href && href !== '/' && !href.includes('explore')) {
        data.username = href.replace('/', '').replace('@', '');
      }
    }

    // Get header section data
    const headerSection = document.querySelector('header');
    if (headerSection) {
      // Full name
      const fullNameEl = headerSection.querySelector('h1');
      if (fullNameEl) {
        data.fullName = fullNameEl.textContent.trim();
      }

      // Counts
      const countElements = headerSection.querySelectorAll('span');
      countElements.forEach(el => {
        const text = el.textContent.trim();
        if (text.includes('followers')) {
          data.followersCount = parseCount(text);
        } else if (text.includes('following')) {
          data.followingCount = parseCount(text);
        }
      });
    }

    // Try to get data from page script (Instagram embeds JSON data)
    const scripts = document.querySelectorAll('script[type="application/ld+json"], script[id="__NEXT_DATA__"]');
    scripts.forEach(script => {
      try {
        const content = script.textContent;
        if (content.includes('Person') || content.includes('ProfilePage')) {
          const json = JSON.parse(content);
          // Parse Instagram's embedded data structure
          // This is simplified - actual structure varies
        }
      } catch (e) {
        // Ignore parse errors
      }
    });

    // Get followers/following from the lists if visible
    const followerElements = document.querySelectorAll('li a[href*="/followers/"], li a[href*="/following/"]');
    followerElements.forEach(el => {
      const parent = el.closest('li');
      if (parent) {
        const countText = parent.querySelector('span')?.textContent || el.textContent;
        if (countText.includes('followers')) {
          data.followersCount = parseCount(countText);
        } else if (countText.includes('following')) {
          data.followingCount = parseCount(countText);
        }
      }
    });

    // Add accumulated users
    data.followers = Array.from(accumulatedFollowers.values());
    data.following = Array.from(accumulatedFollowing.values());

    return data;
  }

  // Merge visible followers into global maps
  function mergeModalFollowers() {
    const modalFollowers = extractModalFollowers();
    modalFollowers.followers.forEach(f => accumulatedFollowers.set(f.username, f));
    modalFollowers.following.forEach(f => accumulatedFollowing.set(f.username, f));
  }

  // Extract followers from Instagram modal
  function extractModalFollowers() {
    const result = {
      followers: [],
      following: []
    };

    // Check if we're in a followers/following modal
    const modal = document.querySelector('div[role="dialog"]');
    if (!modal) {
      return result;
    }

    // Get all user links in the modal
    const userLinks = modal.querySelectorAll('a[href*="/"], div[role="link"]');
    
    userLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('/') && href.length > 1) {
        const username = href.replace('/', '').replace('@', '');
        
        // Skip if it's a nav link or not a profile
        if (['settings', 'accounts', 'about', 'explore', 'notifications', 'direct'].includes(username)) {
          return;
        }

        // Get full name if available
        let fullName = '';
        const nameEl = link.querySelector('div span');
        if (nameEl && !nameEl.textContent.includes('@')) {
          fullName = nameEl.textContent.trim();
        }

        // Check if this looks like a follower/following entry
        // Instagram shows usernames in different formats
        if (username && username.length > 0 && username.length < 40) {
          const entry = {
            username: username,
            fullName: fullName,
            isPrivate: false,
            followedByViewer: false,
          };

          // Determine if follower or following based on modal title
          const modalTitle = modal.querySelector('h1, h2, div[role="heading"]');
          if (modalTitle) {
            const title = modalTitle.textContent.toLowerCase();
            if (title.includes('followers')) {
              result.followers.push(entry);
            } else if (title.includes('following')) {
              result.following.push(entry);
            }
          }
        }
      }
    });

    // Remove duplicates
    result.followers = removeDuplicates(result.followers);
    result.following = removeDuplicates(result.following);

    return result;
  }

  // Parse Instagram count format (e.g., "1,234" or "1.2M")
  function parseCount(text) {
    const match = text.match(/([\d.,]+)\s*(k|m|b)?/i);
    if (!match) return 0;

    let num = parseFloat(match[1].replace(/,/g, ''));
    const suffix = (match[2] || '').toLowerCase();

    switch (suffix) {
      case 'k': num *= 1000; break;
      case 'm': num *= 1000000; break;
      case 'b': num *= 1000000000; break;
    }

    return Math.round(num);
  }

  // Remove duplicate entries
  function removeDuplicates(array) {
    const seen = new Set();
    return array.filter(item => {
      if (seen.has(item.username)) {
        return false;
      }
      seen.add(item.username);
      return true;
    });
  }

  // Injected UI state
  let isFetching = false;
  let shouldStopFetching = false;
  let fetchedFollowersList = [];

  // Add floating export button when on a profile page
  function addExportButton() {
    if (document.getElementById('scravio-export-btn')) return;
    if (!window.location.pathname.match(/^\/[a-zA-Z0-9._]+\/?$/)) return;

    const button = document.createElement('div');
    button.id = 'scravio-export-btn';
    button.innerHTML = `
      <div style="
        position: fixed; bottom: 20px; right: 20px;
        background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
        color: white; padding: 12px 20px; border-radius: 24px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 14px; font-weight: 600; cursor: pointer;
        box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4); z-index: 9999;
        display: flex; align-items: center; gap: 8px; transition: transform 0.2s;
      " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        Export with Scravio
      </div>
    `;
    button.addEventListener('click', showOverlay);
    document.body.appendChild(button);
  }

  function showOverlay() {
    if (document.getElementById('scravio-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'scravio-overlay';
    overlay.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(4px); font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
        <div style="background: white; border-radius: 16px; width: 400px; max-width: 90%; max-height: 80vh; display: flex; flex-direction: column; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); overflow: hidden;">
          <div style="padding: 20px; border-bottom: 1px solid #f3f4f6; display: flex; justify-content: space-between; align-items: center;">
            <h2 style="margin: 0; font-size: 18px; color: #111827;">Scravio Exporter</h2>
            <button id="scravio-close" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #6b7280;">&times;</button>
          </div>
          <div style="padding: 20px; flex: 1; overflow-y: auto; background: #f9fafb;">
            <div id="scravio-status" style="font-size: 14px; color: #4b5563; margin-bottom: 12px; font-weight: 500;">Ready to fetch.</div>
            <ul id="scravio-list" style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px;"></ul>
          </div>
          <div style="padding: 20px; border-top: 1px solid #f3f4f6; display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; gap: 10px;">
              <button id="scravio-start" style="flex: 1; padding: 10px; background: #0ea5e9; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Start Fetching</button>
              <button id="scravio-stop" style="flex: 1; padding: 10px; background: #ef4444; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; display: none;">Stop</button>
            </div>
            <button id="scravio-csv" style="padding: 10px; background: #10b981; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;" disabled>Download CSV</button>
            <button id="scravio-send" style="padding: 10px; background: #8b5cf6; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;" disabled>Send to Scravio Dashboard</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('scravio-close').addEventListener('click', () => {
      shouldStopFetching = true;
      overlay.remove();
    });

    document.getElementById('scravio-start').addEventListener('click', startFetching);
    document.getElementById('scravio-stop').addEventListener('click', () => {
      shouldStopFetching = true;
      document.getElementById('scravio-status').innerText = 'Stopped fetching.';
      updateButtons(false);
    });
    document.getElementById('scravio-csv').addEventListener('click', exportCSV);
    document.getElementById('scravio-send').addEventListener('click', sendToDashboard);
  }

  function updateButtons(fetching) {
    document.getElementById('scravio-start').style.display = fetching ? 'none' : 'block';
    document.getElementById('scravio-stop').style.display = fetching ? 'block' : 'none';
    document.getElementById('scravio-csv').disabled = fetching || fetchedFollowersList.length === 0;
    document.getElementById('scravio-send').disabled = fetching || fetchedFollowersList.length === 0;
  }

  function appendToList(users) {
    const list = document.getElementById('scravio-list');
    users.forEach(u => {
      const li = document.createElement('li');
      li.style.cssText = 'background: white; padding: 10px; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); font-size: 13px; display: flex; align-items: center; gap: 10px;';
      li.innerHTML = `<strong>${u.username}</strong> <span style="color: #6b7280; font-size: 12px;">${u.fullName || ''}</span>`;
      list.appendChild(li);
    });
    // Auto-scroll to bottom
    list.parentElement.scrollTop = list.parentElement.scrollHeight;
  }

  async function startFetching() {
    isFetching = true;
    shouldStopFetching = false;
    fetchedFollowersList = [];
    document.getElementById('scravio-list').innerHTML = '';
    updateButtons(true);
    
    try {
      let userId = getUserId();
      const username = window.location.pathname.replace(/\//g, '');
      if (!userId && username) {
        document.getElementById('scravio-status').innerText = 'Resolving username...';
        const res = await fetch(`https://www.instagram.com/web/search/topsearch/?context=blended&query=${username}`);
        const data = await res.json();
        const user = data.users.find(u => u.user.username === username);
        if (user) userId = user.user.pk;
      }

      if (!userId) {
        document.getElementById('scravio-status').innerText = 'Error: Could not find User ID. Refresh the page.';
        updateButtons(false);
        return;
      }

      let maxId = '';
      let hasNext = true;
      const csrf = getCsrfToken();

      while (hasNext && !shouldStopFetching) {
        document.getElementById('scravio-status').innerText = `Fetching followers... (${fetchedFollowersList.length})`;
        
        const url = `https://www.instagram.com/api/v1/friendships/${userId}/followers/?count=50&search_surface=follow_list_page${maxId ? '&max_id=' + maxId : ''}`;
        const response = await fetch(url, {
          credentials: 'include',
          headers: {
            'x-ig-app-id': '936619743392459',
            'x-csrftoken': csrf,
            'x-asbd-id': '129477',
            'x-requested-with': 'XMLHttpRequest'
          }
        });

        if (!response.ok) throw new Error('Rate limit or authentication error');

        const data = await response.json();
        const users = data.users || [];
        
        const newBatch = users.map(u => ({
          username: u.username,
          fullName: u.full_name,
          isPrivate: u.is_private
        }));
        
        fetchedFollowersList = fetchedFollowersList.concat(newBatch);
        appendToList(newBatch);

        if (data.next_max_id) {
          maxId = data.next_max_id;
          await new Promise(r => setTimeout(r, 1000 + Math.random() * 1500));
        } else {
          hasNext = false;
        }
      if (fetchedFollowersList.length < 100 && !hasNext) {
        document.getElementById('scravio-status').innerText = `Finished. Total: ${fetchedFollowersList.length} (Note: Instagram hides the full list for large/private accounts)`;
      } else {
        document.getElementById('scravio-status').innerText = `Finished. Total: ${fetchedFollowersList.length}`;
      }
    } catch (err) {
      document.getElementById('scravio-status').innerText = 'Error: ' + err.message;
      console.error(err);
    } finally {
      isFetching = false;
      updateButtons(false);
    }
  }

  function exportCSV() {
    if (fetchedFollowersList.length === 0) return;
    const username = window.location.pathname.replace(/\//g, '');
    const headers = ['Type', 'Username', 'Full Name', 'Profile URL', 'Export Date'];
    const rows = [headers.join(',')];
    const timestamp = new Date().toISOString();

    fetchedFollowersList.forEach(f => {
      rows.push(`"Follower","${f.username || ''}","${f.fullName || ''}","https://instagram.com/${f.username || ''}","${timestamp}"`);
    });

    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const objUrl = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = `scravio_${username}_followers_${timestamp.split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);
    }, 100);
  }

  function sendToDashboard() {
    chrome.runtime.sendMessage({ action: 'getToken' }, async (response) => {
      if (!response || !response.token) {
        alert("No Scravio token found. Please log into your Scravio dashboard on Render first!");
        return;
      }
      
      const btn = document.getElementById('scravio-send');
      const originalText = btn.innerText;
      btn.innerText = "Sending...";
      btn.disabled = true;

      try {
        const platform = "instagram";
        const username = window.location.pathname.replace(/\//g, '');
        const res = await fetch('https://scravio-pro.onrender.com/api/scrape/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${response.token}`
          },
          body: JSON.stringify({
            platform: platform,
            usernames: fetchedFollowersList.map(u => u.username),
            name: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Import - ${username}`
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.detail || 'Failed to send to dashboard');
        }

        alert("Successfully sent to Scravio dashboard! Your campaign is now queued.");
      } catch(e) {
        console.error(e);
        alert("Error sending to dashboard: " + e.message);
      } finally {
        btn.innerText = originalText;
        btn.disabled = false;
      }
    });
  }

  // Initialize
  if (document.readyState === 'complete') {
    addExportButton();
  } else {
    window.addEventListener('load', addExportButton);
  }

  // Watch for SPA navigation (Instagram uses client-side routing)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      // Reset accumulated users on page navigation
      accumulatedFollowers.clear();
      accumulatedFollowing.clear();
      setTimeout(addExportButton, 1000);
    }
  }).observe(document.body, { childList: true, subtree: true });

  // Periodically scrape the modal to accumulate users as they scroll
  setInterval(() => {
    const modal = document.querySelector('div[role="dialog"]');
    if (modal) {
      mergeModalFollowers();
    }
  }, 500);

})();