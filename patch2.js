const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\Robocop\\Downloads\\IG Email Extractor';
const dstDir = 'C:\\Users\\Robocop\\Downloads\\Scravio-pro\\chrome-extension';

const jsFiles = ['popup.js', 'dashboard.js', 'content-script.js', 'background.js', 'chunk-common.js', 'chunk-vendors.js', 'injected.js', 'auth.js'];
const htmlFiles = ['popup.html', 'dashboard.html'];

for (let f of [...jsFiles, ...htmlFiles]) {
    let srcPath = path.join(srcDir, f);
    let dstPath = path.join(dstDir, f);
    if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, dstPath);
    }
}
console.log('Restored clean files');

for (let f of ['dashboard.js', 'popup.js']) {
    let p = path.join(dstDir, f);
    if (fs.existsSync(p)) {
        let code = fs.readFileSync(p, 'utf8');
        
        // Bypass limits
        code = code.replace(/configs\.trialCount\|\|30/g, '99999999||30');
        code = code.replace(/trialCount:30/g, 'trialCount:99999999');
        code = code.replace(/isShowProUpgradePop=!0/g, 'isShowProUpgradePop=!1');
        code = code.replace(/isProModalActive=!0/g, 'isProModalActive=!1');
        
        fs.writeFileSync(p, code);
        console.log('Patched', f);
    }
}

const css = '<style>.btn-pro, .pro-badge, .upgrade-banner, a[href*="checkout"], .pro-upgrade-banner { display: none !important; opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; }</style>';
for (let f of htmlFiles) {
    let p = path.join(dstDir, f);
    if (fs.existsSync(p)) {
        let code = fs.readFileSync(p, 'utf8');
        code = code.replace('</title>', '</title>' + css);
        fs.writeFileSync(p, code);
        console.log('Patched', f);
    }
}
