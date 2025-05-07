// Script to find and stop any processes using the serial port
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Port to check
const PORT = 'tty.usbserial-A50285BI';

async function findPortProcesses() {
    try {
        console.log(`🔍 Checking for processes using ${PORT}...`);
        const { stdout } = await execAsync(`lsof | grep ${PORT}`);
        
        // Parse the output
        if (stdout.trim() === '') {
            console.log(`✅ No processes found using ${PORT}`);
            return [];
        }
        
        const lines = stdout.trim().split('\n');
        const processes = [];
        
        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 2) {
                const process = {
                    name: parts[0],
                    pid: parts[1],
                    user: parts[2],
                    fd: parts[3],
                    type: parts[4],
                    device: parts[5],
                    size: parts[6],
                    node: parts[7],
                    fullPath: parts.slice(8).join(' ')
                };
                processes.push(process);
            }
        }
        
        console.log(`🔍 Found ${processes.length} processes using ${PORT}:`);
        processes.forEach(proc => {
            console.log(`   • ${proc.name} (PID: ${proc.pid}, User: ${proc.user})`);
        });
        
        return processes;
    } catch (error) {
        if (error.stderr && error.stderr.includes('lsof: no process')) {
            console.log(`✅ No processes found using ${PORT}`);
            return [];
        }
        console.error(`❌ Error finding processes: ${error.message}`);
        return [];
    }
}

async function stopProcesses(processes) {
    if (processes.length === 0) {
        console.log(`✅ No processes to stop.`);
        return;
    }
    
    console.log(`\n⚠️ Would you like to stop these processes? (y/n)`);
    console.log(`   This will only print the commands you should run.`);
    console.log(`   To stop the processes, execute the following commands manually:`);
    
    processes.forEach(proc => {
        console.log(`   kill ${proc.pid}   # Stops ${proc.name}`);
    });
    
    // For automatic stopping (disabled by default for safety)
    // console.log(`\n🛑 Stopping processes...`);
    // for (const proc of processes) {
    //     try {
    //         console.log(`   Stopping ${proc.name} (PID: ${proc.pid})...`);
    //         await execAsync(`kill ${proc.pid}`);
    //         console.log(`   ✅ Process stopped.`);
    //     } catch (error) {
    //         console.error(`   ❌ Error stopping process: ${error.message}`);
    //     }
    // }
}

async function checkPortAvailability() {
    try {
        console.log(`\n🔍 Checking if port /dev/${PORT} is available...`);
        // Use ls to check if the port exists
        const { stdout: portListing } = await execAsync(`ls -l /dev/${PORT}`);
        console.log(`✅ Port exists: ${portListing.trim()}`);
        
        // Check permissions
        const { stdout: permissions } = await execAsync(`stat -f "%Sp %Su:%Sg" /dev/${PORT}`);
        console.log(`📋 Port permissions: ${permissions.trim()}`);
        
        return true;
    } catch (error) {
        console.error(`❌ Error checking port: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log(`\n=== Serial Port Process Manager ===`);
    
    // 1. Check port availability
    await checkPortAvailability();
    
    // 2. Find processes using the port
    const processes = await findPortProcesses();
    
    // 3. Stop processes if found
    await stopProcesses(processes);
    
    if (processes.length > 0) {
        console.log(`\n📋 After stopping the processes, run your tests again.`);
    } else {
        console.log(`\n✅ The port appears to be available for use.`);
    }
}

// Run the main function
main().catch(err => {
    console.error(`🔥 Unexpected error: ${err.message}`);
});