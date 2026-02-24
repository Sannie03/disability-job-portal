import { useContext, useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api from "../../utils/api";
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
    api
      .get(`/job/${id}`)
      .then((res) => setJob(res.data.job))
      .catch(() => navigate("/notfound"));
  }, []);

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString("vi-VN") : "");
  const formatSalary = (v) => v?.toLocaleString("vi-VN");

  const salary = job.fixedSalary
    ? `${formatSalary(job.fixedSalary)} VNĐ`
    : `${formatSalary(job.salaryFrom)} – ${formatSalary(job.salaryTo)} VNĐ`;

  const companyName = job.postedBy?.companyInfo?.companyName || job.postedBy?.name;

  return (
    <section className="jd-page" aria-label={`Chi tiết: ${job.title}`}>
      <div className="jd-wrap">

        {job.expired && (
          <div className="jd-expired" role="alert">
            Tin tuyển dụng này đã hết hạn nộp hồ sơ
          </div>
        )}

        {/* ===== Header ===== */}
        <header className="jd-header">
          <div className="jd-header-left">
            {job.postedBy && (
              <span className="jd-company-name">{companyName}</span>
            )}
            <h1 className="jd-title">{job.title}</h1>
            <div className="jd-quick-tags">
              {job.category && <span className="qt qt-cat">{job.category}</span>}
              {job.city && <span className="qt qt-loc">{job.city}</span>}
              {job.workMode && (
                <span className="qt qt-mode">
                  {job.workMode === "Online" ? "Từ xa" : job.workMode === "Offline" ? "Tại văn phòng" : "Kết hợp"}
                </span>
              )}
            </div>
            {job.isDisabilityFriendly && job.supportedDisabilities?.length > 0 && (
              <div className="jd-nkt-row">
                <span className="jd-nkt-label">Hỗ trợ NKT:</span>
                {job.supportedDisabilities.map((d, i) => (
                  <span key={i} className="jd-nkt-tag">{d}</span>
                ))}
              </div>
            )}
          </div>

          <div className="jd-header-right">
            <div className="jd-salary">{salary}</div>
            {job.status && job.status !== "approved" && (
              <span className="jd-status-pending">Chờ duyệt</span>
            )}
            {(!user || user.role !== "Employer") && !job.expired && job.status === "approved" && (
              <Link to={`/application/${job._id}`} className="jd-btn-apply" onClick={handleApply}>
                Ứng tuyển ngay
              </Link>
            )}
          </div>
        </header>

        <div className="jd-content">

          {/* Chi tiết tuyển dụng */}
          <div className="jd-block">
            <h2>Chi tiết tuyển dụng</h2>
            <div className="jd-details-grid">
              <div className="jd-detail">
                <span className="jd-detail-label">Địa điểm</span>
                <span className="jd-detail-value">{job.location}{job.city ? `, ${job.city}` : ""}</span>
              </div>
              <div className="jd-detail">
                <span className="jd-detail-label">Hình thức</span>
                <span className="jd-detail-value">
                  {job.workMode === "Online" ? "Làm việc từ xa" : job.workMode === "Offline" ? "Tại văn phòng" : "Kết hợp (Hybrid)"}
                </span>
              </div>
              <div className="jd-detail">
                <span className="jd-detail-label">Thời gian</span>
                <span className="jd-detail-value">
                  {job.isFlexibleTime ? "Linh hoạt" : `${job.workTime?.start} – ${job.workTime?.end}`}
                </span>
              </div>
              <div className="jd-detail">
                <span className="jd-detail-label">Hạn nộp</span>
                <span className="jd-detail-value">{formatDate(job.deadline)}</span>
              </div>
              {job.jobPostedOn && (
                <div className="jd-detail">
                  <span className="jd-detail-label">Ngày đăng</span>
                  <span className="jd-detail-value">{formatDate(job.jobPostedOn)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Mô tả */}
          <div className="jd-block">
            <h2>Mô tả công việc</h2>
            <div className="jd-prose">{job.description}</div>
          </div>

          {/* Về nhà tuyển dụng */}
          {job.postedBy && (
            <div className="jd-block">
              <h2>Về nhà tuyển dụng</h2>
              <div className="jd-employer-block">
                <div className="jd-avatar">
                  {companyName?.charAt(0).toUpperCase()}
                </div>
                <div className="jd-employer-info">
                  <span className="jd-employer-name">{companyName}</span>
                  <div className="jd-employer-meta">
                    {job.postedBy.companyInfo?.companySize && (
                      <span>{job.postedBy.companyInfo.companySize} nhân viên</span>
                    )}
                    {job.postedBy.companyInfo?.address && (
                      <span>{job.postedBy.companyInfo.address}</span>
                    )}
                  </div>
                </div>
              </div>
              {job.postedBy.companyInfo?.description && (
                <div className="jd-prose jd-employer-desc">{job.postedBy.companyInfo.description}</div>
              )}
              <div className="jd-contacts">
                <div className="jd-contact">
                  <span className="jd-contact-label">Email</span>
                  <a href={`mailto:${job.postedBy.email}`}>{job.postedBy.email}</a>
                </div>
                {job.postedBy.companyInfo?.website && (
                  <div className="jd-contact">
                    <span className="jd-contact-label">Website</span>
                    <a
                      href={
                        job.postedBy.companyInfo.website.startsWith("http")
                          ? job.postedBy.companyInfo.website
                          : `https://${job.postedBy.companyInfo.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {job.postedBy.companyInfo.website}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default JobDetails;
