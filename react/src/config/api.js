// API Base URL Configuration
// In Docker production: uses relative path (nginx proxy)
// In development: uses VITE_API_BASE env var or localhost:5019
export const API_BASE_URL = import.meta.env.VITE_API_BASE || '/api';

// Helper function to build full API URLs
export const buildApiUrl = (endpoint) => {
  // Remove leading slash from endpoint if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  // If API_BASE_URL is relative (starts with /), use it directly
  if (API_BASE_URL.startsWith('/')) {
    return `${API_BASE_URL}/${cleanEndpoint}`;
  }
  
  // If API_BASE_URL is absolute (http://...), use it directly
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

export default API_BASE_URL;
