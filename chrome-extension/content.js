// Scravio IG Follower Export - Content Script
// Extracts follower data from Instagram profile pages

(function() {
  'use strict';

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getFollowerData') {
      const data = extractFollowerData();
      sendResponse({ data });
    }
    return true;
  });

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

    // If we're on the followers/following modal, extract the list
    const modalFollowers = extractModalFollowers();
    if (modalFollowers.followers.length > 0) {
      data.followers = modalFollowers.followers;
    }
    if (modalFollowers.following.length > 0) {
      data.following = modalFollowers.following;
    }

    return data;
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

  // Add floating export button when on a profile page
  function addExportButton() {
    if (document.getElementById('scravio-export-btn')) {
      return;
    }

    // Only add on profile pages
    if (!window.location.pathname.match(/^\/[a-zA-Z0-9._]+\/?$/)) {
      return;
    }

    const button = document.createElement('div');
    button.id = 'scravio-export-btn';
    button.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
        color: white;
        padding: 12px 20px;
        border-radius: 24px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: transform 0.2s;
      " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export with Scravio
      </div>
    `;
    
    button.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'openPopup' });
    });

    document.body.appendChild(button);
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
      setTimeout(addExportButton, 1000);
    }
  }).observe(document.body, { childList: true, subtree: true });

})();