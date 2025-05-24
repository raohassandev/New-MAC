import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Storage as StorageIcon,
  Code as CodeIcon,
  Api as ApiIcon,
  NetworkCheck as NetworkCheckIcon,
  Settings as SettingsIcon,
  DataObject as DataObjectIcon,
  Mouse as MouseIcon,
  Keyboard as KeyboardIcon,
  Search as SearchIcon,
  ZoomIn as ZoomInIcon,
} from '@mui/icons-material';

interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
}

const HelpDialog: React.FC<HelpDialogProps> = ({ open, onClose }) => {
  const nodeTypes = [
    { type: 'controller', icon: <CodeIcon />, color: '#2196f3', description: 'API Controllers handling HTTP requests' },
    { type: 'service', icon: <SettingsIcon />, color: '#ff9800', description: 'Business logic and data processing services' },
    { type: 'model', icon: <DataObjectIcon />, color: '#4caf50', description: 'Data models and database schemas' },
    { type: 'middleware', icon: <NetworkCheckIcon />, color: '#795548', description: 'Request processing middleware' },
    { type: 'route', icon: <ApiIcon />, color: '#00bcd4', description: 'API endpoint definitions' },
    { type: 'database', icon: <StorageIcon />, color: '#3f51b5', description: 'Database and storage systems' },
  ];

  const interactions = [
    { icon: <MouseIcon />, action: 'Click & Drag', description: 'Pan around the diagram' },
    { icon: <MouseIcon />, action: 'Mouse Wheel', description: 'Zoom in and out' },
    { icon: <MouseIcon />, action: 'Click Node', description: 'View detailed information' },
    { icon: <MouseIcon />, action: 'Double-click Node', description: 'Expand/collapse details' },
    { icon: <KeyboardIcon />, action: 'Tab', description: 'Navigate between interactive elements' },
    { icon: <KeyboardIcon />, action: 'Space/Enter', description: 'Activate focused element' },
  ];

  const features = [
    { icon: <SearchIcon />, feature: 'Search', description: 'Find components by name, description, or file path' },
    { icon: <ZoomInIcon />, feature: 'Zoom Controls', description: 'Use zoom in/out buttons or fit view to see everything' },
    { feature: 'Filter Types', description: 'Toggle component types on/off using the filter chips' },
    { feature: 'Backend/Frontend', description: 'Show or hide backend and frontend components' },
    { feature: 'Export', description: 'Download the diagram as an SVG file' },
    { feature: 'Reset', description: 'Return to default view and clear all filters' },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h5" component="div">
          System Architecture Help
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Component Types</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {nodeTypes.map((type, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ 
                      p: 1, 
                      borderRadius: 1, 
                      bgcolor: type.color, 
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      {type.icon}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
                        {type.type}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {type.description}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Interactions</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List dense>
                {interactions.map((interaction, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>{interaction.icon}</ListItemIcon>
                    <ListItemText
                      primary={interaction.action}
                      secondary={interaction.description}
                    />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Features</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List dense>
                {features.map((feature, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>{feature.icon || <Box sx={{ width: 24 }} />}</ListItemIcon>
                    <ListItemText
                      primary={feature.feature}
                      secondary={feature.description}
                    />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Accessibility</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" paragraph>
                This diagram is designed to be accessible to all users:
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Keyboard Navigation"
                    secondary="Use Tab to navigate between interactive elements, Space/Enter to activate"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Screen Reader Support"
                    secondary="All components have proper ARIA labels and descriptions"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="High Contrast"
                    secondary="Colors and text maintain accessibility contrast ratios"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Focus Indicators"
                    secondary="Clear visual focus indicators for keyboard navigation"
                  />
                </ListItem>
              </List>
            </AccordionDetails>
          </Accordion>

          <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Performance Tips
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Use filters to reduce the number of visible components<br/>
              • The diagram automatically optimizes for large datasets<br/>
              • Export functionality preserves the current view state<br/>
              • Zoom and pan positions are automatically saved
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Got it
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default HelpDialog;