import React, { useContext, useEffect, useState } from "react";
import { Context } from "../../main";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import "./Dashboard.css";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0, totalEmployers: 0, totalJobSeekers: 0,
    totalJobs: 0, pendingJobs: 0, approvedJobs: 0, rejectedJobs: 0,
  });
  const [users, setUsers] = useState([]);
  const [showUsers, setShowUsers] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user, isAuthorized } = useContext(Context);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthorized || user?.role !== "Admin") {
      navigate("/");
      return;
    }
    fetchStats();
  }, [isAuthorized, user]);

  const fetchStats = async () => {
    try {
      const { data } = await axios.get("http://localhost:5000/api/v1/admin/stats", { withCredentials: true });
      setStats(data.stats);
      setUsers(data.users || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể tải thống kê");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Đang tải...</div>;

  return (
    <section className="dashboard-page">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Bảng điều khiển Admin</h1>
        </div>

        <div className="stats-section">
          <h2>Thống kê tài khoản</h2>
          <div className="stats-grid">
            <div className="stat-card total clickable" onClick={() => setShowUsers(!showUsers)}>
              <div className="stat-content">
                <h3>Tổng tài khoản</h3>
                <p className="stat-number">{stats.totalUsers}</p>
              </div>
            </div>
            <div className="stat-card employers">
              <div className="stat-content">
                <h3>Nhà tuyển dụng</h3>
                <p className="stat-number">{stats.totalEmployers}</p>
              </div>
            </div>
            <div className="stat-card job-seekers">
              <div className="stat-content">
                <h3>Người tìm việc</h3>
                <p className="stat-number">{stats.totalJobSeekers}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="stats-section">
          <h2>Thống kê tin tuyển dụng</h2>
          <div className="stats-grid">
            <div className="stat-card total-jobs clickable" onClick={() => navigate("/job/getall")}>
              <div className="stat-content">
                <h3>Tổng tin tuyển dụng</h3>
                <p className="stat-number">{stats.totalJobs}</p>
              </div>
            </div>
            <div className="stat-card pending-jobs clickable" onClick={() => navigate("/admin/jobs")}>
              <div className="stat-content">
                <h3>Chờ duyệt</h3>
                <p className="stat-number">{stats.pendingJobs}</p>
              </div>
            </div>
            <div className="stat-card approved-jobs">
              <div className="stat-content">
                <h3>Đã duyệt</h3>
                <p className="stat-number">{stats.approvedJobs}</p>
              </div>
            </div>
            <div className="stat-card rejected-jobs">
              <div className="stat-content">
                <h3>Đã từ chối</h3>
                <p className="stat-number">{stats.rejectedJobs}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="quick-actions">
          <h2>Thao tác nhanh</h2>
          <div className="actions-grid">
            <button className="action-btn" onClick={() => navigate("/admin/jobs")}>
              Duyệt tin tuyển dụng
            </button>
          </div>
        </div>
      </div>

      {showUsers && (
        <div className="modal-overlay" onClick={() => setShowUsers(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Danh sách người dùng</h2>
              <button className="modal-close" onClick={() => setShowUsers(false)}>×</button>
            </div>
            <div className="users-table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Tên</th>
                    <th>Email</th>
                    <th>Vai trò</th>
                    <th>Ngày đăng ký</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id}>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.role}</td>
                      <td>{new Date(u.createdAt).toLocaleDateString("vi-VN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Dashboard;
