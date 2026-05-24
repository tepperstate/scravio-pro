// Scravio IG Follower Export - Popup Script

let selectedFormat = 'csv';
let followerData = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Format buttons
  document.querySelectorAll('.format-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedFormat = btn.dataset.format;
    });
  });

  // Export button
  document.getElementById('exportBtn').addEventListener('click', exportData);

  // Check for existing data
  checkExistingData();
});

// Check for data from content script
function checkExistingData() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab && tab.url && tab.url.includes('instagram.com')) {
      document.getElementById('btnText').textContent = 'Loading profile data...';
      
      // Request data from content script
      chrome.tabs.sendMessage(tab.id, { action: 'getFollowerData' }, (response) => {
        if (response && response.data) {
          followerData = response.data;
          updateStats(response.data);
          document.getElementById('exportBtn').disabled = false;
          document.getElementById('btnText').textContent = `Export ${response.data.followers.length} Followers`;
        } else {
          document.getElementById('btnText').textContent = 'Open Instagram Profile';
        }
      });
    } else {
      document.getElementById('btnText').textContent = 'Open Instagram Profile';
    }
  });
}

// Update stats display
function updateStats(data) {
  document.getElementById('followerCount').textContent = data.followers.length.toLocaleString();
  document.getElementById('followingCount').textContent = data.following.length.toLocaleString();
}

// Export data based on selected format
function exportData() {
  if (!followerData) {
    showError('No data available. Please visit an Instagram profile.');
    return;
  }

  const btn = document.getElementById('exportBtn');
  const btnText = document.getElementById('btnText');
  
  btn.disabled = true;
  btnText.innerHTML = '<span class="loading"></span> Exporting...';
  hideMessages();

  try {
    let content, filename, mimeType;
    const profileName = followerData.username || 'instagram';
    const timestamp = new Date().toISOString().split('T')[0];

    switch (selectedFormat) {
      case 'csv':
        content = generateCSV(followerData);
        filename = `scravio_${profileName}_followers_${timestamp}.csv`;
        mimeType = 'text/csv';
        break;
      case 'xlsx':
        content = generateXLSX(followerData);
        filename = `scravio_${profileName}_followers_${timestamp}.xlsx`;
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case 'json':
        content = generateJSON(followerData);
        filename = `scravio_${profileName}_followers_${timestamp}.json`;
        mimeType = 'application/json';
        break;
    }

    // Download file
    downloadFile(content, filename, mimeType);
    showSuccess(`Exported ${followerData.followers.length} followers successfully!`);
  } catch (error) {
    console.error('Export error:', error);
    showError('Failed to export. Please try again.');
  } finally {
    btn.disabled = false;
    btnText.textContent = `Export ${followerData.followers.length} Followers`;
  }
}

// Generate CSV content
function generateCSV(data) {
  const headers = ['Username', 'Full Name', 'Profile URL', 'Is Private', 'Followed By Viewer', 'Export Date'];
  const rows = [headers.join(',')];

  data.followers.forEach(follower => {
    const row = [
      `"${follower.username || ''}"`,
      `"${follower.fullName || ''}"`,
      `"https://instagram.com/${follower.username || ''}"`,
      follower.isPrivate ? 'Yes' : 'No',
      follower.followedByViewer ? 'Yes' : 'No',
      new Date().toISOString()
    ];
    rows.push(row.join(','));
  });

  return rows.join('\n');
}

// Generate XLSX content (simplified - uses CSV with xlsx extension)
// In production, use a proper xlsx library like SheetJS
function generateXLSX(data) {
  // For simplicity, we'll generate an HTML table that Excel can open
  let html = '<table>';
  html += '<tr><th>Username</th><th>Full Name</th><th>Profile URL</th><th>Is Private</th></tr>';
  
  data.followers.forEach(follower => {
    html += `<tr>
      <td>${follower.username || ''}</td>
      <td>${follower.fullName || ''}</td>
      <td>https://instagram.com/${follower.username || ''}</td>
      <td>${follower.isPrivate ? 'Yes' : 'No'}</td>
    </tr>`;
  });
  
  html += '</table>';
  return html;
}

// Generate JSON content
function generateJSON(data) {
  return JSON.stringify({
    exportDate: new Date().toISOString(),
    profileUsername: data.username,
    totalFollowers: data.followers.length,
    totalFollowing: data.following.length,
    followers: data.followers.map(f => ({
      username: f.username,
      fullName: f.fullName,
      profileUrl: `https://instagram.com/${f.username}`,
      isPrivate: f.isPrivate,
    })),
    following: data.following.map(f => ({
      username: f.username,
      fullName: f.fullName,
      profileUrl: `https://instagram.com/${f.username}`,
      isPrivate: f.isPrivate,
    }))
  }, null, 2);
}

// Download file helper
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

// Show/hide messages
function showSuccess(message) {
  const el = document.getElementById('successMsg');
  el.textContent = `✓ ${message}`;
  el.style.display = 'block';
  document.getElementById('errorMsg').style.display = 'none';
}

function showError(message) {
  const el = document.getElementById('errorMsg');
  el.textContent = message;
  el.style.display = 'block';
  document.getElementById('successMsg').style.display = 'none';
}

function hideMessages() {
  document.getElementById('successMsg').style.display = 'none';
  document.getElementById('errorMsg').style.display = 'none';
}