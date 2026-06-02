// Provision and launch the traffic-light overlay. Run once via /claude-traffic-light:setup.
// Copies the overlay AND its sibling lib/ to a stable location (so the ../lib require keeps
// resolving), installs Electron there, then launches it. Idempotent: safe to re-run.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawn } = require('node:child_process');
const { appRoot, appOverlayDir } = require('./lib/overlay');

function copyDirNoModules(src, dest) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, {
    recursive: true,
    filter: (s) => !s.split(path.sep).includes('node_modules'),
  });
}

function main() {
  const pluginDir = __dirname;
  const appDir = path.join(appRoot(), 'app');
  const destOverlay = appOverlayDir();
  const destLib = path.join(appDir, 'lib');

  console.log('[traffic-light] Installing overlay to', appDir);
  fs.mkdirSync(appDir, { recursive: true });
  copyDirNoModules(path.join(pluginDir, 'overlay'), destOverlay);
  copyDirNoModules(path.join(pluginDir, 'lib'), destLib);

  console.log('[traffic-light] Installing Electron (this can take a few minutes)...');
  // shell:true is required on Windows to run npm.cmd (Node 24 rejects .cmd via execFile otherwise).
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  execFileSync(npm, ['install'], { cwd: destOverlay, stdio: 'inherit', shell: true });

  console.log('[traffic-light] Launching overlay...');
  const electron = require(path.join(destOverlay, 'node_modules', 'electron'));
  const child = spawn(electron, [destOverlay], { detached: true, stdio: 'ignore', windowsHide: true });
  child.unref();

  console.log('[traffic-light] Done. The light is up and will auto-start whenever you launch Claude Code.');
}

main();
