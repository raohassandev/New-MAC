import {
  AlertCircle,
  ChevronDown,
  Edit,
  Filter,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Trash,
  User,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

// import API from '../../services/api';
import { useAuth } from '../context/AuthContext';

// Types
interface UserData {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'engineer' | 'operator' | 'viewer';
  permissions: string[];
  lastLogin?: Date;
  createdAt: Date;
  status: 'active' | 'inactive';
}

interface RoleDefinition {
  name: string;
  label: string;
  color: string;
  permissions: string[];
}

// Role definitions with associated permissions
const roles: Record<string, RoleDefinition> = {
  admin: {
    name: 'admin',
    label: 'Administrator',
    color: 'bg-blue-100 text-blue-800',
    permissions: [
      'view_devices',
      'add_devices',
      'edit_devices',
      'delete_devices',
      'test_devices',
      'view_profiles',
      'add_profiles',
      'edit_profiles',
      'delete_profiles',
      'apply_profiles',
      'view_users',
      'add_users',
      'edit_users',
      'delete_users',
      'view_system',
      'edit_system',
      'restart_services',
    ],
  },
  engineer: {
    name: 'engineer',
    label: 'Engineer',
    color: 'bg-purple-100 text-purple-800',
    permissions: [
      'view_devices',
      'add_devices',
      'edit_devices',
      'test_devices',
      'view_profiles',
      'add_profiles',
      'edit_profiles',
      'apply_profiles',
      'view_system',
    ],
  },
  operator: {
    name: 'operator',
    label: 'Operator',
    color: 'bg-green-100 text-green-800',
    permissions: ['view_devices', 'test_devices', 'view_profiles', 'apply_profiles'],
  },
  viewer: {
    name: 'viewer',
    label: 'Viewer',
    color: 'bg-gray-100 text-gray-800',
    permissions: ['view_devices', 'view_profiles'],
  },
};

// Permission categories
const permissionCategories = {
  devices: ['view_devices', 'add_devices', 'edit_devices', 'delete_devices', 'test_devices'],
  profiles: ['view_profiles', 'add_profiles', 'edit_profiles', 'delete_profiles', 'apply_profiles'],
  users: ['view_users', 'add_users', 'edit_users', 'delete_users'],
  system: ['view_system', 'edit_system', 'restart_services'],
};

// Permission display names
const permissionLabels: Record<string, string> = {
  view_devices: 'View Devices',
  add_devices: 'Add Devices',
  edit_devices: 'Edit Devices',
  delete_devices: 'Delete Devices',
  test_devices: 'Test Devices',
  view_profiles: 'View Profiles',
  add_profiles: 'Add Profiles',
  edit_profiles: 'Edit Profiles',
  delete_profiles: 'Delete Profiles',
  apply_profiles: 'Apply Profiles',
  view_users: 'View Users',
  add_users: 'Add Users',
  edit_users: 'Edit Users',
  delete_users: 'Delete Users',
  view_system: 'View System',
  edit_system: 'Edit System',
  restart_services: 'Restart Services',
};

const AdminUserManagement: React.FC = () => {
  // State
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);

  // Auth context for permission checking
  const { user: currentAuthUser } = useAuth();
  const currentUserId = currentAuthUser?._id;
  const canAddUsers = currentAuthUser?.permissions.includes('add_users') || false;
  const canEditUsers = currentAuthUser?.permissions.includes('edit_users') || false;
  const canDeleteUsers = currentAuthUser?.permissions.includes('delete_users') || false;

  // Fetch users
  useEffect(() => {
    fetchUsers();
  }, []);

  // Apply filters when search, role filter, or status filter changes
  useEffect(() => {
    applyFilters();
  }, [users, searchQuery, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      // In a real implementation, this would be an API call
      // const response = await API.get('/admin/users');
      // For demo purposes, we'll use mock data
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay

      // Mock data
      const mockUsers: UserData[] = [
        {
          _id: '1',
          name: 'Admin User',
          email: 'admin@macsys.com',
          role: 'admin',
          permissions: roles.admin.permissions,
          lastLogin: new Date(),
          createdAt: new Date('2023-01-15'),
          status: 'active',
        },
        {
          _id: '2',
          name: 'John Engineer',
          email: 'john@macsys.com',
          role: 'engineer',
          permissions: roles.engineer.permissions,
          lastLogin: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          createdAt: new Date('2023-02-10'),
          status: 'active',
        },
        {
          _id: '3',
          name: 'Sarah Operator',
          email: 'sarah@macsys.com',
          role: 'operator',
          permissions: roles.operator.permissions,
          lastLogin: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          createdAt: new Date('2023-03-20'),
          status: 'active',
        },
        {
          _id: '4',
          name: 'Tom Viewer',
          email: 'tom@macsys.com',
          role: 'viewer',
          permissions: roles.viewer.permissions,
          lastLogin: undefined, // Never logged in
          createdAt: new Date('2023-04-05'),
          status: 'inactive',
        },
      ];

      setUsers(mockUsers);
      setFilteredUsers(mockUsers);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        user => user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query)
      );
    }

    // Apply role filter
    if (roleFilter) {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    setFilteredUsers(filtered);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setRoleFilter(null);
    setStatusFilter(null);
  };

  const handleAddUser = () => {
    setCurrentUser(null); // No user selected = new user
    setShowUserModal(true);
  };

  const handleEditUser = (user: UserData) => {
    setCurrentUser(user);
    setShowUserModal(true);
  };

  const handleDeleteUser = (userId: string) => {
    setDeleteConfirmation(userId);
  };

  const confirmDeleteUser = async () => {
    if (!deleteConfirmation) return;

    try {
      // In a real implementation, this would be an API call
      // await API.delete(`/admin/users/${deleteConfirmation}`);

      // For demo purposes, just update local state
      setUsers(users.filter(user => user._id !== deleteConfirmation));

      // Close confirmation dialog
      setDeleteConfirmation(null);
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setError(err.message || 'Failed to delete user');
    }
  };

  const handleSaveUser = async (userData: Partial<UserData>) => {
    try {
      if (currentUser) {
        // Update existing user
        // In a real implementation, this would be an API call
        // await API.put(`/admin/users/${currentUser._id}`, userData);

        // For demo purposes, just update local state
        setUsers(
          users.map(user => (user._id === currentUser._id ? { ...user, ...userData } : user))
        );
      } else {
        // Create new user
        // In a real implementation, this would be an API call
        // const response = await API.post('/admin/users', userData);

        // For demo purposes, just update local state with mock data
        const newUser: UserData = {
          _id: Math.random().toString(36).substring(2, 15), // Generate random ID
          name: userData.name || 'New User',
          email: userData.email || 'new@example.com',
          role: userData.role || 'viewer',
          permissions: userData.permissions || roles.viewer.permissions,
          createdAt: new Date(),
          status: userData.status || 'active',
        };

        setUsers([...users, newUser]);
      }

      // Close the modal
      setShowUserModal(false);
    } catch (err: any) {
      console.error('Error saving user:', err);
      setError(err.message || 'Failed to save user');
    }
  };

  // Format date for display
  const formatDate = (date?: Date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
        {canAddUsers && (
          <button
            onClick={handleAddUser}
            className="flex items-center gap-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            <Plus size={16} />
            Add New User
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-lg bg-white p-4 shadow">
        <div className="flex flex-col gap-4 sm:flex-row">
          {/* Search */}
          <div className="relative flex-grow">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 transform text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Role Filter */}
          <div className="relative">
            <select
              value={roleFilter || ''}
              onChange={e => setRoleFilter(e.target.value || null)}
              className="appearance-none rounded-md border border-gray-300 py-2 pl-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Roles</option>
              {Object.values(roles).map(role => (
                <option key={role.name} value={role.name}>
                  {role.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 transform text-gray-400"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter || ''}
              onChange={e => setStatusFilter(e.target.value || null)}
              className="appearance-none rounded-md border border-gray-300 py-2 pl-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 transform text-gray-400"
            />
          </div>

          {/* Reset Filters */}
          <button
            onClick={resetFilters}
            className="rounded-md border border-gray-300 px-4 py-2 text-gray-600 hover:bg-gray-50"
          >
            <div className="flex items-center gap-1">
              <Filter size={16} />
              Reset
            </div>
          </button>

          {/* Refresh */}
          <button
            onClick={fetchUsers}
            className="rounded-md border border-gray-300 px-4 py-2 text-gray-600 hover:bg-gray-50"
            disabled={loading}
          >
            <div className="flex items-center gap-1">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </div>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded border-l-4 border-red-500 bg-red-50 p-4">
          <div className="flex items-start">
            <AlertCircle className="mr-3 mt-0.5 text-red-500" />
            <div>
              <h3 className="font-medium text-red-800">Error</h3>
              <p className="mt-1 text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="overflow-hidden rounded-lg bg-white shadow-md">
        {loading ? (
          <div className="animate-pulse p-8 text-center text-gray-500">
            <User className="mx-auto mb-4" size={32} />
            <p>Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <User className="mx-auto mb-4" size={32} />
            <p className="mb-2">No users found</p>
            <p className="text-sm">
              {searchQuery || roleFilter || statusFilter
                ? 'Try adjusting your filters'
                : 'Add your first user to get started'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredUsers.map(user => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-500">
                          <User size={16} />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold leading-5 ${
                          roles[user.role].color
                        }`}
                      >
                        {roles[user.role].label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold leading-5 ${
                          user.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {user.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {formatDate(user.lastLogin)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      {canEditUsers && (
                        <button
                          onClick={() => handleEditUser(user)}
                          className="mr-3 text-indigo-600 hover:text-indigo-900"
                          disabled={user._id === currentUserId} // Can't edit self
                        >
                          <Edit size={16} />
                        </button>
                      )}
                      {canDeleteUsers && (
                        <button
                          onClick={() => handleDeleteUser(user._id)}
                          className="text-red-600 hover:text-red-900"
                          disabled={user._id === currentUserId} // Can't delete self
                        >
                          <Trash size={16} />
                        </button>
                      )}
                      {!canEditUsers && !canDeleteUsers && (
                        <Lock size={16} className="text-gray-400" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Form Modal */}
      {showUserModal && (
        <UserFormModal
          user={currentUser}
          onClose={() => setShowUserModal(false)}
          onSave={handleSaveUser}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600 bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-semibold">Confirm Delete</h2>
            <p className="mb-4">
              Are you sure you want to delete this user? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="rounded border border-gray-300 px-4 py-2 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteUser}
                className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// User Form Modal Component
interface UserFormModalProps {
  user: UserData | null;
  onClose: () => void;
  onSave: (userData: Partial<UserData>) => void;
}

const UserFormModal: React.FC<UserFormModalProps> = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<UserData>>(
    user
      ? { ...user }
      : {
          name: '',
          email: '',
          role: 'viewer',
          permissions: [...roles.viewer.permissions],
          status: 'active',
        }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customPermissions, setCustomPermissions] = useState(false);

  // Handle role change
  useEffect(() => {
    if (!customPermissions) {
      setFormData(prev => ({
        ...prev,
        permissions: [...roles[prev.role || 'viewer'].permissions],
      }));
    }
  }, [formData.role, customPermissions]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const { name, checked } = e.target;
  //   setFormData((prev) => ({ ...prev, [name]: checked }));
  // };

  const handlePermissionChange = (permission: string) => {
    setFormData(prev => {
      const permissions = prev.permissions || [];
      if (permissions.includes(permission)) {
        return {
          ...prev,
          permissions: permissions.filter(p => p !== permission),
        };
      } else {
        return { ...prev, permissions: [...permissions, permission] };
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600 bg-opacity-50">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-lg">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-xl font-semibold">{user ? 'Edit User' : 'Add New User'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="name">
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name || ''}
                onChange={handleInputChange}
                className={`appearance-none border shadow ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                } focus:shadow-outline w-full rounded px-3 py-2 leading-tight text-gray-700 focus:outline-none`}
                placeholder="John Doe"
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="email">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email || ''}
                onChange={handleInputChange}
                className={`appearance-none border shadow ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                } focus:shadow-outline w-full rounded px-3 py-2 leading-tight text-gray-700 focus:outline-none`}
                placeholder="john@example.com"
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="role">
                Role *
              </label>
              <select
                id="role"
                name="role"
                value={formData.role || 'viewer'}
                onChange={handleInputChange}
                className={`appearance-none border shadow ${
                  errors.role ? 'border-red-500' : 'border-gray-300'
                } focus:shadow-outline w-full rounded px-3 py-2 leading-tight text-gray-700 focus:outline-none`}
              >
                {Object.values(roles).map(role => (
                  <option key={role.name} value={role.name}>
                    {role.label}
                  </option>
                ))}
              </select>
              {errors.role && <p className="mt-1 text-xs text-red-500">{errors.role}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="status">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status || 'active'}
                onChange={handleInputChange}
                className="focus:shadow-outline w-full appearance-none rounded border border-gray-300 px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Permissions Section */}
          <div className="mb-4 border-t pt-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-lg font-medium">Permissions</h3>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="customPermissions"
                  checked={customPermissions}
                  onChange={() => setCustomPermissions(!customPermissions)}
                  className="mr-2"
                />
                <label htmlFor="customPermissions" className="text-sm text-gray-600">
                  Custom Permissions
                </label>
              </div>
            </div>

            {!customPermissions ? (
              <div className="rounded bg-gray-50 p-4">
                <p className="mb-2 text-sm text-gray-600">
                  Using default permissions for role:{' '}
                  <span className="font-semibold">{roles[formData.role || 'viewer'].label}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {roles[formData.role || 'viewer'].permissions.map(permission => (
                    <span
                      key={permission}
                      className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800"
                    >
                      {permissionLabels[permission]}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="divide-y rounded-md border">
                {/* Devices Permissions */}
                <PermissionCategory
                  title="Devices"
                  permissions={permissionCategories.devices}
                  selectedPermissions={formData.permissions || []}
                  onTogglePermission={handlePermissionChange}
                />

                {/* Profiles Permissions */}
                <PermissionCategory
                  title="Profiles"
                  permissions={permissionCategories.profiles}
                  selectedPermissions={formData.permissions || []}
                  onTogglePermission={handlePermissionChange}
                />

                {/* Users Permissions */}
                <PermissionCategory
                  title="Users"
                  permissions={permissionCategories.users}
                  selectedPermissions={formData.permissions || []}
                  onTogglePermission={handlePermissionChange}
                />

                {/* System Permissions */}
                <PermissionCategory
                  title="System"
                  permissions={permissionCategories.system}
                  selectedPermissions={formData.permissions || []}
                  onTogglePermission={handlePermissionChange}
                />
              </div>
            )}
          </div>

          {/* Password Section (only for new users) */}
          {!user && (
            <div className="mb-6 border-t pt-4">
              <h3 className="mb-2 text-lg font-medium">Password</h3>
              <p className="mb-4 text-sm text-gray-600">
                A random password will be generated and sent to the user's email.
              </p>
            </div>
          )}

          <div className="flex justify-end border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              className="mr-2 rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              {user ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Permission Category Component
interface PermissionCategoryProps {
  title: string;
  permissions: string[];
  selectedPermissions: string[];
  onTogglePermission: (permission: string) => void;
}

const PermissionCategory: React.FC<PermissionCategoryProps> = ({
  title,
  permissions,
  selectedPermissions,
  onTogglePermission,
}) => {
  return (
    <div className="p-4">
      <h4 className="mb-2 font-medium text-gray-700">{title}</h4>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
        {permissions.map(permission => (
          <div key={permission} className="flex items-center">
            <input
              type="checkbox"
              id={permission}
              checked={selectedPermissions.includes(permission)}
              onChange={() => onTogglePermission(permission)}
              className="mr-2"
            />
            <label htmlFor={permission} className="text-sm text-gray-600">
              {permissionLabels[permission]}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminUserManagement;
