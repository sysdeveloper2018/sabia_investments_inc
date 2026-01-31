import { spawn } from 'child_process';

const runProcess = (command, args, name) => {
  const child = spawn(command, args, { stdio: 'inherit', shell: true });

  child.on('error', (error) => {
    console.error(`[${name}] Failed to start: ${error.message}`);
  });

  child.on('close', (code) => {
    if (code !== 0) {
      console.log(`[${name}] exited with code ${code}`);
    }
  });

  return child;
};

console.log('Starting Sabia Investment Properties System...');
console.log('---------------------------------------------');

// Start Backend
console.log('Launching API Server on Port 3009...');
const server = runProcess('npm', ['run', 'server'], 'Backend');

// Start Frontend
setTimeout(() => {
    console.log('Launching Frontend on Port 3000...');
    const client = runProcess('npm', ['run', 'dev'], 'Frontend');
    
    // Handle cleanup
    const cleanup = () => {
        console.log('\nShutting down services...');
        server.kill();
        client.kill();
        process.exit();
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
}, 1000);