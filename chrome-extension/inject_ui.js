const fs = require('fs');
const contentScriptPath = 'C:\\\\Users\\\\Robocop\\\\Downloads\\\\Scravio-pro\\\\chrome-extension\\\\content-script.js';
let content = fs.readFileSync(contentScriptPath, 'utf8');

const overlayCode = `

// --- INJECTED BY SUPERSCRAVIO ---
(function() {
  if (window.superScravioInjected) return;
  window.superScravioInjected = true;

  console.log('[SuperScravio] Injecting UI overlay into Instagram DOM...');

  // Create styles
  const style = document.createElement('style');
  style.textContent = \`
    #superscravio-sidebar {
      position: fixed;
      top: 0;
      right: 0;
      width: 350px;
      height: 100vh;
      background: #ffffff;
      z-index: 999999;
      box-shadow: -5px 0 15px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      color: #333;
    }
    #superscravio-sidebar.open {
      transform: translateX(0);
    }
    #superscravio-header {
      padding: 15px 20px;
      background: #fafafa;
      border-bottom: 1px solid #efefef;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    #superscravio-header h2 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
    #superscravio-toggle {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999999;
      background: #0095f6;
      color: white;
      border: none;
      border-radius: 5px;
      padding: 8px 15px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    #superscravio-close {
      background: transparent;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #8e8e8e;
    }
    #superscravio-list {
      flex: 1;
      overflow-y: auto;
      padding: 10px;
      list-style: none;
      margin: 0;
    }
    .superscravio-item {
      display: flex;
      align-items: center;
      padding: 10px;
      border-bottom: 1px solid #efefef;
    }
    .superscravio-item img {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      margin-right: 15px;
    }
    .superscravio-item-info {
      display: flex;
      flex-direction: column;
    }
    .superscravio-item-username {
      font-weight: 600;
      font-size: 14px;
    }
    .superscravio-item-fullname {
      color: #8e8e8e;
      font-size: 12px;
    }
    #superscravio-footer {
      padding: 15px;
      border-top: 1px solid #efefef;
      text-align: center;
      background: #fafafa;
    }
    #superscravio-footer p {
      margin: 0;
      font-size: 12px;
      color: #8e8e8e;
    }
  \`;
  document.head.appendChild(style);

  // Create UI
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'superscravio-toggle';
  toggleBtn.innerText = 'Show Scravio';
  document.body.appendChild(toggleBtn);

  const sidebar = document.createElement('div');
  sidebar.id = 'superscravio-sidebar';
  
  sidebar.innerHTML = \`
    <div id="superscravio-header">
      <h2>Scravio Followers <span id="superscravio-count">(0)</span></h2>
      <button id="superscravio-close">&times;</button>
    </div>
    <ul id="superscravio-list"></ul>
    <div id="superscravio-footer">
      <p>SuperScravio Extractor Active</p>
    </div>
  \`;
  document.body.appendChild(sidebar);

  // Events
  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    toggleBtn.style.display = sidebar.classList.contains('open') ? 'none' : 'block';
  });

  document.getElementById('superscravio-close').addEventListener('click', () => {
    sidebar.classList.remove('open');
    toggleBtn.style.display = 'block';
  });

  // Listen for scraped data
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SUPERSCRAVIO_NEW_FOLLOWER') {
      addFollowerToUI(event.data.follower);
    }
  });

  let followerCount = 0;
  function addFollowerToUI(follower) {
    const list = document.getElementById('superscravio-list');
    const li = document.createElement('li');
    li.className = 'superscravio-item';
    li.innerHTML = \`
      <img src="\${follower.profile_pic_url || 'https://via.placeholder.com/40'}" onerror="this.src='https://via.placeholder.com/40'" />
      <div class="superscravio-item-info">
        <span class="superscravio-item-username">\${follower.username || 'unknown'}</span>
        <span class="superscravio-item-fullname">\${follower.full_name || ''}</span>
      </div>
    \`;
    list.appendChild(li);
    
    followerCount++;
    document.getElementById('superscravio-count').innerText = \`(\${followerCount})\`;
  }
})();
`;

if (!content.includes('SUPERSCRAVIO_NEW_FOLLOWER')) {
  fs.writeFileSync(contentScriptPath, content + '\n' + overlayCode);
  console.log('Appended UI to content-script.js');
} else {
  console.log('UI already appended');
}
