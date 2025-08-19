// Debug script to test authentication and routing
console.log('🔍 Debug: Checking authentication state...');

// Check localStorage
const authToken = localStorage.getItem('authToken');
const refreshToken = localStorage.getItem('refreshToken');

console.log('Auth Token:', authToken ? 'Present' : 'Missing');
console.log('Refresh Token:', refreshToken ? 'Present' : 'Missing');

// Check current URL
console.log('Current URL:', window.location.href);
console.log('Current Pathname:', window.location.pathname);
console.log('Current Search:', window.location.search);

// Check if we're on the login page
if (window.location.pathname === '/login') {
  console.log('⚠️ Currently on login page - this might be the issue!');
}

// Test API call
if (authToken) {
  fetch('http://localhost:8000/auth/me', {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  })
  .then(response => {
    console.log('Auth API Response Status:', response.status);
    if (response.ok) {
      return response.json();
    } else {
      throw new Error('Auth failed');
    }
  })
  .then(data => {
    console.log('✅ Auth API Success:', data);
  })
  .catch(error => {
    console.log('❌ Auth API Error:', error);
  });
} else {
  console.log('❌ No auth token found');
}

