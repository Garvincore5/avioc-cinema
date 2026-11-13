const { spawn } = require('child_process');
const path = require('path');

const gitPath = 'C:\\Users\\user\\AppData\\Local\\Programs\\MinGit\\cmd\\git.exe';
const p = spawn(gitPath, process.argv.slice(2), {
  cwd: path.join(__dirname, '..'),
  env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
});

p.stdout.on('data', d => process.stdout.write(d));
p.stderr.on('data', d => process.stderr.write(d));
p.on('close', code => {
  console.log('Exit code:', code);
  process.exit(code);
});
