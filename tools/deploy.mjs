// Build the game and publish dist/ to the gh-pages branch (GitHub Pages).
// Usage: npm run deploy
// The gh-pages branch is overwritten each time: it only ever holds the latest build.
import { execFileSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';

const git = (args, opts = {}) => execFileSync('git', args, { encoding: 'utf8', ...opts }).trim();
const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });

const remote = git(['remote', 'get-url', 'origin']);
const name = git(['config', 'user.name']);
const email = git(['config', 'user.email']);
const sha = git(['rev-parse', '--short', 'HEAD']);
const dirty = git(['status', '--porcelain']) !== '';

run('npm', ['run', 'build']);

const dist = { cwd: 'dist', stdio: 'inherit' };
writeFileSync('dist/.nojekyll', ''); // serve files as-is, no Jekyll processing
rmSync('dist/.git', { recursive: true, force: true });
git(['init', '-q', '-b', 'gh-pages'], dist);
git(['-c', `user.name=${name}`, '-c', `user.email=${email}`, 'add', '-A'], dist);
git(['-c', `user.name=${name}`, '-c', `user.email=${email}`, 'commit', '-q', '-m',
  `Deploy ${sha}${dirty ? ' (with uncommitted changes)' : ''}`], dist);
git(['push', '-f', remote, 'gh-pages'], dist);
rmSync('dist/.git', { recursive: true, force: true });

const m = remote.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
console.log(m ? `\nDeployed: https://${m[1].toLowerCase()}.github.io/${m[2]}/` : '\nDeployed to gh-pages.');
