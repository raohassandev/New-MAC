import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DeviceCard from '../../../components/devices/DeviceCard';
import { vi } from 'vitest';

// Mock react-router-dom directly
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
      <a href={to}>{children}</a>
    ),
    useNavigate: () => vi.fn(),
  };
});

// Mock UI components using Radix as these create complex DOM elements with refs
// Mock the Dropdown component
vi.mock('@/components/ui/Dropdown', () => {
  // Create mock for Dropdown.Item
  const DropdownItem = ({
    children,
    onClick,
    disabled,
    icon,
    danger,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    icon?: React.ReactNode;
    danger?: boolean;
  }) => (
    <div data-testid="dropdown-item" onClick={onClick} data-danger={danger ? 'true' : 'false'}>
      {icon && <span data-testid="dropdown-item-icon">{icon}</span>}
      {children}
    </div>
  );

  // Create mock for Dropdown.Separator
  const DropdownSeparator = () => <div data-testid="dropdown-separator" />;

  // Create main Dropdown mock
  const Dropdown = ({
    trigger,
    children,
  }: {
    trigger: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div data-testid="dropdown">
      <div data-testid="dropdown-trigger">{trigger}</div>
      <div data-testid="dropdown-content">{children}</div>
    </div>
  );

  // Add the compound components
  Dropdown.Item = DropdownItem;
  Dropdown.Separator = DropdownSeparator;

  return { Dropdown };
});

// Mock the Tooltip component
vi.mock('@/components/ui/Tooltip', () => ({
  Tooltip: ({ content, children }: { content: React.ReactNode; children: React.ReactNode }) => (
    <div data-testid="tooltip" data-content={String(content)}>
      {children}
    </div>
  ),
}));

// Mock the Badge component
vi.mock('@/components/ui/Badge', () => ({
  Badge: ({
    children,
    variant,
    size,
    icon,
  }: {
    children: React.ReactNode;
    variant?: string;
    size?: string;
    icon?: React.ReactNode;
  }) => (
    <div data-testid="badge" data-variant={variant} data-size={size}>
      {icon && <span data-testid="badge-icon">{icon}</span>}
      {children}
    </div>
  ),
}));

// Mock the Card component as a compound component
vi.mock('@/components/ui/Card', () => {
  // Create the individual components
  const CardContent = ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  );

  // Create the main Card component
  const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  );

  // Set up the compound component
  Card.Content = CardContent;

  return { Card };
});

describe('DeviceCard Component', () => {
  const mockDevice = {
    _id: 'device123',
    name: 'Test Device',
    enabled: true,
    make: 'Test Manufacturer',
    model: 'Test Model',
    ip: '192.168.1.100',  // Add these properties for the DeviceCard to display them
    port: 502,
    connectionSetting: {
      connectionType: 'tcp',
      tcp: {
        ip: '192.168.1.100',
        port: 502,
        slaveId: 1
      }
    },
    tags: ['test', 'device'],
    lastSeen: new Date().toISOString(),
  };

  const mockHandlers = {
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onToggleFavorite: vi.fn(),
    onTogglePin: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders device information correctly', () => {
    render(
      <DeviceCard
        device={mockDevice}
        onEdit={mockHandlers.onEdit}
        onDelete={mockHandlers.onDelete}
        onToggleFavorite={mockHandlers.onToggleFavorite}
        onTogglePin={mockHandlers.onTogglePin}
      />
    );

    // Check basic device information
    expect(screen.getByText('Test Device')).toBeInTheDocument();

    // Check for IP and port - the format in the component is dynamic
    expect(screen.getByText(/192\.168\.1\.100/)).toBeInTheDocument();
    expect(screen.getByText(/502/)).toBeInTheDocument();

    // Check for manufacturer/model
    const modelText = screen.getByText(/Test Manufacturer/);
    expect(modelText).toBeInTheDocument();
    expect(modelText.textContent).toBe('Test Manufacturer Test Model');

    // Check for online status badge
    expect(screen.getByText('Online')).toBeInTheDocument();

    // Check for tags
    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('device')).toBeInTheDocument();

    // Check for details link
    expect(screen.getByText('Details')).toBeInTheDocument();
  });

  test('renders dropdown menu with action items', () => {
    render(
      <DeviceCard
        device={mockDevice}
        onEdit={mockHandlers.onEdit}
        onDelete={mockHandlers.onDelete}
        onToggleFavorite={mockHandlers.onToggleFavorite}
        onTogglePin={mockHandlers.onTogglePin}
      />
    );

    // Check that dropdown trigger is rendered
    expect(screen.getByTestId('dropdown-trigger')).toBeInTheDocument();

    // Check dropdown content has required actions
    const dropdownContent = screen.getByTestId('dropdown-content');
    expect(dropdownContent.textContent).toContain('Edit Device');
    expect(dropdownContent.textContent).toContain('Add to Favorites');
    expect(dropdownContent.textContent).toContain('Pin Device');
    expect(dropdownContent.textContent).toContain('Delete Device');
  });

  test('shows favorite status correctly', () => {
    const { rerender } = render(
      <DeviceCard
        device={mockDevice}
        onEdit={mockHandlers.onEdit}
        onDelete={mockHandlers.onDelete}
        onToggleFavorite={mockHandlers.onToggleFavorite}
        onTogglePin={mockHandlers.onTogglePin}
        isFavorite={false}
      />
    );

    // Check dropdown shows "Add to Favorites" when not favorited
    expect(screen.getByTestId('dropdown-content').textContent).toContain('Add to Favorites');

    // Rerender with favorite=true
    rerender(
      <DeviceCard
        device={mockDevice}
        onEdit={mockHandlers.onEdit}
        onDelete={mockHandlers.onDelete}
        onToggleFavorite={mockHandlers.onToggleFavorite}
        onTogglePin={mockHandlers.onTogglePin}
        isFavorite={true}
      />
    );

    // Check it now shows "Remove from Favorites"
    expect(screen.getByTestId('dropdown-content').textContent).toContain('Remove from Favorites');
  });

  test('shows pinned status correctly', () => {
    const { rerender } = render(
      <DeviceCard
        device={mockDevice}
        onEdit={mockHandlers.onEdit}
        onDelete={mockHandlers.onDelete}
        onToggleFavorite={mockHandlers.onToggleFavorite}
        onTogglePin={mockHandlers.onTogglePin}
        isPinned={false}
      />
    );

    // Check dropdown shows "Pin Device" when not pinned
    expect(screen.getByTestId('dropdown-content').textContent).toContain('Pin Device');

    // Rerender with isPinned=true
    rerender(
      <DeviceCard
        device={mockDevice}
        onEdit={mockHandlers.onEdit}
        onDelete={mockHandlers.onDelete}
        onToggleFavorite={mockHandlers.onToggleFavorite}
        onTogglePin={mockHandlers.onTogglePin}
        isPinned={true}
      />
    );

    // Check it now shows "Unpin Device"
    expect(screen.getByTestId('dropdown-content').textContent).toContain('Unpin Device');
  });

  test('displays offline status when device is disabled', () => {
    render(
      <DeviceCard
        device={{ ...mockDevice, enabled: false }}
        onEdit={mockHandlers.onEdit}
        onDelete={mockHandlers.onDelete}
      />
    );

    // Check for offline status
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });
});
