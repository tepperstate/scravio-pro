import os
import re

dir_path = r'C:\Users\Robocop\Downloads\Scravio-pro\chrome-extension'
files_to_patch = ['popup.js', 'dashboard.js', 'chunk-common.js', 'chunk-vendors.js']

for filename in files_to_patch:
    file_path = os.path.join(dir_path, filename)
    if not os.path.exists(file_path):
        continue
        
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Replace trial limits
    content = re.sub(r'trialCount\|\|\d+', 'trialCount||99999999', content)
    content = re.sub(r'trialCount:\d+', 'trialCount:99999999', content)
    
    # Always force isPro to be true
    content = re.sub(r'e\.subscription\.isPro', 'true', content)
    content = re.sub(r't\.subscription\.isPro', 'true', content)
    
    # Stop login checks
    content = re.sub(r'isLoginModalActive:!0', 'isLoginModalActive:!1', content)
    content = re.sub(r'this\.isLoginModalActive=!0', 'this.isLoginModalActive=!1', content)
    
    # Replace auth web flow - use a raw string for replacement string to avoid escaping issues
    content = content.replace('chrome.identity.launchWebAuthFlow', 'function(opts, cb) { if(cb) cb("https://server.echobot.dev/auth/success#access_token=mock_token"); }')

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print('Patched ' + filename)
