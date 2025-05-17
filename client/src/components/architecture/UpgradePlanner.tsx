import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';

// Interface definitions for data structures
interface IParameter {
  name: string;
  dataType: string;
  scalingFactor?: number;
  decimalPoint?: number;
  byteOrder?: string;
  registerIndex: number;
  unit?: string;
  description?: string;
}

interface IRange {
  startAddress: number;
  count: number;
  fc: number;
}

interface IDataPoint {
  range: IRange;
  parser: {
    parameters: IParameter[];
  };
}

interface ITcpSettings {
  ip: string;
  port: number;
  slaveId: number;
}

interface IRtuSettings {
  serialPort: string;
  baudRate: number;
  dataBits: number;
  stopBits: number;
  parity: string;
  slaveId: number;
}

interface IConnectionSettings {
  connectionType: 'tcp' | 'rtu';
  tcp?: ITcpSettings;
  rtu?: IRtuSettings;
}

interface IDevice {
  _id: string;
  name: string;
  make?: string;
  model?: string;
  description?: string;
  enabled: boolean;
  connectionSetting?: IConnectionSettings;
  dataPoints?: IDataPoint[];
  deviceDriverId?: string;
  pollingInterval?: number;
  lastSeen?: string;
  createdAt: string;
  updatedAt: string;
}

// Interface for upgrade planning
interface UpgradeItem {
  id: string;
  entityType: 'device' | 'dataPoint' | 'parameter' | 'connection';
  entityId: string;
  name: string;
  description: string;
  currentValue?: any;
  newValue?: any;
  status: 'planned' | 'in_progress' | 'completed' | 'blocked';
  priority: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  dependencies?: string[];
  notes?: string;
}

// Mock data
const mockDevices: IDevice[] = [
  {
    _id: 'dev1',
    name: 'Temperature Sensor',
    make: 'Acme Inc',
    model: 'TS-2000',
    description: 'Main temperature sensor for boiler system',
    enabled: true,
    connectionSetting: {
      connectionType: 'tcp',
      tcp: {
        ip: '192.168.1.100',
        port: 502,
        slaveId: 1,
      },
    },
    dataPoints: [
      {
        range: {
          startAddress: 1000,
          count: 5,
          fc: 3,
        },
        parser: {
          parameters: [
            {
              name: 'temperature',
              dataType: 'FLOAT32',
              scalingFactor: 0.1,
              decimalPoint: 1,
              byteOrder: 'ABCD',
              registerIndex: 1000,
              unit: '°C',
              description: 'Current temperature reading',
            },
            {
              name: 'humidity',
              dataType: 'UINT16',
              scalingFactor: 0.1,
              decimalPoint: 1,
              byteOrder: 'AB',
              registerIndex: 1002,
              unit: '%',
              description: 'Current humidity reading',
            },
            {
              name: 'status',
              dataType: 'UINT16',
              byteOrder: 'AB',
              registerIndex: 1003,
              description: 'Device status flags',
            },
          ],
        },
      },
    ],
    pollingInterval: 30000,
    lastSeen: '2025-05-05T21:00:00.000Z',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-05-05T21:00:00.000Z',
  },
  {
    _id: 'dev2',
    name: 'Pressure Sensor',
    make: 'Acme Inc',
    model: 'PS-1000',
    description: 'Main pressure sensor for hydraulic system',
    enabled: true,
    connectionSetting: {
      connectionType: 'tcp',
      tcp: {
        ip: '192.168.1.101',
        port: 502,
        slaveId: 1,
      },
    },
    dataPoints: [
      {
        range: {
          startAddress: 2000,
          count: 3,
          fc: 3,
        },
        parser: {
          parameters: [
            {
              name: 'pressure',
              dataType: 'FLOAT32',
              scalingFactor: 0.01,
              decimalPoint: 2,
              byteOrder: 'ABCD',
              registerIndex: 2000,
              unit: 'bar',
              description: 'Current pressure reading',
            },
            {
              name: 'status',
              dataType: 'UINT16',
              byteOrder: 'AB',
              registerIndex: 2002,
              description: 'Device status flags',
            },
          ],
        },
      },
    ],
    pollingInterval: 15000,
    lastSeen: '2025-05-05T21:00:00.000Z',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-05-05T21:00:00.000Z',
  },
];

