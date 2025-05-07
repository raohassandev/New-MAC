// A utility file to handle demo authentication

// Define the demo user credentials
const DEMO_USER = {
  email: 'demo@example.com',
  password: 'demo123',
  name: 'Demo User',
  _id: 'demo_user_id',
  role: 'admin',
  permissions: [
    'view_devices',
    'add_devices',
    'edit_devices',
    'delete_devices',
    'manage_devices',
    'view_profiles',
    'add_profiles',
    'edit_profiles',
    'delete_profiles',
    'manage_profiles',
  ],
};

// Generate a fake JWT token (this is NOT a real token, just a placeholder)
function generateFakeToken(): string {
  // In a real app, this would be a JWT from the server
  // For demo purposes, we're creating something that looks like a JWT
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      id: DEMO_USER._id, // Use 'id' to match what the server expects
      userId: DEMO_USER._id,
      email: DEMO_USER.email,
      name: DEMO_USER.name,
      role: DEMO_USER.role,
      permissions: DEMO_USER.permissions,
      exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
    })
  );
  // Include 'demo_signature' in the signature so the server can detect demo tokens
  const signature = btoa('demo_signature');

  return `${header}.${payload}.${signature}`;
}

// Ensure the user is logged in for demo purposes
export function ensureDemoAuth(): string | null {
  // Check if we already have a token
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');

  if (!token || !user) {
    console.log('No auth token found, setting up demo authentication');

    // Generate a demo token
    const demoToken = generateFakeToken();

    // Store the token and user in localStorage
    localStorage.setItem('token', demoToken);
    localStorage.setItem(
      'user',
      JSON.stringify({
        ...DEMO_USER,
        token: demoToken,
      })
    );

    console.log('Demo authentication setup complete');
    return demoToken;
  }

  return token;
}

// Call this function to set up authentication before API calls
export function initDemoAuth(): string | null {
  return ensureDemoAuth();
}
