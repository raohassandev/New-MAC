const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

console.log('Setting up MacSys project...');

// Check if client directory exists, if not create it
if (!fs.existsSync('./client')) {
  console.log('Creating client directory...');
  fs.mkdirSync('./client');
  
  // Move existing frontend files to client directory
  console.log('Moving frontend files to client directory...');
  
  // List of directories to move
  const dirsToMove = ['src', 'public'];
  
  dirsToMove.forEach(dir => {
    if (fs.existsSync(`./${dir}`)) {
      fs.renameSync(`./${dir}`, `./client/${dir}`);
    }
  });
  
  // Move package.json and other frontend config files
  const filesToMove = ['package.json', 'package-lock.json', 'tsconfig.json'];
  
  filesToMove.forEach(file => {
    if (fs.existsSync(`./${file}`)) {
      // Read the file first
      const fileContent = fs.readFileSync(`./${file}`, 'utf8');
      // Write it to the new location
      fs.writeFileSync(`./client/${file}`, fileContent);
      // We don't delete the root package.json as we'll modify it
      if (file !== 'package.json') {
        fs.unlinkSync(`./${file}`);
      }
    }
  });
}

// Install dependencies
console.log('Installing dependencies...');
execSync('npm install', { stdio: 'inherit' });

console.log('Setting up client dependencies...');
process.chdir('./client');
execSync('npm install', { stdio: 'inherit' });
process.chdir('..');

console.log('Setup complete! You can now run the project with "npm start"');