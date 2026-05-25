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
        if (chrome.runtime.lastError) {
          document.getElementById('btnText').textContent = 'Please refresh the page and try again.';
          return;
        }

        if (response && response.success && response.data) {
          followerData = response.data;
          updateStats(response.data);
          
          const totalFound = response.data.followers.length + response.data.following.length;
          
          if (totalFound > 0) {
            document.getElementById('exportBtn').disabled = false;
            document.getElementById('btnText').textContent = `Export ${totalFound} Users`;
          } else {
            document.getElementById('exportBtn').disabled = true;
            document.getElementById('btnText').textContent = 'Open Followers List First';
          }
        } else {
          document.getElementById('btnText').textContent = 'Open Instagram Profile';
          if (response && response.error) {
            console.error('Extraction error:', response.error);
          }
        }
      });
    } else {
      document.getElementById('btnText').textContent = 'Go to an Instagram Profile';
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
    
    const totalFound = followerData.followers.length + followerData.following.length;
    showSuccess(`Exported ${totalFound} users successfully!`);
  } catch (error) {
    console.error('Export error:', error);
    showError('Failed to export. Please try again.');
  } finally {
    const totalFound = followerData.followers.length + followerData.following.length;
    btn.disabled = false;
    btnText.textContent = `Export ${totalFound} Users`;
  }
}

// Generate CSV content
function generateCSV(data) {
  const headers = ['Type', 'Username', 'Full Name', 'Profile URL', 'Profile Contact Email', 'Profile Email', 'Profile Phone', 'Export Date'];
  const rows = [headers.join(',')];

  const addRow = (user, type) => {
    const row = [
      `"${type}"`,
      `"${user.username || ''}"`,
      `"${user.fullName || ''}"`,
      `"https://instagram.com/${user.username || ''}"`,
      `""`, // Profile Contact Email (To be scraped by backend)
      `""`, // Profile Email (To be scraped by backend)
      `""`, // Profile Phone (To be scraped by backend)
      `"${new Date().toISOString()}"`
    ];
    rows.push(row.join(','));
  };

  data.followers.forEach(f => addRow(f, 'Follower'));
  data.following.forEach(f => addRow(f, 'Following'));

  return rows.join('\n');
}

// Generate XLSX content (simplified - uses CSV with xlsx extension)
// In production, use a proper xlsx library like SheetJS
function generateXLSX(data) {
  // For simplicity, we'll generate an HTML table that Excel can open
  let html = '<table>';
  html += '<tr><th>Type</th><th>Username</th><th>Full Name</th><th>Profile URL</th><th>Profile Contact Email</th><th>Profile Email</th><th>Profile Phone</th><th>Export Date</th></tr>';
  
  const addRow = (user, type) => {
    html += `<tr>
      <td>${type}</td>
      <td>${user.username || ''}</td>
      <td>${user.fullName || ''}</td>
      <td>https://instagram.com/${user.username || ''}</td>
      <td></td>
      <td></td>
      <td></td>
      <td>${new Date().toISOString()}</td>
    </tr>`;
  };
  
  data.followers.forEach(f => addRow(f, 'Follower'));
  data.following.forEach(f => addRow(f, 'Following'));
  
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
      type: 'Follower',
      username: f.username,
      fullName: f.fullName,
      profileUrl: `https://instagram.com/${f.username}`,
      profileContactEmail: "",
      profileEmail: "",
      profilePhone: "",
      exportDate: new Date().toISOString()
    })),
    following: data.following.map(f => ({
      type: 'Following',
      username: f.username,
      fullName: f.fullName,
      profileUrl: `https://instagram.com/${f.username}`,
      profileContactEmail: "",
      profileEmail: "",
      profilePhone: "",
      exportDate: new Date().toISOString()
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