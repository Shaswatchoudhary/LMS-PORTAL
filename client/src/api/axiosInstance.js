import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "http://localhost:5011/", // Changed to port 5011 since 5000 is in use
  withCredentials: true, // Enable sending cookies with cross-origin requests
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json"
  }
});

axiosInstance.interceptors.request.use(
  (config) => {
    // Check both localStorage and sessionStorage for the token
    const accessToken = 
      JSON.parse(localStorage.getItem("accessToken")) || 
      JSON.parse(sessionStorage.getItem("accessToken")) || 
      "";
    
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    
    return config;
  },
  (err) => Promise.reject(err)
);

// Add response interceptor for better error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle CORS and network errors
    if (error.message === "Network Error") {
      console.error("CORS or network error occurred. Please check server connection.");
    }
    
    // Handle auth errors
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("accessToken");
      sessionStorage.removeItem("accessToken");
      // You could add redirect logic here if needed
      // window.location.href = "/login";
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;