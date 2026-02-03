import React, { useContext, useState } from "react";
import { FaRegUser } from "react-icons/fa";
import { MdOutlineMailOutline } from "react-icons/md";
import { RiLock2Fill } from "react-icons/ri";
import { FaPencilAlt } from "react-icons/fa";
import { FaPhoneFlip } from "react-icons/fa6";
import { Link, Navigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { Context } from "../../main";

const Register = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");

  const { isAuthorized, setIsAuthorized, user, setUser } = useContext(Context);

  const handleRegister = async (e) => {
    e.preventDefault();

    const cleanPhone = phone.replace(/\D/g, "");

    if (!name || !email || !password || !role || !cleanPhone) {
      toast.error("Vui lòng điền đầy đủ thông tin!");
      return;
    }

    if (cleanPhone.length !== 10) {
      toast.error("Số điện thoại phải gồm 10 số.");
      return;
    }

    if (password.length < 8) {
      toast.error("Mật khẩu phải ít nhất 8 ký tự.");
      return;
    }

    try {
      const { data } = await axios.post(
        "http://localhost:5000/api/v1/user/register",
        { name, phone: cleanPhone, email, role, password },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );

      toast.success(data.message);
      setUser(data.user);
      setIsAuthorized(true);
      setName("");
      setEmail("");
      setPassword("");
      setPhone("");
      setRole("");
    } catch (error) {
      const message = error?.response?.data?.message || "Đăng ký thất bại. Vui lòng thử lại.";
      toast.error(message);
    }
  };

  if(isAuthorized){
    return <Navigate to={'/'}/>
  }


  return (
    <>
      <section className="authPage">
        <div className="container">
          <div className="header">
            <img src="/careerconnect-black.png" alt="logo" />
            <h3>Tạo tài khoản mới</h3>
          </div>
          <form>
            <div className="inputTag">
              <label>Đăng ký như</label>
              <div>
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="">Chọn vai trò</option>
                  <option value="Employer">Nhà tuyển dụng</option>
                  <option value="Job Seeker">Người tìm việc</option>
                </select>
                <FaRegUser />
              </div>
            </div>
            <div className="inputTag">
              <label>Tên</label>
              <div>
                <input
                  type="text"
                  placeholder="Nhập tên của bạn"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <FaPencilAlt />
              </div>
            </div>
            <div className="inputTag">
              <label>Địa chỉ email</label>
              <div>
                <input
                  type="email"
                  placeholder="Nhập địa chỉ email của bạn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <MdOutlineMailOutline />
              </div>
            </div>
            <div className="inputTag">
              <label>Số điện thoại</label>
              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  placeholder="Nhập số điện thoại"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                />
                <FaPhoneFlip />
              </div>
            </div>
            <div className="inputTag">
              <label>Mật khẩu</label>
              <div>
                <input
                  type="password"
                  placeholder="Nhập mật khẩu của bạn"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <RiLock2Fill />
              </div>
            </div>
            <button type="submit" onClick={handleRegister}>
              Đăng ký
            </button>
            <Link to={"/login"}>Đăng nhập ngay</Link>
          </form>
        </div>
        <div className="banner">
          <img src="/register.png" alt="login" />
        </div>
      </section>
    </>
  );
};

export default Register;
