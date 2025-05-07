// List available serial ports
const { SerialPort } = require('serialport');

console.log('Checking available serial ports...');
SerialPort.list().then(ports => {
  console.log(JSON.stringify(ports, null, 2));
  
  // Find ports that might be our target
  const usbSerialPorts = ports.filter(port => 
    port.path.includes('usbserial') || 
    port.path.includes('tty.usb') ||
    port.path.includes('ttyUSB') ||
    port.path.includes('COM')
  );
  
  if (usbSerialPorts.length > 0) {
    console.log('\nPotential Modbus serial ports found:');
    usbSerialPorts.forEach(port => {
      console.log(`- ${port.path} (${port.manufacturer || 'unknown manufacturer'})`);
    });
  } else {
    console.log('\nNo USB serial ports found. Is the device connected?');
  }
}).catch(err => {
  console.error('Error listing serial ports:', err);
});