import React, { useContext, useState } from "react";
import { MdOutlineMailOutline } from "react-icons/md";
import { RiLock2Fill } from "react-icons/ri";
import { FaRegUser } from "react-icons/fa";
import { Link, Navigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import api from "../../utils/api";
import toast from "react-hot-toast";
import { Context } from "../../main";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");

  const { isAuthorized, setIsAuthorized } = useContext(Context);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password || !role) {
      toast.error("Vui lòng nhập đầy đủ thông tin!");
      return;
    }

    try {
      const { data } = await api.post(
        "/user/login",
        { email, password, role }
      );

      toast.success(data.message);
      setIsAuthorized(true);

      // reset form
      setEmail("");
      setPassword("");
      setRole("");
    } catch (error) {
      toast.error(error.response?.data?.message || "Đăng nhập thất bại");
    }
  };

  const handleGoogleLogin = async (res) => {
    if (!role) {
      toast.error("Vui lòng chọn vai trò trước khi đăng nhập Google!");
      return;
    }
    if (role === "Admin") {
      toast.error("Quản trị viên không thể đăng nhập bằng Google!");
      return;
    }

    try {
      const { data } = await api.post(
        "/user/google-login",
        { tokenId: res.credential, role }
      );
      toast.success(data.message);
      setIsAuthorized(true);
    } catch (error) {
      toast.error(error.response?.data?.message || "Đăng nhập Google thất bại");
    }
  };

  if (isAuthorized) {
    return <Navigate to="/" />;
  }

  return (
    <section className="authPage">
      <div className="container">
        <div className="header">
          <img src="/careerconnect-black.png" alt="logo" />
          <h3>Đăng nhập vào tài khoản</h3>
        </div>

        <form>
          <div className="inputTag">
            <label>Đăng nhập với vai trò</label>
            <div>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="">Chọn vai trò</option>
                <option value="Job Seeker">Người tìm việc</option>
                <option value="Employer">Nhà tuyển dụng</option>
                <option value="Admin">Quản trị viên (Tài khoản nội bộ)</option>
              </select>
              <FaRegUser />
            </div>
          </div>

          <div className="inputTag">
            <label>Email</label>
            <div>
              <input
                type="email"
                placeholder="Nhập email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <MdOutlineMailOutline />
            </div>
          </div>

          <div className="inputTag">
            <label>Mật khẩu</label>
            <div>
              <input
                type="password"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <RiLock2Fill />
            </div>
          </div>

          <button type="submit" onClick={handleLogin}>Đăng nhập</button>

          <div className="google-login">
            <GoogleLogin
              onSuccess={handleGoogleLogin}
              onError={() => toast.error("Đăng nhập Google thất bại")}
            />
          </div>

          {role !== "Admin" && (
            <Link to="/register">Đăng ký ngay</Link>
          )}
        </form>
      </div>

      <div className="banner">
        <img src="/login.png" alt="login" />
      </div>
    </section>
  );
};

export default Login;
