#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Fix connection type issues in DeviceDetails.tsx
const filePath = path.join(__dirname, '../src/pages/DeviceDetails.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Pattern to fix: connectionSetting without connectionType
const patterns = [
  {
    search: /setEditedDevice\({[\s\S]*?connectionSetting:\s*{[\s\S]*?\.\.\.editedDevice\.connectionSetting,[\s\S]*?tcp:\s*{/g,
    replace: (match) => {
      if (!match.includes('connectionType:')) {
        return match.replace(
          '...editedDevice.connectionSetting,',
          "...editedDevice.connectionSetting,\n                                connectionType: editedDevice.connectionSetting?.connectionType || 'tcp',"
        );
      }
      return match;
    }
  },
  {
    search: /setEditedDevice\({[\s\S]*?connectionSetting:\s*{[\s\S]*?\.\.\.editedDevice\.connectionSetting,[\s\S]*?rtu:\s*{/g,
    replace: (match) => {
      if (!match.includes('connectionType:')) {
        return match.replace(
          '...editedDevice.connectionSetting,',
          "...editedDevice.connectionSetting,\n                                connectionType: editedDevice.connectionSetting?.connectionType || 'rtu',"
        );
      }
      return match;
    }
  }
];

patterns.forEach(pattern => {
  content = content.replace(pattern.search, pattern.replace);
});

fs.writeFileSync(filePath, content);
console.log('Fixed connection type issues in DeviceDetails.tsx');