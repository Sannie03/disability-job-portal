import axios from "axios";
import { useContext, useState, useEffect } from "react";
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
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileError, setFileError] = useState("");

  const { isAuthorized, user } = useContext(Context);
  const navigateTo = useNavigate();
  const { id } = useParams();

  // Auto-fill email and phone from user account if registered normally (not Google)
  useEffect(() => {
    if (user && user.authProvider === "local") {
      if (user.name) setName(user.name);
      if (user.email) setEmail(user.email);
      if (user.phone) setPhone(user.phone);
    }
  }, [user]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFileError("");
    if (!file) return setResume(null);

    const allowed = ["image/png", "image/jpeg", "image/webp", "application/pdf", 
      "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    
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
    if (!resume) return setFileError("Vui lòng tải lên CV");

    setLoading(true);
    const loadingToast = toast.loading("Đang gửi...");

    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("phone", phone);
    formData.append("address", address);
    formData.append("disabilityType", disabilityType);
    formData.append("coverLetter", coverLetter);
    formData.append("resume", resume);
    formData.append("jobId", id);

    try {
      await axios.post("http://localhost:5000/api/v1/application/post", formData, {
        withCredentials: true,
      });

      const appliedJobs = JSON.parse(localStorage.getItem('appliedJobs') || '[]');
      if (!appliedJobs.includes(id)) {
        localStorage.setItem('appliedJobs', JSON.stringify([...appliedJobs, id]));
      }

      toast.dismiss(loadingToast);
      toast.success("Đã gửi đơn thành công!");
      navigateTo("/job/getall");
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthorized || (user && user.role === "Employer")) {
    navigateTo("/");
  }

  return (
    <section className="application accessible-form" aria-label="Form nộp đơn ứng tuyển">
      <div className="container">
        <h1 id="form-title">Nộp đơn ứng tuyển</h1>
        <form onSubmit={handleSubmit} aria-labelledby="form-title">
          <div className="form-group">
            <label htmlFor="applicant-name">Họ và tên *</label>
            <input
              id="applicant-name"
              type="text"
              placeholder="Nhập họ và tên"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              aria-required="true"
            />
          </div>

          <div className="form-group">
            <label htmlFor="applicant-email">Email *</label>
            <input
              id="applicant-email"
              type="email"
              placeholder="Nhập email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              readOnly={user?.authProvider === "local"}
              required
              aria-required="true"
            />
          </div>

          <div className="form-group">
            <label htmlFor="applicant-phone">Số điện thoại *</label>
            <input
              id="applicant-phone"
              type="tel"
              placeholder="Nhập số điện thoại"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              readOnly={user?.authProvider === "local"}
              required
              aria-required="true"
            />
          </div>

          <div className="form-group">
            <label htmlFor="applicant-address">Địa chỉ *</label>
            <input
              id="applicant-address"
              type="text"
              placeholder="Nhập địa chỉ"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              aria-required="true"
            />
          </div>

          <div className="form-group">
            <label htmlFor="disability-type">Loại khuyết tật *</label>
            <select
              id="disability-type"
              value={disabilityType}
              onChange={(e) => setDisabilityType(e.target.value)}
              required
              aria-required="true"
            >
              <option value="">-- Chọn loại khuyết tật --</option>
              <option value="Không có">Không có</option>
              <option value="Khiếm thị">Khiếm thị</option>
              <option value="Khiếm thính">Khiếm thính</option>
              <option value="Vận động">Khuyết tật vận động</option>
              <option value="Giao tiếp">Khuyết tật giao tiếp</option>
              <option value="Khác">Khác</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="cover-letter">Thư xin việc *</label>
            <textarea
              id="cover-letter"
              placeholder="Giới thiệu bản thân"
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              required
              aria-required="true"
              rows={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="resume-file">Tải lên CV *</label>
            <input
              id="resume-file"
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.pdf,.doc,.docx"
              onChange={handleFileChange}
              aria-required="true"
              aria-describedby={fileError ? "file-error" : "file-hint"}
              aria-invalid={fileError ? "true" : "false"}
            />
            <small id="file-hint" className="field-note">Hỗ trợ định dạng: PNG, JPEG, PDF, DOCX</small>
            {fileError && <p id="file-error" className="error-text" role="alert">{fileError}</p>}
          </div>

          <button type="submit" disabled={loading} aria-busy={loading}>
            {loading ? "Đang gửi..." : "Gửi đơn ứng tuyển"}
          </button>
        </form>
      </div>
    </section>
  );
};

export default Application;