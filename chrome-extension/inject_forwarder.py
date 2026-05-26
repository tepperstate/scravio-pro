import sys
import os

sw_path = r'C:\Users\Robocop\Downloads\Scravio-pro\chrome-extension\background.js'

with open(sw_path, 'r', encoding='utf-8') as f:
    sw_content = f.read()

forward_code = """
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
      if (newValue && Array.isArray(newValue) && newValue.length > 0 && 
          newValue[0] && newValue[0].username) {
          
        console.log('Detected extracted data update:', key, newValue.length, 'items');
        
        fetch('https://scravio-pro.onrender.com/api/extension/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: newValue.map(item => ({
                id: item.id || '',
                username: item.username || '',
                full_name: item.full_name || '',
                is_private: item.is_private || false,
                profile_pic_url: item.profile_pic_url || '',
                is_verified: item.is_verified || false,
                public_email: item.public_email || '',
                public_phone_country_code: item.public_phone_country_code || '',
                public_phone_number: item.public_phone_number || '',
                biography: item.biography || '',
                external_url: item.external_url || '',
                follower_count: item.follower_count || 0,
                following_count: item.following_count || 0,
                category_name: item.category_name || ''
            }))
          })
        }).then(r => r.json()).then(console.log).catch(e => console.log('Backend sync error:', e));
      }
    }
  }
});
"""

if "fetch('https://scravio-pro.onrender.com/api/extension/sync'" not in sw_content:
    with open(sw_path, 'a', encoding='utf-8') as f:
        f.write('\n' + forward_code)
    print('Added data forwarder to background.js')
else:
    print('Data forwarder already present in background.js')
