import React, { useContext, useState, useEffect } from "react";
import { Context } from "../../main";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import toast from "react-hot-toast";
import "./Settings.css";

const Settings = () => {
  const { user, isAuthorized, setUser } = useContext(Context);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    // Company info fields for Employer
    companyName: "",
    companySize: "",
    website: "",
    address: "",
    description: "",
  });

  const [loading, setLoading] = useState(false);

  // load thông tin user vào form khi mount
  useEffect(() => {
    if (!isAuthorized) {
      navigate("/login");
      return;
    }

    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        companyName: user.companyInfo?.companyName || "",
        companySize: user.companyInfo?.companySize || "",
        website: user.companyInfo?.website || "",
        address: user.companyInfo?.address || "",
        description: user.companyInfo?.description || "",
      });
    }
  }, [isAuthorized, user, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // validate mật khẩu nếu user muốn đổi
    if (formData.newPassword) {
      if (formData.newPassword !== formData.confirmPassword) {
        return toast.error("Mật khẩu mới không khớp");
      }
      if (user?.authProvider === "local" && !formData.currentPassword) {
        return toast.error("Vui lòng nhập mật khẩu hiện tại");
      }
    }

    try {
      setLoading(true);
      const updateData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
      };

      // thêm company info nếu là Employer
      if (user.role === "Employer") {
        updateData.companyInfo = {
          companyName: formData.companyName,
          companySize: formData.companySize,
          website: formData.website,
          address: formData.address,
          description: formData.description,
        };
      }

      // chỉ gửi password nếu user muốn đổi
      if (formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }

      const { data } = await api.put(
        "/user/update",
        updateData
      );

      toast.success(data.message);
      setUser(data.user);

      // reset password fields sau khi update thành công
      setFormData({
        ...formData,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Cập nhật thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="settings-page">
      <div className="settings-container">
        <div className="settings-header">
          <h1>Cài đặt tài khoản</h1>
          <p>Cập nhật thông tin cá nhân và mật khẩu của bạn</p>
        </div>

        <form className="settings-form" onSubmit={handleSubmit}>
          {/* Personal Info Section */}
          <div className="form-section">
            <h2>Thông tin cá nhân</h2>

            <div className="form-group">
              <label htmlFor="name">Tên</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Số điện thoại</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="0123456789"
              />
            </div>
          </div>

          {/* Company Info Section - Only for Employer */}
          {user?.role === "Employer" && (
            <div className="form-section">
              <h2>Thông tin công ty</h2>
              <p className="section-description">
                Thông tin này sẽ hiển thị trên các tin tuyển dụng của bạn
              </p>

              <div className="form-group">
                <label htmlFor="companyName">Tên công ty</label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="VD: Công ty TNHH ABC"
                />
              </div>

              <div className="form-group">
                <label htmlFor="companySize">Quy mô công ty</label>
                <select
                  id="companySize"
                  name="companySize"
                  value={formData.companySize}
                  onChange={handleChange}
                >
                  <option value="">Chọn quy mô</option>
                  <option value="1-10">1-10 nhân viên</option>
                  <option value="11-50">11-50 nhân viên</option>
                  <option value="51-200">51-200 nhân viên</option>
                  <option value="201-500">201-500 nhân viên</option>
                  <option value="500+">Trên 500 nhân viên</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="website">Website công ty</label>
                <input
                  type="url"
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://example.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="address">Địa chỉ công ty</label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Số nhà, đường, quận/huyện, thành phố"
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Mô tả về công ty</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="5"
                  placeholder="Giới thiệu về công ty, lĩnh vực hoạt động, văn hóa làm việc..."
                  maxLength="1000"
                />
                <small className="char-count">
                  {formData.description.length}/1000 ký tự
                </small>
              </div>
            </div>
          )}

          {/* Password Section */}
          {user?.authProvider === "local" ? (
            <div className="form-section">
              <h2>Đổi mật khẩu</h2>
              <p className="section-description">
                Để đổi mật khẩu, vui lòng nhập mật khẩu hiện tại và mật khẩu
                mới
              </p>

              <div className="form-group">
                <label htmlFor="currentPassword">Mật khẩu hiện tại</label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">Mật khẩu mới</label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  minLength="8"
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  minLength="8"
                />
              </div>
            </div>
          ) : (
            <div className="form-section info-box">
              <h2>Đổi mật khẩu</h2>
              <p>
                Bạn đang đăng nhập bằng Google. Không thể thay đổi mật khẩu.
              </p>
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={() => navigate(-1)}
            >
              Hủy
            </button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default Settings;