// Mock upgrade plan
const mockUpgradePlan: UpgradeItem[] = [
  {
    id: 'upgrade1',
    entityType: 'device',
    entityId: 'dev1',
    name: 'Update Temperature Sensor IP',
    description: 'Migrate Temperature Sensor to new network segment',
    currentValue: '192.168.1.100',
    newValue: '10.0.0.100',
    status: 'planned',
    priority: 'high',
    impact: 'medium',
    notes: 'Need to update firewall rules before migration',
  },
  {
    id: 'upgrade2',
    entityType: 'parameter',
    entityId: 'dev1_temperature',
    name: 'Add scaling equation for temperature',
    description: 'Implement more accurate scaling with non-linear equation',
    currentValue: 'Linear scaling with factor 0.1',
    newValue: 'x * 0.1 + (x * x * 0.001)',
    status: 'in_progress',
    priority: 'medium',
    impact: 'low',
    notes: 'Testing new equation against calibration data',
  },
  {
    id: 'upgrade3',
    entityType: 'device',
    entityId: 'dev2',
    name: 'Reduce Pressure Sensor polling interval',
    description: 'Reduce polling interval for more frequent updates',
    currentValue: 15000,
    newValue: 5000,
    status: 'completed',
    priority: 'low',
    impact: 'low',
    notes: 'Verified that the device can handle faster polling',
  },
];

