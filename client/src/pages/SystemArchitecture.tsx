import React, { useState } from 'react';
import { Box, Tabs, Tab, Typography, Paper } from '@mui/material';
import SystemArchitectureDiagram from '../components/architecture/SystemArchitectureDiagram';
import UpgradePlanner from '../components/architecture/UpgradePlanner';
import 'reactflow/dist/style.css';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`architecture-tabpanel-${index}`}
      aria-labelledby={`architecture-tab-${index}`}
      {...other}
      style={{ height: 'calc(100vh - 130px)' }}
    >
      {value === index && (
        <Box sx={{ p: 3, height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `architecture-tab-${index}`,
    'aria-controls': `architecture-tabpanel-${index}`,
  };
}

const SystemArchitecture: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Paper sx={{ mb: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            aria-label="architecture tabs"
            sx={{ pl: 2 }}
          >
            <Tab label="System Architecture" {...a11yProps(0)} />
            <Tab label="Upgrade Planner" {...a11yProps(1)} />
          </Tabs>
        </Box>
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {tabValue === 0 
              ? "Interactive visualization of the complete system architecture showing components, relationships, and data flow."
              : "Plan and manage system upgrades with detailed component parameter visualization and impact analysis."}
          </Typography>
        </Box>
      </Paper>

      <TabPanel value={tabValue} index={0}>
        <SystemArchitectureDiagram />
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <UpgradePlanner />
      </TabPanel>
    </Box>
  );
};

export default SystemArchitecture;