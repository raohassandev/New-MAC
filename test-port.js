const { SerialPort, SerialPortMock } = require('serialport');
const { SerialPortStream } = require('@serialport/stream');
const { autoDetect } = require('@serialport/bindings-cpp');
const Binding = autoDetect();

// List all available serial ports
SerialPort.list().then(ports => {
    console.log('Available ports:');
    ports.forEach(port => {
        console.log(`${port.path} - ${port.manufacturer || 'Unknown'}`);
    });
}).catch(err => {
    console.error('Error listing ports:', err);
});

// Try to open the specific port
const port = new SerialPort({
    path: '/dev/tty.usbserial-A50285BI',
    baudRate: 9600,
    parity: 'none',
    stopBits: 1,
    dataBits: 8
});

port.on('open', () => {
    console.log('Port opened successfully!');
    
    // Close after 2 seconds
    setTimeout(() => {
        port.close(() => {
            console.log('Port closed.');
            process.exit(0);
        });
    }, 2000);
});

port.on('error', (err) => {
    console.error('Error opening port:', err.message);
});