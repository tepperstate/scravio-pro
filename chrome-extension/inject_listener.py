import sys
import os

sw_path = r'C:\Users\Robocop\Downloads\Scravio-pro\chrome-extension\background.js'

with open(sw_path, 'r', encoding='utf-8') as f:
    sw_content = f.read()

new_code = """
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.scravio_task) {
    const task = changes.scravio_task.newValue;
    if (task) {
      console.log('Received Scravio task via storage:', task);
      const isHashtag = task.target.startsWith('#');
      const isLocation = task.target.startsWith('location:');
      let extractType = 'followers';
      let extractValue = task.target.replace('@', '').replace('#', '');
      if (isHashtag) extractType = 'hashtag';
      else if (isLocation) extractType = 'location';
      
      chrome.storage.local.set({
        extractConfig: {
          target: extractValue,
          type: extractType,
          max: task.max || 50,
          status: 'running'
        }
      });
    }
  }
});
"""

if 'changes.scravio_task' not in sw_content:
    with open(sw_path, 'a', encoding='utf-8') as f:
        f.write('\n' + new_code)
    print('Added task listener to background.js')
else:
    print('Task listener already present in background.js')
