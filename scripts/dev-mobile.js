const { exec } = require('child_process');
const { spawn } = require('child_process');
const os = require('os');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  
  // Priority order: en0 (WiFi on Mac), wlan0 (WiFi on Linux), eth0 (Ethernet)
  const priorityOrder = ['en0', 'wlan0', 'eth0', 'en1'];
  
  for (const name of priorityOrder) {
    const iface = interfaces[name];
    if (iface) {
      for (const addr of iface) {
        if (addr.family === 'IPv4' && !addr.internal) {
          return addr.address;
        }
      }
    }
  }
  
  // Fallback: find any non-internal IPv4 address
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  
  return 'localhost';
}

function displayIPInfo(ip) {
  const port = process.env.PORT || 3000;
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Development Server Running');
  console.log('='.repeat(60));
  console.log(`📱 Mobile Access: http://${ip}:${port}`);
  console.log(`💻 Local Access:  http://localhost:${port}`);
  console.log('='.repeat(60));
  console.log('\n💡 Make sure your phone is on the same WiFi network!');
  console.log('💡 If IP changes, restart the server to update.\n');
}

function startServer() {
  const ip = getLocalIP();
  displayIPInfo(ip);
  
  // Start Next.js dev server
  const nextDev = spawn('npx', ['next', 'dev', '-H', '0.0.0.0'], {
    stdio: 'inherit',
    shell: true
  });
  
  // Handle server exit
  nextDev.on('close', (code) => {
    process.exit(code);
  });
  
  // Handle errors
  nextDev.on('error', (err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

startServer();

