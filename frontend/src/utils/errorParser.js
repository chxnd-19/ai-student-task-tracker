/**
 * Parses error responses from the backend to provide user-friendly messages.
 * Handles both standard {message: string} responses and Pydantic validation details.
 * 
 * @param {Object} err - The error object from axios/fetch
 * @param {string} fallback - Fallback message if parsing fails
 * @returns {string}
 */
export const parseError = (err, fallback = 'Something went wrong. Please try again.') => {
  const data = err.response?.data;
  
  // 1. Explicit message from backend (e.g., "Email already registered")
  if (data?.message) return data.message;
  
  // 2. Pydantic validation errors (array of details)
  if (Array.isArray(data?.detail)) {
    const first = data.detail[0];
    if (first?.msg) {
      // Format: "field: error message" or just "error message"
      const field = first.loc?.[first.loc.length - 1];
      return field ? `${field}: ${first.msg}` : first.msg;
    }
  }
  
  // 3. Simple string detail (FastAPI default for some errors)
  if (typeof data?.detail === 'string') return data.detail;
  
  return fallback;
};
