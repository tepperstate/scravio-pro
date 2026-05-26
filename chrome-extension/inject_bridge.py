
import sys
import os

manifest_path = r'C:\Users\Robocop\Downloads\Scravio-pro\chrome-extension\manifest.json'
with open(manifest_path, 'r', encoding='utf-8') as f:
    content = f.read()

import json
manifest = json.loads(content)

if 'background' in manifest and 'service_worker' in manifest['background']:
    sw = manifest['background']['service_worker']
    print(f'Service worker is {sw}')
    
    sw_path = os.path.join(r'C:\Users\Robocop\Downloads\Scravio-pro\chrome-extension', sw)
    
    with open(sw_path, 'r', encoding='utf-8') as f:
        sw_content = f.read()
        
    if 'importScripts(\'bridge.js\')' not in sw_content:
        with open(sw_path, 'w', encoding='utf-8') as f:
            f.write('importScripts(\'bridge.js\');\n' + sw_content)
        print('Injected bridge.js into service worker')
    else:
        print('bridge.js already in service worker')
