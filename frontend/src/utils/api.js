import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/v1",
  withCredentials: true,
});

// Response interceptor - xử lý 401 tập trung
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Bỏ qua redirect cho getuser (kiểm tra auth ban đầu)
      const url = error.config?.url || "";
      if (!url.includes("/user/getuser")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