// Component for viewing parameter structure details
const ParameterStructureViewer: React.FC<{ device: IDevice }> = ({ device }) => {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Index</TableCell>
            <TableCell>Scaling</TableCell>
            <TableCell>Byte Order</TableCell>
            <TableCell>Unit</TableCell>
            <TableCell>Description</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {device.dataPoints?.flatMap(dp =>
            dp.parser.parameters.map((param, idx) => (
              <TableRow key={`${device._id}_${dp.range.startAddress}_${idx}`}>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {param.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={param.dataType}
                    size="small"
                    color={
                      param.dataType.includes('FLOAT')
                        ? 'info'
                        : param.dataType.includes('INT')
                          ? 'primary'
                          : 'default'
                    }
                  />
                </TableCell>
                <TableCell>{param.registerIndex}</TableCell>
                <TableCell>
                  {param.scalingFactor ? (
                    <>
                      <Typography variant="caption" component="span">
                        × {param.scalingFactor}
                      </Typography>
                      {param.decimalPoint !== undefined && (
                        <Typography variant="caption" component="span" sx={{ ml: 1 }}>
                          ({param.decimalPoint} decimals)
                        </Typography>
                      )}
                    </>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>{param.byteOrder || '-'}</TableCell>
                <TableCell>{param.unit || '-'}</TableCell>
                <TableCell>{param.description || '-'}</TableCell>
              </TableRow>
            ))
          ) || (
            <TableRow>
              <TableCell colSpan={7}>
                <Typography align="center">No parameters defined</Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// Component for viewing connection settings
const ConnectionSettingsViewer: React.FC<{ device: IDevice }> = ({ device }) => {
  if (!device.connectionSetting) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography>No connection settings defined</Typography>
      </Paper>
    );
  }

  const { connectionType, tcp, rtu } = device.connectionSetting;

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        Connection Type:{' '}
        <Chip
          label={connectionType.toUpperCase()}
          color={connectionType === 'tcp' ? 'primary' : 'secondary'}
          size="small"
        />
      </Typography>

      {connectionType === 'tcp' && tcp && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2">TCP Settings</Typography>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell component="th" scope="row">
                  IP Address
                </TableCell>
                <TableCell>{tcp.ip}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">
                  Port
                </TableCell>
                <TableCell>{tcp.port}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">
                  Slave ID
                </TableCell>
                <TableCell>{tcp.slaveId}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Box>
      )}

      {connectionType === 'rtu' && rtu && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2">RTU Settings</Typography>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell component="th" scope="row">
                  Serial Port
                </TableCell>
                <TableCell>{rtu.serialPort}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">
                  Baud Rate
                </TableCell>
                <TableCell>{rtu.baudRate}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">
                  Data Bits
                </TableCell>
                <TableCell>{rtu.dataBits}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">
                  Stop Bits
                </TableCell>
                <TableCell>{rtu.stopBits}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">
                  Parity
                </TableCell>
                <TableCell>{rtu.parity}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">
                  Slave ID
                </TableCell>
                <TableCell>{rtu.slaveId}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Box>
      )}

      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2">Polling Configuration</Typography>
        <Table size="small">
          <TableBody>
            <TableRow>
              <TableCell component="th" scope="row">
                Polling Interval
              </TableCell>
              <TableCell>{device.pollingInterval || 30000} ms</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row">
                Last Seen
              </TableCell>
              <TableCell>
                {device.lastSeen ? new Date(device.lastSeen).toLocaleString() : 'Never'}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Box>
    </Paper>
  );
};

// Component for viewing device details
const DeviceDetailsViewer: React.FC<{ device: IDevice }> = ({ device }) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography variant="h6" fontWeight="bold">
          {device.name}{' '}
          <Chip
            label={device.enabled ? 'Enabled' : 'Disabled'}
            color={device.enabled ? 'success' : 'error'}
            size="small"
            sx={{ ml: 1 }}
          />
        </Typography>
        <Box>
          <Tooltip title="Edit Device">
            <IconButton size="small">
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {device.description || 'No description provided'}
        </Typography>
        {(device.make || device.model) && (
          <Typography variant="body2" color="text.secondary">
            {device.make && `Make: ${device.make}`} {device.model && `Model: ${device.model}`}
          </Typography>
        )}
      </Box>

      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1" fontWeight="medium">
            Connection Settings
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <ConnectionSettingsViewer device={device} />
        </AccordionDetails>
      </Accordion>

      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1" fontWeight="medium">
            Parameters
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <ParameterStructureViewer device={device} />
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1" fontWeight="medium">
            Data Points
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Function Code</TableCell>
                  <TableCell>Start Address</TableCell>
                  <TableCell>Count</TableCell>
                  <TableCell>Parameters</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {device.dataPoints?.map((dp, idx) => (
                  <TableRow key={`${device._id}_dp_${idx}`}>
                    <TableCell>
                      <Chip
                        label={`FC${dp.range.fc}`}
                        size="small"
                        color={
                          dp.range.fc === 3
                            ? 'primary'
                            : dp.range.fc === 4
                              ? 'secondary'
                              : 'default'
                        }
                      />
                    </TableCell>
                    <TableCell>{dp.range.startAddress}</TableCell>
                    <TableCell>{dp.range.count}</TableCell>
                    <TableCell>{dp.parser.parameters.length}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

// Dialog for creating/editing upgrade items
const UpgradeItemDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  upgradeItem?: UpgradeItem;
  onSave: (item: UpgradeItem) => void;
  devices: IDevice[];
}> = ({ open, onClose, upgradeItem, onSave, devices }) => {
  const isEdit = !!upgradeItem;
  const [item, setItem] = useState<Partial<UpgradeItem>>(
    upgradeItem || {
      id: `upgrade${Date.now()}`,
      entityType: 'device',
      status: 'planned',
      priority: 'medium',
      impact: 'medium',
    }
  );

  const handleChange = (field: keyof UpgradeItem, value: any) => {
    setItem(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // Validate required fields
    if (!item.name || !item.description || !item.entityId) {
      alert('Please fill in all required fields');
      return;
    }

    onSave(item as UpgradeItem);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Upgrade Item' : 'New Upgrade Item'}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 1 }}>
          <TextField
            label="Name"
            required
            fullWidth
            value={item.name || ''}
            onChange={e => handleChange('name', e.target.value)}
          />

          <TextField
            label="Description"
            required
            fullWidth
            multiline
            rows={2}
            value={item.description || ''}
            onChange={e => handleChange('description', e.target.value)}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth required>
              <InputLabel>Entity Type</InputLabel>
              <Select
                value={item.entityType || 'device'}
                label="Entity Type"
                onChange={e => handleChange('entityType', e.target.value)}
              >
                <MenuItem value="device">Device</MenuItem>
                <MenuItem value="dataPoint">Data Point</MenuItem>
                <MenuItem value="parameter">Parameter</MenuItem>
                <MenuItem value="connection">Connection</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Entity</InputLabel>
              <Select
                value={item.entityId || ''}
                label="Entity"
                onChange={e => handleChange('entityId', e.target.value)}
              >
                {devices.map(device => (
                  <MenuItem key={device._id} value={device._id}>
                    {device.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Current Value"
              fullWidth
              value={item.currentValue || ''}
              onChange={e => handleChange('currentValue', e.target.value)}
            />

            <TextField
              label="New Value"
              fullWidth
              value={item.newValue || ''}
              onChange={e => handleChange('newValue', e.target.value)}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth required>
              <InputLabel>Status</InputLabel>
              <Select
                value={item.status || 'planned'}
                label="Status"
                onChange={e => handleChange('status', e.target.value)}
              >
                <MenuItem value="planned">Planned</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="blocked">Blocked</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Priority</InputLabel>
              <Select
                value={item.priority || 'medium'}
                label="Priority"
                onChange={e => handleChange('priority', e.target.value)}
              >
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Impact</InputLabel>
              <Select
                value={item.impact || 'medium'}
                label="Impact"
                onChange={e => handleChange('impact', e.target.value)}
              >
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <TextField
            label="Notes"
            fullWidth
            multiline
            rows={3}
            value={item.notes || ''}
            onChange={e => handleChange('notes', e.target.value)}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Main component
const UpgradePlanner: React.FC = () => {
  const [devices] = useState<IDevice[]>(mockDevices);
  const [upgradePlan, setUpgradePlan] = useState<UpgradeItem[]>(mockUpgradePlan);
  const [selectedDevice, setSelectedDevice] = useState<IDevice | null>(
    devices.length > 0 ? devices[0] : null
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<UpgradeItem | undefined>(undefined);

  const filteredDevices = devices.filter(device =>
    device.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const deviceUpgrades = upgradePlan.filter(
    item => selectedDevice && item.entityId === selectedDevice._id
  );

  const handleCreateUpgrade = () => {
    setEditingItem(undefined);
    setDialogOpen(true);
  };

  const handleEditUpgrade = (item: UpgradeItem) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleDeleteUpgrade = (id: string) => {
    setUpgradePlan(prevPlan => prevPlan.filter(item => item.id !== id));
  };

  const handleSaveUpgrade = (item: UpgradeItem) => {
    if (editingItem) {
      setUpgradePlan(prevPlan =>
        prevPlan.map(prevItem => (prevItem.id === item.id ? item : prevItem))
      );
    } else {
      setUpgradePlan(prevPlan => [...prevPlan, item]);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planned':
        return <InfoIcon fontSize="small" color="info" />;
      case 'in_progress':
        return <CompareArrowsIcon fontSize="small" color="warning" />;
      case 'completed':
        return <CheckCircleIcon fontSize="small" color="success" />;
      case 'blocked':
        return <WarningIcon fontSize="small" color="error" />;
      default:
        return <span />;
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        System Upgrade Planner
      </Typography>
      <Typography variant="body2" paragraph>
        This tool helps plan and track upgrades to device configurations, data structures, and
        connection parameters. You can visualize current device parameters and plan changes.
      </Typography>

      <Box sx={{ display: 'flex', gap: 3, mt: 4 }}>
        {/* Device list panel */}
        <Paper
          variant="outlined"
          sx={{
            width: 300,
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 200px)',
          }}
        >
          <Typography variant="h6" gutterBottom>
            Devices
          </Typography>
          <TextField
            size="small"
            placeholder="Search devices..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
            {filteredDevices.map(device => (
              <Paper
                key={device._id}
                onClick={() => setSelectedDevice(device)}
                sx={{
                  p: 1.5,
                  mb: 1,
                  cursor: 'pointer',
                  bgcolor:
                    selectedDevice && selectedDevice._id === device._id
                      ? 'primary.light'
                      : 'background.paper',
                  color:
                    selectedDevice && selectedDevice._id === device._id
                      ? 'primary.contrastText'
                      : 'text.primary',
                  '&:hover': {
                    bgcolor:
                      selectedDevice && selectedDevice._id === device._id
                        ? 'primary.main'
                        : 'action.hover',
                  },
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                  {device.name}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block' }}>
                  {device.make} {device.model}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                  <Chip
                    label={device.enabled ? 'Enabled' : 'Disabled'}
                    size="small"
                    color={device.enabled ? 'success' : 'error'}
                  />
                  <Typography variant="caption" sx={{ ml: 1 }}>
                    {device.connectionSetting?.connectionType.toUpperCase()}
                  </Typography>
                </Box>
              </Paper>
            ))}
          </Box>
        </Paper>

        {/* Main content area */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedDevice ? (
            <>
              {/* Device details */}
              <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                <DeviceDetailsViewer device={selectedDevice} />
              </Paper>

              {/* Upgrade plans */}
              <Paper variant="outlined" sx={{ p: 2, flexGrow: 1 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Typography variant="h6">Upgrade Plans</Typography>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateUpgrade}>
                    New Upgrade
                  </Button>
                </Box>

                {deviceUpgrades.length > 0 ? (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Status</TableCell>
                          <TableCell>Name</TableCell>
                          <TableCell>Description</TableCell>
                          <TableCell>Current</TableCell>
                          <TableCell>New</TableCell>
                          <TableCell>Priority</TableCell>
                          <TableCell>Impact</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {deviceUpgrades.map(item => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Tooltip title={item.status}>{getStatusIcon(item.status)}</Tooltip>
                            </TableCell>
                            <TableCell>{item.name}</TableCell>
                            <TableCell>{item.description}</TableCell>
                            <TableCell>
                              {item.currentValue !== undefined ? String(item.currentValue) : '-'}
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {item.newValue !== undefined ? String(item.newValue) : '-'}
                                {item.currentValue !== undefined && item.newValue !== undefined && (
                                  <ArrowRightAltIcon sx={{ ml: 1, color: 'primary.main' }} />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={item.priority}
                                size="small"
                                color={
                                  item.priority === 'high'
                                    ? 'error'
                                    : item.priority === 'medium'
                                      ? 'warning'
                                      : 'default'
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={item.impact}
                                size="small"
                                color={
                                  item.impact === 'high'
                                    ? 'error'
                                    : item.impact === 'medium'
                                      ? 'warning'
                                      : 'default'
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <IconButton
                                size="small"
                                onClick={() => handleEditUpgrade(item)}
                                sx={{ mr: 1 }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteUpgrade(item.id)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      py: 8,
                    }}
                  >
                    <Typography color="text.secondary" align="center">
                      No upgrade plans for this device yet.
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={handleCreateUpgrade}
                      sx={{ mt: 2 }}
                    >
                      Create Upgrade Plan
                    </Button>
                  </Box>
                )}
              </Paper>
            </>
          ) : (
            <Paper
              variant="outlined"
              sx={{
                p: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
              }}
            >
              <Typography variant="h6">No device selected</Typography>
              <Typography variant="body2" color="text.secondary">
                Select a device from the list to view details and plan upgrades
              </Typography>
            </Paper>
          )}
        </Box>
      </Box>

      {/* Dialog for adding/editing upgrade items */}
      <UpgradeItemDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        upgradeItem={editingItem}
        onSave={handleSaveUpgrade}
        devices={devices}
      />
    </Box>
  );
};

export default UpgradePlanner;
