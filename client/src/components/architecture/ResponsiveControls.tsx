import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  FormControlLabel,
  Switch,
  TextField,
  InputAdornment,
  ButtonGroup,
  Tooltip,
  IconButton,
  Collapse,
  useMediaQuery,
  useTheme,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Badge,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  FileDownload as FileDownloadIcon,
  Help as HelpIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  Storage as StorageIcon,
  Code as CodeIcon,
  Api as ApiIcon,
  NetworkCheck as NetworkCheckIcon,
  DataObject as DataObjectIcon,
} from '@mui/icons-material';

interface ArchitectureFilters {
  showTypes: { [key: string]: boolean };
  showBackend: boolean;
  showFrontend: boolean;
  searchTerm: string;
}

interface ResponsiveControlsProps {
  filters: ArchitectureFilters;
  onFiltersChange: (filters: Partial<ArchitectureFilters>) => void;
  onReset: () => void;
  onFitView: () => void;
  onExport: () => void;
  onHelp: () => void;
  stats: {
    totalNodes: number;
    visibleNodes: number;
    totalEdges: number;
    visibleEdges: number;
  };
}

const ResponsiveControls: React.FC<ResponsiveControlsProps> = ({
  filters,
  onFiltersChange,
  onReset,
  onFitView,
  onExport,
  onHelp,
  stats,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  
  const [filtersExpanded, setFiltersExpanded] = useState(!isMobile);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const typeFilters = [
    { key: 'controller', label: 'Controllers', icon: <CodeIcon />, color: 'primary' },
    { key: 'service', label: 'Services', icon: <SettingsIcon />, color: 'secondary' },
    { key: 'model', label: 'Models', icon: <DataObjectIcon />, color: 'success' },
    { key: 'middleware', label: 'Middleware', icon: <NetworkCheckIcon />, color: 'warning' },
    { key: 'route', label: 'Routes', icon: <ApiIcon />, color: 'info' },
    { key: 'database', label: 'Databases', icon: <StorageIcon />, color: 'error' },
  ];

  const activeFiltersCount = Object.values(filters.showTypes).filter(Boolean).length;

  const handleTypeToggle = (type: string) => {
    onFiltersChange({
      showTypes: {
        ...filters.showTypes,
        [type]: !filters.showTypes[type],
      },
    });
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ searchTerm: event.target.value });
  };

  // Mobile action buttons
  const ActionButtons = () => (
    <ButtonGroup 
      variant="outlined" 
      size={isMobile ? "small" : "medium"}
      orientation={isMobile ? "vertical" : "horizontal"}
      fullWidth={isMobile}
    >
      <Tooltip title="Reset view and filters">
        <Button startIcon={<RefreshIcon />} onClick={onReset}>
          {isMobile ? '' : 'Reset'}
        </Button>
      </Tooltip>
      <Tooltip title="Fit all components in view">
        <Button startIcon={<SaveIcon />} onClick={onFitView}>
          {isMobile ? '' : 'Fit View'}
        </Button>
      </Tooltip>
      <Tooltip title="Export diagram as SVG">
        <Button startIcon={<FileDownloadIcon />} onClick={onExport}>
          {isMobile ? '' : 'Export'}
        </Button>
      </Tooltip>
      <Tooltip title="Show help and documentation">
        <Button startIcon={<HelpIcon />} onClick={onHelp}>
          {isMobile ? '' : 'Help'}
        </Button>
      </Tooltip>
    </ButtonGroup>
  );

  // Filter chips component
  const FilterChips = () => (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
      <FilterListIcon color="action" />
      {typeFilters.map((filter) => (
        <Tooltip key={filter.key} title={filter.label}>
          <Chip
            icon={filter.icon}
            label={isMobile ? '' : filter.label}
            clickable
            color={filters.showTypes[filter.key] ? filter.color as any : 'default'}
            onClick={() => handleTypeToggle(filter.key)}
            size={isMobile ? 'small' : 'medium'}
            sx={{ 
              fontWeight: filters.showTypes[filter.key] ? 'bold' : 'normal',
              minWidth: isMobile ? 'auto' : '100px'
            }}
          />
        </Tooltip>
      ))}
    </Box>
  );

  // Backend/Frontend toggles
  const ViewToggles = () => (
    <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 1 }}>
      <FormControlLabel
        control={
          <Switch
            checked={filters.showBackend}
            onChange={() => onFiltersChange({ showBackend: !filters.showBackend })}
            color="primary"
            size={isMobile ? 'small' : 'medium'}
          />
        }
        label="Backend"
        sx={{ margin: 0 }}
      />
      <FormControlLabel
        control={
          <Switch
            checked={filters.showFrontend}
            onChange={() => onFiltersChange({ showFrontend: !filters.showFrontend })}
            color="primary"
            size={isMobile ? 'small' : 'medium'}
          />
        }
        label="Frontend"
        sx={{ margin: 0 }}
      />
    </Box>
  );

  // Stats display
  const StatsDisplay = () => (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
      <Typography variant="body2" color="text.secondary">
        Nodes: {stats.visibleNodes} of {stats.totalNodes}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Connections: {stats.visibleEdges} of {stats.totalEdges}
      </Typography>
    </Box>
  );

  // Mobile drawer content
  const DrawerContent = () => (
    <Box sx={{ width: 300, p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Diagram Controls
      </Typography>
      
      <Divider sx={{ my: 2 }} />
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Search
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="Search components..."
          value={filters.searchTerm}
          onChange={handleSearch}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Component Types
        </Typography>
        <List dense>
          {typeFilters.map((filter) => (
            <ListItem
              key={filter.key}
              onClick={() => handleTypeToggle(filter.key)}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                bgcolor: filters.showTypes[filter.key] ? 'action.selected' : 'transparent',
              }}
            >
              <ListItemIcon sx={{ color: filters.showTypes[filter.key] ? `${filter.color}.main` : 'inherit' }}>
                {filter.icon}
              </ListItemIcon>
              <ListItemText primary={filter.label} />
            </ListItem>
          ))}
        </List>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          View Options
        </Typography>
        <ViewToggles />
      </Box>

      <Divider sx={{ my: 2 }} />
      
      <Box sx={{ mb: 3 }}>
        <ActionButtons />
      </Box>

      <Box>
        <StatsDisplay />
      </Box>
    </Box>
  );

  // Desktop layout
  if (!isMobile) {
    return (
      <Box>
        {/* Header controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h5" fontWeight="bold">
            System Architecture Diagram
          </Typography>
          <ActionButtons />
        </Box>

        {/* Search and filters */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <TextField
              label="Search"
              variant="outlined"
              size="small"
              value={filters.searchTerm}
              onChange={handleSearch}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ width: isTablet ? 250 : 300 }}
            />

            <Tooltip title={`${activeFiltersCount} of ${typeFilters.length} types visible`}>
              <IconButton 
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                color={filtersExpanded ? 'primary' : 'default'}
              >
                <Badge badgeContent={activeFiltersCount} color="primary">
                  <FilterListIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            <Box sx={{ ml: 'auto' }}>
              <ViewToggles />
            </Box>
          </Box>

          <Collapse in={filtersExpanded}>
            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <FilterChips />
            </Box>
          </Collapse>
        </Box>

        {/* Stats */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <StatsDisplay />
          <Typography variant="body2" color="text.secondary">
            Zoom and drag to explore. Click nodes for details. Double-click to expand.
          </Typography>
        </Box>
      </Box>
    );
  }

  // Mobile layout
  return (
    <Box>
      {/* Mobile header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h6" fontWeight="bold" noWrap>
          Architecture
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Show controls">
            <IconButton onClick={() => setMobileDrawerOpen(true)}>
              <Badge badgeContent={activeFiltersCount} color="primary">
                <MenuIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          <Tooltip title="Show help">
            <IconButton onClick={onHelp} size="small">
              <HelpIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Mobile search */}
      <Box sx={{ mb: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search..."
          value={filters.searchTerm}
          onChange={handleSearch}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Mobile stats */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {stats.visibleNodes}/{stats.totalNodes} nodes • {stats.visibleEdges}/{stats.totalEdges} edges
        </Typography>
      </Box>

      {/* Mobile drawer */}
      <Drawer
        anchor="right"
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
      >
        <DrawerContent />
      </Drawer>
    </Box>
  );
};

export default ResponsiveControls;