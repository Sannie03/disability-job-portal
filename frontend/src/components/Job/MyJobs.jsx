import api from "../../utils/api";
import { useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaCheck } from "react-icons/fa6";
import { RxCross2 } from "react-icons/rx";
import { Context } from "../../main";
import { useNavigate } from "react-router-dom";
import "./MyJobs.css";

const CATEGORIES = [
  { value: "Nhập liệu", label: "Nhập liệu" },
  { value: "Frontend", label: "Frontend" },
  { value: "Backend", label: "Backend" },
  { value: "UI/UX", label: "UI/UX" },
  { value: "Thiết kế đồ họa", label: "Thiết kế đồ họa" },
  { value: "Kế toán", label: "Kế toán" },
  { value: "Marketing", label: "Marketing" },
  { value: "Khác", label: "Khác" },
];

const WORK_MODES = ["Online", "Offline", "Hybrid"];
const DISABILITIES = ["Khiếm thị", "Khiếm thính", "Vận động"];

const MyJobs = () => {
  const [myJobs, setMyJobs] = useState([]);
  const [editingMode, setEditingMode] = useState(null); // job._id đang được edit
  const { isAuthorized, user } = useContext(Context);
  const navigate = useNavigate();

  // redirect nếu không phải employer
  useEffect(() => {
    if (!isAuthorized || (user && user.role !== "Employer")) {
      navigate("/");
    }
  }, [isAuthorized, user, navigate]);

  // fetch danh sách job của employer
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const { data } = await api.get("/job/getmyjobs");
        // normalize salaryType để dùng trong form
        const normalized = (data.myJobs || []).map((job) => ({
          ...job,
          salaryType: job.fixedSalary ? "fixed" : "range",
        }));
        setMyJobs(normalized);
      } catch (error) {
        toast.error(error.response?.data?.message || "Lỗi tải dữ liệu");
        setMyJobs([]);
      }
    };
    fetchJobs();
  }, []);

  // cập nhật job
  const handleUpdateJob = async (jobId) => {
    const job = myJobs.find((j) => j._id === jobId);
    if (!job) return;

    const payload = {
      title: job.title,
      category: job.category,
      city: job.city,
      location: job.location,
      description: job.description,
      workMode: job.workMode,
      isFlexibleTime: !!job.isFlexibleTime,
      workTime: job.isFlexibleTime
        ? null
        : { start: job.workTime?.start || "", end: job.workTime?.end || "" },
      deadline: job.deadline,
      isDisabilityFriendly: !!job.isDisabilityFriendly,
      supportedDisabilities: job.supportedDisabilities || [],
      expired: !!job.expired,
    };

    // chỉ gửi 1 loại salary để tránh conflict trên backend
    if (job.salaryType === "fixed") {
      payload.fixedSalary = Number(job.fixedSalary) || 0;
      payload.salaryFrom = "";
      payload.salaryTo = "";
    } else {
      payload.fixedSalary = "";
      payload.salaryFrom = Number(job.salaryFrom) || 0;
      payload.salaryTo = Number(job.salaryTo) || 0;
    }

    try {
      const res = await api.put(
        `/job/update/${jobId}`,
        payload
      );
      toast.success(res.data.message);
      if (res.data.job) {
        setMyJobs((prev) =>
          prev.map((j) =>
            j._id === jobId
              ? { ...res.data.job, salaryType: res.data.job.fixedSalary ? "fixed" : "range" }
              : j
          )
        );
      }
      setEditingMode(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Cập nhật thất bại");
    }
  };

  const handleDeleteJob = async (jobId) => {
    try {
      const res = await api.delete(`/job/delete/${jobId}`);
      toast.success(res.data.message);
      setMyJobs((prev) => prev.filter((job) => job._id !== jobId));
    } catch (error) {
      toast.error(error.response?.data?.message || "Xóa thất bại");
    }
  };

  // handle input thay đổi, xử lý riêng cho các field boolean
  const handleInputChange = (jobId, field, value) => {
    setMyJobs((prev) =>
      prev.map((job) => {
        if (job._id !== jobId) return job;
        if (field === "expired") return { ...job, [field]: value === "true" };
        if (field === "isFlexibleTime" || field === "isDisabilityFriendly") {
          return { ...job, [field]: !!value };
        }
        return { ...job, [field]: value };
      })
    );
  };

  const handleWorkTimeChange = (jobId, key, value) => {
    setMyJobs((prev) =>
      prev.map((job) =>
        job._id === jobId
          ? { ...job, workTime: { ...(job.workTime || {}), [key]: value } }
          : job
      )
    );
  };

  const toggleDisability = (jobId, value) => {
    setMyJobs((prev) =>
      prev.map((job) => {
        if (job._id !== jobId) return job;
        const current = job.supportedDisabilities || [];
        const next = current.includes(value)
          ? current.filter((d) => d !== value)
          : [...current, value];
        return { ...job, supportedDisabilities: next };
      })
    );
  };

  // switch giữa lương cố định và khoảng lương
  const handleSalaryTypeChange = (jobId, type) => {
    setMyJobs((prev) =>
      prev.map((job) =>
        job._id === jobId
          ? {
              ...job,
              salaryType: type,
              fixedSalary: type === "fixed" ? job.fixedSalary || "" : "",
              salaryFrom: type === "range" ? job.salaryFrom || "" : "",
              salaryTo: type === "range" ? job.salaryTo || "" : "",
            }
          : job
      )
    );
  };

  const formatDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  };

  const formatSalary = (val) => {
    if (!val) return "";
    return Number(val).toLocaleString("vi-VN");
  };

  return (
    <div className="myjobs-page">
      <div className="myjobs-container">
        <header className="myjobs-header">
          <h1 className="myjobs-title">Công việc của tôi</h1>
          <p className="myjobs-subtitle">Quản lý các tin tuyển dụng đã đăng</p>
        </header>

        <div className="myjobs-list">
          {myJobs.length > 0 ? (
            myJobs.map((job) => {
              const isEditing = editingMode === job._id;
              return (
                <article key={job._id} className={`job-card ${isEditing ? "editing" : ""}`}>
                  {/* Header */}
                  <div className="job-card-header">
                    <h3 className="job-card-title">{job.title || "Chưa có tiêu đề"}</h3>
                    <span className={`job-badge ${job.expired ? "expired" : "active"}`}>
                      {job.expired ? "Hết hạn" : "Hoạt động"}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="job-card-body">
                    <div className="field-grid">
                      <div className="field-group full-width">
                        <label className="field-label">Tiêu đề</label>
                        <input
                          type="text"
                          className="field-input"
                          disabled={!isEditing}
                          value={job.title || ""}
                          onChange={(e) => handleInputChange(job._id, "title", e.target.value)}
                        />
                      </div>

                      <div className="field-group">
                        <label className="field-label">Thành phố</label>
                        <input
                          type="text"
                          className="field-input"
                          disabled={!isEditing}
                          value={job.city || ""}
                          onChange={(e) => handleInputChange(job._id, "city", e.target.value)}
                        />
                      </div>

                      <div className="field-group">
                        <label className="field-label">Hình thức</label>
                        <select
                          className="field-select"
                          disabled={!isEditing}
                          value={job.workMode || ""}
                          onChange={(e) => handleInputChange(job._id, "workMode", e.target.value)}
                        >
                          <option value="">Chọn</option>
                          {WORK_MODES.map((mode) => (
                            <option key={mode} value={mode}>{mode}</option>
                          ))}
                        </select>
                      </div>

                      <div className="field-group">
                        <label className="field-label">Danh mục</label>
                        <select
                          className="field-select"
                          disabled={!isEditing}
                          value={job.category || ""}
                          onChange={(e) => handleInputChange(job._id, "category", e.target.value)}
                        >
                          <option value="">Chọn</option>
                          {CATEGORIES.map((cat) => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                          {job.category && !CATEGORIES.find(c => c.value === job.category) && (
                            <option value={job.category}>{job.category}</option>
                          )}
                        </select>
                      </div>

                      <div className="field-group">
                        <label className="field-label">Trạng thái</label>
                        <select
                          className="field-select"
                          disabled={!isEditing}
                          value={String(job.expired)}
                          onChange={(e) => handleInputChange(job._id, "expired", e.target.value)}
                        >
                          <option value="false">Hoạt động</option>
                          <option value="true">Hết hạn</option>
                        </select>
                      </div>

                      <div className="field-group">
                        <label className="field-label">Hạn nộp</label>
                        <input
                          type="date"
                          className="field-input"
                          disabled={!isEditing}
                          value={formatDate(job.deadline)}
                          onChange={(e) => handleInputChange(job._id, "deadline", e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Salary */}
                    <div className="job-section">
                      <h4 className="job-section-title">Lương</h4>
                      <div className="radio-group">
                        <label className="radio-label">
                          <input
                            type="radio"
                            className="radio-input"
                            disabled={!isEditing}
                            checked={job.salaryType === "fixed"}
                            onChange={() => handleSalaryTypeChange(job._id, "fixed")}
                          />
                          Cố định
                        </label>
                        <label className="radio-label">
                          <input
                            type="radio"
                            className="radio-input"
                            disabled={!isEditing}
                            checked={job.salaryType === "range"}
                            onChange={() => handleSalaryTypeChange(job._id, "range")}
                          />
                          Khoảng
                        </label>
                      </div>
                      {job.salaryType === "fixed" ? (
                        <div className="inline-inputs">
                          <input
                            type="number"
                            className="field-input"
                            disabled={!isEditing}
                            placeholder="VND"
                            value={job.fixedSalary || ""}
                            onChange={(e) => handleInputChange(job._id, "fixedSalary", e.target.value)}
                          />
                          <span className="separator">VNĐ</span>
                          {!isEditing && job.fixedSalary && (
                            <span className="separator">({formatSalary(job.fixedSalary)})</span>
                          )}
                        </div>
                      ) : (
                        <div className="inline-inputs">
                          <input
                            type="number"
                            className="field-input"
                            disabled={!isEditing}
                            placeholder="Từ"
                            value={job.salaryFrom || ""}
                            onChange={(e) => handleInputChange(job._id, "salaryFrom", e.target.value)}
                          />
                          <span className="separator">—</span>
                          <input
                            type="number"
                            className="field-input"
                            disabled={!isEditing}
                            placeholder="Đến"
                            value={job.salaryTo || ""}
                            onChange={(e) => handleInputChange(job._id, "salaryTo", e.target.value)}
                          />
                          <span className="separator">VNĐ</span>
                          {!isEditing && job.salaryFrom && job.salaryTo && (
                            <span className="separator">({formatSalary(job.salaryFrom)} - {formatSalary(job.salaryTo)})</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Work Time */}
                    <div className="job-section">
                      <h4 className="job-section-title">Thời gian</h4>
                      <div className="checkbox-row">
                        <input
                          type="checkbox"
                          className="checkbox-input"
                          id={`flex-${job._id}`}
                          disabled={!isEditing}
                          checked={!!job.isFlexibleTime}
                          onChange={(e) => handleInputChange(job._id, "isFlexibleTime", e.target.checked)}
                        />
                        <label className="checkbox-label" htmlFor={`flex-${job._id}`}>
                          Linh hoạt
                        </label>
                      </div>
                      {!job.isFlexibleTime && (
                        <div className="inline-inputs">
                          <input
                            type="time"
                            className="field-input"
                            disabled={!isEditing}
                            value={job.workTime?.start || ""}
                            onChange={(e) => handleWorkTimeChange(job._id, "start", e.target.value)}
                          />
                          <span className="separator">-</span>
                          <input
                            type="time"
                            className="field-input"
                            disabled={!isEditing}
                            value={job.workTime?.end || ""}
                            onChange={(e) => handleWorkTimeChange(job._id, "end", e.target.value)}
                          />
                        </div>
                      )}
                    </div>

                    {/* Disability */}
                    <div className="job-section">
                      <h4 className="job-section-title">Khuyết tật</h4>
                      <div className="checkbox-row">
                        <input
                          type="checkbox"
                          className="checkbox-input"
                          id={`dis-${job._id}`}
                          disabled={!isEditing}
                          checked={!!job.isDisabilityFriendly}
                          onChange={(e) => handleInputChange(job._id, "isDisabilityFriendly", e.target.checked)}
                        />
                        <label className="checkbox-label" htmlFor={`dis-${job._id}`}>
                          Hỗ trợ
                        </label>
                      </div>
                      {job.isDisabilityFriendly && (
                        <div className="disability-tags">
                          {DISABILITIES.map((d) => {
                            const isActive = (job.supportedDisabilities || []).includes(d);
                            return (
                              <span
                                key={d}
                                className={`disability-tag ${isActive ? "active" : ""} ${!isEditing ? "disabled" : ""}`}
                                onClick={() => isEditing && toggleDisability(job._id, d)}
                              >
                                {isActive && <FaCheck size={8} />}
                                {d}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Description - chỉ hiển thị khi editing */}
                    {isEditing && (
                      <>
                        <div className="job-section">
                          <h4 className="job-section-title">Mô tả</h4>
                          <textarea
                            className="field-textarea"
                            value={job.description || ""}
                            onChange={(e) => handleInputChange(job._id, "description", e.target.value)}
                            placeholder="Mô tả công việc..."
                          />
                        </div>

                        <div className="job-section">
                          <h4 className="job-section-title">Địa chỉ</h4>
                          <textarea
                            className="field-textarea"
                            value={job.location || ""}
                            onChange={(e) => handleInputChange(job._id, "location", e.target.value)}
                            placeholder="Địa chỉ làm việc..."
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="job-card-footer">
                    {isEditing ? (
                      <>
                        <button className="btn btn-cancel" onClick={() => setEditingMode(null)}>
                          <RxCross2 size={12} />
                          Hủy
                        </button>
                        <button className="btn btn-save" onClick={() => handleUpdateJob(job._id)}>
                          <FaCheck size={10} />
                          Lưu
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn-delete" onClick={() => handleDeleteJob(job._id)}>
                          Xóa
                        </button>
                        <button className="btn btn-edit" onClick={() => setEditingMode(job._id)}>
                          Sửa
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="empty-state">
              <p className="empty-state-text">
                Bạn chưa đăng công việc nào.<br />
                Hãy tạo tin tuyển dụng đầu tiên!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyJobs;