const fs = require('fs');
const injectedPath = 'C:\\\\Users\\\\Robocop\\\\Downloads\\\\Scravio-pro\\\\chrome-extension\\\\injected.js';
let content = fs.readFileSync(injectedPath, 'utf8');

const hookCode = `
// --- INJECTED BY SUPERSCRAVIO ---
(function() {
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
    
    // Check if it's a GraphQL query or a direct API call that returns users
    if (url.includes('graphql/query') || url.includes('/api/v1/friendships/')) {
      try {
        const clonedResponse = response.clone();
        clonedResponse.json().then(data => {
          // Attempt to extract users from common Instagram response structures
          let users = [];
          
          if (data.data && data.data.user && data.data.user.edge_followed_by) {
            // GraphQL edge_followed_by
            users = data.data.user.edge_followed_by.edges.map(e => e.node);
          } else if (data.users) {
            // REST API users array
            users = data.users;
          }
          
          if (users && users.length > 0) {
            users.forEach(user => {
              window.postMessage({
                type: 'SUPERSCRAVIO_NEW_FOLLOWER',
                follower: user
              }, '*');
            });
          }
        }).catch(err => {
          // Ignore json parse errors for non-json responses
        });
      } catch (e) {
        console.error('[SuperScravio] Fetch interception error:', e);
      }
    }
    return response;
  };
})();
`;

if (!content.includes('SUPERSCRAVIO_NEW_FOLLOWER')) {
  fs.writeFileSync(injectedPath, hookCode + '\n' + content);
  console.log('Appended fetch hook to injected.js');
} else {
  console.log('Hook already appended');
}
