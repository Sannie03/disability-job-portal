import api from "../../utils/api";
import { DISABILITY_OPTIONS } from "../../utils/constants";
import { useContext, useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { Context } from "../../main";
import "./Application.css";

const Application = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [disabilityType, setDisabilityType] = useState("");
  const [customDisability, setCustomDisability] = useState("");
  const [requestASL, setRequestASL] = useState(false);
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileError, setFileError] = useState("");
  const [jobInfo, setJobInfo] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const submittingRef = useRef(false);

  const { isAuthorized, user } = useContext(Context);
  const navigateTo = useNavigate();
  const { id } = useParams();

  // Gộp check auth + check job vào 1 useEffect để tránh race condition
  useEffect(() => {
    if (!isAuthorized || (user && user.role === "Employer")) {
      navigateTo("/");
      return;
    }
    // Chờ user load xong (user = null lúc đầu)
    if (!user) return;

    const checkJob = api.get(`/job/${id}`);
    const checkAppliedReq = api.get(`/application/check/${id}`).catch((err) => {
      console.warn("[Application] checkApplied failed:", err.response?.status, err.response?.data || err.message);
      return { data: { applied: false } };
    });

    Promise.all([checkJob, checkAppliedReq])
      .then(([jobRes, appliedRes]) => {
        const job = jobRes.data.job;
        if (appliedRes.data.applied) {
          toast.error("Bạn đã nộp đơn cho công việc này rồi!");
          navigateTo(`/job/${id}`);
        } else if (job.expired) {
          toast.error("Công việc này đã hết hạn nộp hồ sơ!");
          navigateTo(`/job/${id}`);
        } else if (job.status !== "approved") {
          toast.error("Công việc này chưa được duyệt!");
          navigateTo(`/job/${id}`);
        } else {
          setJobInfo(job);
        }
      })
      .catch(() => {
        toast.error("Không tìm thấy công việc!");
        navigateTo("/job/getall");
      })
      .finally(() => setPageLoading(false));
  }, [id, isAuthorized, user, navigateTo]);

  useEffect(() => {
    if (user) {
      if (user.name) setName(user.name);
      if (user.email) setEmail(user.email);
      if (user.phone) setPhone(user.phone);
      if (user.disabilityType) {
        if (user.disabilityType === "Khác") {
          setDisabilityType("Khác");
          setCustomDisability(user.customDisabilityDetail || "");
        } else {
          setDisabilityType(user.disabilityType);
        }
      }
    }
  }, [user]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFileError("");
    if (!file) return setResume(null);

    const allowed = [
      "image/png",
      "image/jpeg",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowed.includes(file.type)) {
      setFileError("Chỉ hỗ trợ: PNG, JPEG, WEBP, PDF, DOCX");
      return setResume(null);
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileError("Tệp phải nhỏ hơn 5MB");
      return setResume(null);
    }
    setResume(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Chặn double-submit bằng ref (synchronous, không bị React batching delay)
    if (submittingRef.current) return;
    if (!resume) return setFileError("Vui lòng tải lên CV");
    if (!/^0\d{9}$/.test(phone)) {
      return toast.error("Số điện thoại phải có 10 chữ số và bắt đầu bằng số 0!");
    }
    if (disabilityType === "Khác" && !customDisability.trim()) {
      return toast.error("Vui lòng nhập loại khuyết tật của bạn.");
    }

    submittingRef.current = true;
    setLoading(true);
    const loadingToast = toast.loading("Đang gửi...");

    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("email", email.trim());
    formData.append("phone", phone.trim());
    formData.append("address", address.trim());
    // Chỉ gửi disabilityType khi có giá trị (không gửi chuỗi rỗng)
    const finalDisability = disabilityType === "Khác" ? customDisability.trim() : disabilityType;
    if (finalDisability) {
      formData.append("disabilityType", finalDisability);
    }
    formData.append("coverLetter", coverLetter.trim());
    formData.append("resume", resume);
    formData.append("jobId", id);
    formData.append("requestASL", requestASL);

    try {
      await api.post("/application/post", formData);

      const appliedJobs = JSON.parse(localStorage.getItem("appliedJobs") || "[]");
      if (!appliedJobs.includes(id)) {
        localStorage.setItem("appliedJobs", JSON.stringify([...appliedJobs, id]));
      }

      toast.dismiss(loadingToast);
      toast.success("Đã gửi đơn thành công!");
      navigateTo("/job/getall");
    } catch (error) {
      toast.dismiss(loadingToast);
      const msg = error.response?.data?.message || "Có lỗi xảy ra";
      toast.error(msg);
      // Nếu lỗi duplicate → redirect về job details (tránh submit lại)
      if (msg.includes("đã nộp đơn")) {
        navigateTo(`/job/${id}`);
      }
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <section className="application">
        <div className="container">
          <p style={{ textAlign: "center", padding: "40px 0" }}>Đang tải...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="application" aria-label="Form nộp đơn ứng tuyển">
      <div className="container">
        <h3>Nộp đơn ứng tuyển</h3>
        {jobInfo && (
          <p className="form-desc">
            Vị trí: <strong>{jobInfo.title}</strong>
          </p>
        )}

        <form onSubmit={handleSubmit} className="form-section">
          <div className="field-row">
            <div className="field-group">
              <label className="field-label">Họ và tên</label>
              <input
                type="text"
                placeholder="Nhập họ và tên"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
            <div className="field-group">
              <label className="field-label">Email</label>
              <input
                type="email"
                placeholder="Nhập email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>
          <div className="field-row">
            <div className="field-group">
              <label className="field-label">Số điện thoại</label>
              <input
                type="tel"
                placeholder="Nhập số điện thoại"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoComplete="tel"
              />
            </div>
            <div className="field-group">
              <label className="field-label">Địa chỉ</label>
              <input
                type="text"
                placeholder="Nhập địa chỉ"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                autoComplete="street-address"
              />
            </div>
          </div>
          <div className="field-row">
            <div className="field-group">
              <label className="field-label">Loại khuyết tật</label>
              <select
                value={disabilityType}
                onChange={(e) => {
                  setDisabilityType(e.target.value);
                  if (e.target.value !== "Khác") setCustomDisability("");
                }}
              >
                <option value="">Không có</option>
                {DISABILITY_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              {disabilityType === "Khác" && (
                <input
                  type="text"
                  placeholder="Nhập loại khuyết tật"
                  value={customDisability}
                  onChange={(e) => setCustomDisability(e.target.value)}
                  required
                  style={{ marginTop: 8 }}
                />
              )}
            </div>
            <div className="field-group">
              <label className="field-label">Tải lên CV</label>
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.pdf,.doc,.docx"
                onChange={handleFileChange}
              />
              <span className="field-note">PNG, JPEG, PDF, DOCX — tối đa 5MB</span>
              {fileError && (
                <p className="error-text">{fileError}</p>
              )}
            </div>
          </div>
          {disabilityType && (
            <div className="field-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={requestASL}
                  onChange={(e) => setRequestASL(e.target.checked)}
                />
                Yêu cầu phỏng vấn bằng ngôn ngữ ký hiệu (ASL)
              </label>
            </div>
          )}
          <div className="field-group">
            <label className="field-label">Thư xin việc</label>
            <textarea
              placeholder="Giới thiệu bản thân, kinh nghiệm và lý do ứng tuyển..."
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              required
              rows={6}
            />
          </div>
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Đang gửi..." : "Gửi đơn ứng tuyển"}
          </button>
        </form>
      </div>
    </section>
  );
};

export default Application;
