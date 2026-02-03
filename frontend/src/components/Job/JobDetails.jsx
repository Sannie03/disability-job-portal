import { useContext, useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Context } from "../../main";
import toast from "react-hot-toast";
import "./JobDetails.css";

const JobDetails = () => {
  const { id } = useParams();
  const [job, setJob] = useState({});
  const navigate = useNavigate();
  const { isAuthorized, user } = useContext(Context);

  const handleApply = (e) => {
    if (!isAuthorized) {
      e.preventDefault();
      toast.error("Vui lòng đăng nhập để nộp đơn ứng tuyển");
      navigate("/login");
    }
  };

  useEffect(() => {
    axios.get(`http://localhost:5000/api/v1/job/${id}`, { withCredentials: true })
      .then((res) => setJob(res.data.job))
      .catch(() => navigate("/notfound"));
  }, []);

  const formatDate = (d) => d ? new Date(d).toLocaleDateString("vi-VN") : "";
  const formatSalary = (v) => v?.toLocaleString("vi-VN");

  // tạo text mô tả cho screen reader về loại khuyết tật được hỗ trợ
  const getDisabilityDescription = () => {
    if (!job.isDisabilityFriendly || !job.supportedDisabilities?.length) return "";
    return `Công việc này hỗ trợ người khuyết tật: ${job.supportedDisabilities.join(", ")}`;
  };

  return (
    <section className="jobDetail page" aria-label={`Chi tiết công việc: ${job.title}`}>
      <div className="container">
        {job.expired && (
          <div className="warning-box" role="alert" aria-live="polite">
            Tin tuyển dụng này đã hết hạn nộp hồ sơ
          </div>
        )}

        {/* Company Header - Full Width */}
        {job.postedBy && (
          <div className="company-header-card">
            <div className="company-header-content">
              <div className="company-logo-large">
                {(job.postedBy.companyInfo?.companyName || job.postedBy.name)?.charAt(0).toUpperCase()}
              </div>
              <div className="company-info-details">
                <h2 className="company-name-large">
                  {job.postedBy.companyInfo?.companyName || job.postedBy.name}
                </h2>
                <div className="company-meta-row">
                  {job.postedBy.companyInfo?.companySize && (
                    <span className="meta-badge">
                      {job.postedBy.companyInfo.companySize} nhân viên
                    </span>
                  )}
                  {job.postedBy.companyInfo?.address && (
                    <span className="meta-badge">
                      {job.postedBy.companyInfo.address}
                    </span>
                  )}
                </div>
              </div>
              {job.postedBy.companyInfo?.website && (
                <a
                  href={
                    job.postedBy.companyInfo.website.startsWith('http')
                      ? job.postedBy.companyInfo.website
                      : `https://${job.postedBy.companyInfo.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="company-website-link"
                >
                  🌐 Website
                </a>
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="job-detail-layout">
          {/* Left Column - Main Info */}
          <main className="job-main-column">
            {/* Job Title Card */}
            <div className="job-title-card">
              <div className="job-title-header">
                <h1 className="job-title-main">{job.title}</h1>
                <span className={`status-badge status-${job.status}`}>
                  {job.status === "approved" ? "✓ Đang tuyển" : "⏳ Chờ duyệt"}
                </span>
              </div>
              <div className="job-quick-info">
                <span className="quick-info-item">
                  <span className="info-icon">💼</span>
                  {job.category}
                </span>
                <span className="quick-info-item">
                  <span className="info-icon">📍</span>
                  {job.city}
                </span>
                <span className="quick-info-item">
                  <span className="info-icon">💰</span>
                  {job.fixedSalary
                    ? `${formatSalary(job.fixedSalary)} VNĐ`
                    : `${formatSalary(job.salaryFrom)} - ${formatSalary(job.salaryTo)} VNĐ`}
                </span>
                <span className="quick-info-item">
                  <span className="info-icon">📅</span>
                  Hạn: {formatDate(job.deadline)}
                </span>
              </div>
            </div>

            {/* Chi tiết công việc */}
            <div className="detail-card">
              <h2 className="detail-card-title">📋 Chi tiết tuyển dụng</h2>
              <div className="detail-grid">
                <div className="detail-item">
                  <div className="detail-label">Hình thức làm việc</div>
                  <div className="detail-value">{job.workMode}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Thời gian làm việc</div>
                  <div className="detail-value">
                    {job.isFlexibleTime ? "⏰ Linh hoạt" : `${job.workTime?.start} - ${job.workTime?.end}`}
                  </div>
                </div>
                <div className="detail-item full-width">
                  <div className="detail-label">Địa điểm làm việc</div>
                  <div className="detail-value">📍 {job.location}, {job.city}</div>
                </div>
              </div>
            </div>

            {/* Mô tả công việc */}
            <div className="detail-card">
              <h2 className="detail-card-title">📝 Mô tả công việc</h2>
              <div className="detail-content">
                {job.description}
              </div>
            </div>

            {/* Hỗ trợ NKT */}
            {job.isDisabilityFriendly && (
              <div className="detail-card disability-card">
                <h2 className="detail-card-title">♿ Hỗ trợ người khuyết tật</h2>
                <div className="disability-tags">
                  {job.supportedDisabilities?.map((d, i) => (
                    <span key={i} className="disability-tag-large">
                      ✓ {d}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Về công ty */}
            {job.postedBy?.companyInfo?.description && (
              <div className="detail-card">
                <h2 className="detail-card-title">🏢 Về công ty</h2>
                <div className="detail-content">
                  {job.postedBy.companyInfo.description}
                </div>
                <div className="company-contact-section">
                  <div className="contact-row">
                    <span className="contact-label">📧 Email:</span>
                    <a href={`mailto:${job.postedBy.email}`} className="contact-value">
                      {job.postedBy.email}
                    </a>
                  </div>
                  {job.postedBy.companyInfo?.website && (
                    <div className="contact-row">
                      <span className="contact-label">🌐 Website:</span>
                      <a
                        href={
                          job.postedBy.companyInfo.website.startsWith('http')
                            ? job.postedBy.companyInfo.website
                            : `https://${job.postedBy.companyInfo.website}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="contact-value"
                      >
                        {job.postedBy.companyInfo.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>

          {/* Right Column - Sticky Sidebar */}
          <aside className="job-sidebar-column">
            {/* Nút ứng tuyển sticky */}
            {(!user || user.role !== "Employer") && !job.expired && job.status === "approved" && (
              <div className="apply-card sticky-card">
                <Link
                  to={`/application/${job._id}`}
                  className="apply-btn-large"
                  onClick={handleApply}
                >
                  <span className="btn-icon">📄</span>
                  Nộp đơn ứng tuyển
                </Link>
                <p className="apply-note">Miễn phí, nhanh chóng</p>
              </div>
            )}

            {/* Thông tin tóm tắt */}
            <div className="summary-card">
              <h3 className="summary-title">Thông tin chung</h3>
              <div className="summary-list">
                <div className="summary-item">
                  <div className="summary-icon">💰</div>
                  <div className="summary-content">
                    <div className="summary-label">Mức lương</div>
                    <div className="summary-value">
                      {job.fixedSalary
                        ? `${formatSalary(job.fixedSalary)} VNĐ`
                        : `${formatSalary(job.salaryFrom)} - ${formatSalary(job.salaryTo)} VNĐ`}
                    </div>
                  </div>
                </div>
                <div className="summary-item">
                  <div className="summary-icon">📅</div>
                  <div className="summary-content">
                    <div className="summary-label">Hạn nộp hồ sơ</div>
                    <div className="summary-value">{formatDate(job.deadline)}</div>
                  </div>
                </div>
                <div className="summary-item">
                  <div className="summary-icon">💼</div>
                  <div className="summary-content">
                    <div className="summary-label">Danh mục</div>
                    <div className="summary-value">{job.category}</div>
                  </div>
                </div>
                <div className="summary-item">
                  <div className="summary-icon">🏠</div>
                  <div className="summary-content">
                    <div className="summary-label">Hình thức</div>
                    <div className="summary-value">{job.workMode}</div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default JobDetails;
