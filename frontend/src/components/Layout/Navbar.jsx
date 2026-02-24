import React, { useContext, useState } from "react";
import { Context } from "../../main";
import { Link, useNavigate } from "react-router-dom";
import api from "../../utils/api";
import toast from "react-hot-toast";
import { GiHamburgerMenu } from "react-icons/gi";
import { AiOutlineClose } from "react-icons/ai";
import { FiSettings } from "react-icons/fi";
import NotificationBell from "./NotificationBell";
import "./Navbar.css";

const Navbar = () => {
  const [show, setShow] = useState(false);
  const { isAuthorized, setIsAuthorized, user } = useContext(Context);
  const navigateTo = useNavigate();

  const handleLogout = async () => {
    try {
      const response = await api.get("/user/logout");
      toast.success(response.data.message);
      setIsAuthorized(false);
      navigateTo("/login");
    } catch (error) {
      toast.error(error.response.data.message);
      setIsAuthorized(true);
    }
  };

  return (
    <nav className="navbarShow" role="navigation" aria-label="Menu chính">
      <div className="container">
        <div className="logo">
          <Link to="/" aria-label="Về trang chủ">
            <img src="/careerconnect-white.png" alt="CareerConnect" />
          </Link>
        </div>

        <ul className={!show ? "menu" : "show-menu menu"} role="menubar">
          <li><Link to="/" onClick={() => setShow(false)}>TRANG CHỦ</Link></li>
          <li><Link to="/job/getall" onClick={() => setShow(false)}>TẤT CẢ CÔNG VIỆC</Link></li>

          {!isAuthorized && (
            <>
              <li><Link to="/login" onClick={() => setShow(false)}>ĐĂNG NHẬP</Link></li>
              <li><Link to="/register" onClick={() => setShow(false)}>ĐĂNG KÝ</Link></li>
            </>
          )}

          {isAuthorized && (
            <>
              {user && user.role !== "Admin" && (
                <>
                  <li>
                    <Link to="/applications/me" onClick={() => setShow(false)}>
                      {user.role === "Employer" ? "HỒ SƠ ỨNG TUYỂN" : "ĐƠN ỨNG TUYỂN CỦA TÔI"}
                    </Link>
                  </li>
                  <li><Link to="/interviews" onClick={() => setShow(false)}>LỊCH PHỎNG VẤN</Link></li>
                </>
              )}

              {user && user.role === "Employer" && (
                <>
                  <li><Link to="/job/post" onClick={() => setShow(false)}>ĐĂNG CÔNG VIỆC MỚI</Link></li>
                  <li><Link to="/job/me" onClick={() => setShow(false)}>CÔNG VIỆC CỦA BẠN</Link></li>
                </>
              )}

              {user && user.role === "Admin" && (
                <>
                  <li><Link to="/admin/jobs" onClick={() => setShow(false)}>DUYỆT TIN TUYỂN DỤNG</Link></li>
                  <li><Link to="/admin/dashboard" onClick={() => setShow(false)}>BẢNG ĐIỀU KHIỂN</Link></li>
                </>
              )}

              <li><NotificationBell /></li>
              <li>
                <Link to="/settings" onClick={() => setShow(false)} className="settings-icon" aria-label="Cài đặt tài khoản">
                  <FiSettings size={20} aria-hidden="true" />
                </Link>
              </li>
              <button onClick={handleLogout} aria-label="Đăng xuất khỏi tài khoản">Đăng xuất</button>
            </>
          )}
        </ul>

        <button
          className="hamburger"
          onClick={() => setShow(!show)}
          aria-label={show ? "Đóng menu" : "Mở menu"}
          aria-expanded={show}
        >
          {show ? <AiOutlineClose aria-hidden="true" /> : <GiHamburgerMenu aria-hidden="true" />}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;