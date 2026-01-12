const { exec } = require('child_process');
const os = require('os');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
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
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  
  return null;
}

let lastIP = getLocalIP();
const port = process.env.PORT || 3000;

console.log(`🔍 Monitoring IP changes...`);
console.log(`📱 Current IP: ${lastIP ? `http://${lastIP}:${port}` : 'Not found'}\n`);

setInterval(() => {
  const currentIP = getLocalIP();
  
  if (currentIP && currentIP !== lastIP) {
    console.log('\n' + '⚠️'.repeat(20));
    console.log('🔄 IP ADDRESS CHANGED!');
    console.log(`📱 Old IP: ${lastIP ? `http://${lastIP}:${port}` : 'Unknown'}`);
    console.log(`📱 New IP: http://${currentIP}:${port}`);
    console.log('⚠️'.repeat(20));
    console.log('💡 Please restart your dev server to use the new IP.\n');
    lastIP = currentIP;
  }
}, 5000); // Check every 5 seconds

