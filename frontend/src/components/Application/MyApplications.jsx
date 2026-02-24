import { useContext, useEffect, useState } from "react";
import { Context } from "../../main";
import api from "../../utils/api";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import ResumeModal from "./ResumeModal";
import "./MyApplications.css";

const MyApplications = () => {
  const { user } = useContext(Context);
  const [applications, setApplications] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [resumeImageUrl, setResumeImageUrl] = useState("");

  const { isAuthorized } = useContext(Context);
  const navigateTo = useNavigate();

  useEffect(() => {
    try {
      if (user && user.role === "Employer") {
        api
          .get("/application/employer/getall")
          .then((res) => {
            setApplications(res.data.applications);
          });
      } else {
        api
          .get("/application/jobseeker/getall")
          .then((res) => {
            setApplications(res.data.applications);
          });
      }
    } catch (error) {
      toast.error(error.response.data.message);
    }
  }, [isAuthorized]);

  if (!isAuthorized) {
    navigateTo("/");
  }

  const deleteApplication = (id) => {
    try {
      api
        .delete(`/application/delete/${id}`)
        .then((res) => {
          toast.success(res.data.message);
          setApplications((prevApplication) =>
            prevApplication.filter((application) => application._id !== id)
          );
        });
    } catch (error) {
      toast.error(error.response.data.message);
    }
  };

  const openModal = (imageUrl) => {
    setResumeImageUrl(imageUrl);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  return (
    <section className="my_applications page" aria-label={user?.role === "Job Seeker" ? "Đơn ứng tuyển của tôi" : "Quản lý đơn ứng tuyển"}>
      {user && user.role === "Job Seeker" ? (
        <div className="container">
          <h1 id="page-title">Đơn ứng tuyển của tôi</h1>
          <p className="sr-only" aria-live="polite">
            {applications.length > 0
              ? `Bạn có ${applications.length} đơn ứng tuyển`
              : "Chưa có đơn ứng tuyển nào"}
          </p>
          {applications.length <= 0 ? (
            <div className="no-applications" role="status">
              <p>Không tìm thấy đơn ứng tuyển</p>
            </div>
          ) : (
            <div className="applications-grid" role="list" aria-labelledby="page-title">
              {applications.map((el) => (
                <JobSeekerCard
                  element={el}
                  key={el._id}
                  deleteApplication={deleteApplication}
                  openModal={openModal}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="container">
          <h1 id="page-title-employer">Đơn ứng tuyển từ người tìm việc</h1>
          <p className="sr-only" aria-live="polite">
            {applications.length > 0
              ? `Có ${applications.length} đơn ứng tuyển cần xem xét`
              : "Chưa có đơn ứng tuyển nào"}
          </p>
          {applications.length <= 0 ? (
            <div className="no-applications" role="status">
              <p>Không tìm thấy đơn ứng tuyển</p>
            </div>
          ) : (
            <div className="applications-grid" role="list" aria-labelledby="page-title-employer">
              {applications.map((el) => (
                <EmployerCard element={el} key={el._id} openModal={openModal} />
              ))}
            </div>
          )}
        </div>
      )}
      {modalOpen && <ResumeModal imageUrl={resumeImageUrl} onClose={closeModal} />}
    </section>
  );
};

export default MyApplications;

const JobSeekerCard = ({ element, deleteApplication, openModal }) => {
  const isImage = element.resume.url.match(/\.(jpg|jpeg|png|webp)$/i);
  const jobTitle = element.jobId?.title || "Không rõ vị trí";

  return (
    <article className="job_seeker_card" role="listitem" aria-label={`Đơn ứng tuyển vị trí ${jobTitle}`}>
      <div className="resume">
        {isImage ? (
          <img
            src={element.resume.url}
            alt={`CV của ${element.name}`}
            onClick={() => openModal(element.resume.url)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && openModal(element.resume.url)}
            aria-label="Xem CV"
          />
        ) : (
          <div className="document-preview">
            <div className="document-icon" aria-hidden="true">CV</div>
            <a
              href={element.resume.url}
              target="_blank"
              rel="noopener noreferrer"
              className="download-btn"
              aria-label={`Tải xuống CV đã nộp cho vị trí ${jobTitle}`}
            >
              Tải xuống CV
            </a>
          </div>
        )}
      </div>
      <div className="detail">
        <h3 className="job-title-header">
          <span className="label">Vị trí:</span> {jobTitle}
        </h3>
        <dl className="info-list">
          <div className="info-row">
            <dt>Tên:</dt>
            <dd>{element.name}</dd>
          </div>
          <div className="info-row">
            <dt>Email:</dt>
            <dd>{element.email}</dd>
          </div>
          <div className="info-row">
            <dt>SĐT:</dt>
            <dd>{element.phone}</dd>
          </div>
          <div className="info-row">
            <dt>Địa chỉ:</dt>
            <dd>{element.address}</dd>
          </div>
          <div className="info-row">
            <dt>Thư xin việc:</dt>
            <dd>{element.coverLetter}</dd>
          </div>
        </dl>
      </div>
      <div className="btn_area">
        <button
          onClick={() => deleteApplication(element._id)}
          aria-label={`Xóa đơn ứng tuyển vị trí ${jobTitle}`}
        >
          Xóa đơn ứng tuyển
        </button>
      </div>
    </article>
  );
};

const EmployerCard = ({ element, openModal }) => {
  const [status, setStatus] = useState(element.status || 'pending');
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [interviewDate, setInterviewDate] = useState(element.interviewSchedule?.date || '');
  const [interviewTime, setInterviewTime] = useState(element.interviewSchedule?.time || '');
  const [interviewMode, setInterviewMode] = useState(element.interviewSchedule?.mode || 'Online');
  const [interviewLocation, setInterviewLocation] = useState(element.interviewSchedule?.location || '');
  const isImage = element.resume.url.match(/\.(jpg|jpeg|png|webp)$/i);
  const jobTitle = element.jobId?.title || "Không rõ vị trí";
  const formId = `schedule-form-${element._id}`;

  const handleAccept = async () => {
    try {
      await api.put(
        `/application/update-status/${element._id}`,
        { status: 'accepted' }
      );
      setStatus('accepted');
      toast.success(`Đã chấp nhận ứng viên ${element.name}`);
      setShowScheduleForm(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleReject = async () => {
    try {
      await api.put(
        `/application/update-status/${element._id}`,
        { status: 'rejected' }
      );
      setStatus('rejected');
      toast.success(`Đã từ chối ứng viên ${element.name}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleScheduleInterview = async () => {
    if (!interviewDate || !interviewTime) {
      toast.error('Vui lòng chọn ngày và giờ phỏng vấn');
      return;
    }
    if (!interviewLocation) {
      toast.error('Vui lòng nhập địa điểm/link phỏng vấn');
      return;
    }

    try {
      await api.put(
        `/application/update-status/${element._id}`,
        {
          status: 'accepted',
          interviewDate,
          interviewTime,
          interviewMode,
          interviewLocation,
        }
      );
      setStatus('scheduled');
      setShowScheduleForm(false);
      toast.success(`Đã đặt lịch phỏng vấn ${interviewMode} cho ${element.name}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  // map trạng thái sang text cho screen reader
  const getStatusText = () => {
    const statusMap = {
      accepted: "Đã chấp nhận",
      scheduled: "Đã đặt lịch phỏng vấn",
      pending: "Đang chờ xử lý",
      rejected: "Đã từ chối"
    };
    return statusMap[status] || "Chưa xác định";
  };

  return (
    <article className="job_seeker_card" role="listitem" aria-label={`Đơn ứng tuyển của ${element.name} - ${jobTitle}`}>
      <div className="resume">
        {isImage ? (
          <img
            src={element.resume.url}
            alt={`CV của ứng viên ${element.name}`}
            onClick={() => openModal(element.resume.url)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && openModal(element.resume.url)}
            aria-label="Xem CV"
          />
        ) : (
          <div className="document-preview">
            <div className="document-icon" aria-hidden="true">CV</div>
            <a
              href={element.resume.url}
              target="_blank"
              rel="noopener noreferrer"
              className="download-btn"
              aria-label={`Tải xuống CV của ${element.name}`}
            >
              Tải xuống CV
            </a>
          </div>
        )}
      </div>
      <div className="detail">
        <h3 className="job-title-header">
          <span className="label">Vị trí:</span> {jobTitle}
        </h3>
        <dl className="info-list">
          <div className="info-row">
            <dt>Ứng viên:</dt>
            <dd>{element.name}</dd>
          </div>
          <div className="info-row">
            <dt>Email:</dt>
            <dd>{element.email}</dd>
          </div>
          <div className="info-row">
            <dt>SĐT:</dt>
            <dd>{element.phone}</dd>
          </div>
          <div className="info-row">
            <dt>Địa chỉ:</dt>
            <dd>{element.address}</dd>
          </div>
          <div className="info-row">
            <dt>Loại khuyết tật:</dt>
            <dd>{element.disabilityType || 'Không có'}</dd>
          </div>
          <div className="info-row">
            <dt>Thư xin việc:</dt>
            <dd>{element.coverLetter}</dd>
          </div>
        </dl>

        <span className={`status-badge ${status}`} role="status" aria-label={`Trạng thái: ${getStatusText()}`}>
          {status === 'accepted' && 'Đã chấp nhận'}
          {status === 'scheduled' && 'Đã đặt lịch'}
          {status === 'pending' && 'Đang chờ'}
          {status === 'rejected' && 'Đã từ chối'}
        </span>
      </div>

      {showScheduleForm && (
        <div className="schedule-form" role="form" aria-labelledby={`${formId}-title`}>
          <h4 id={`${formId}-title`}>Đặt lịch phỏng vấn cho {element.name}</h4>
          <div className="form-row">
            <label htmlFor={`${formId}-date`}>Ngày phỏng vấn:</label>
            <input
              id={`${formId}-date`}
              type="date"
              value={interviewDate}
              onChange={(e) => setInterviewDate(e.target.value)}
              required
              aria-required="true"
            />
          </div>
          <div className="form-row">
            <label htmlFor={`${formId}-time`}>Giờ phỏng vấn:</label>
            <input
              id={`${formId}-time`}
              type="time"
              value={interviewTime}
              onChange={(e) => setInterviewTime(e.target.value)}
              required
              aria-required="true"
            />
          </div>
          <div className="form-row">
            <label htmlFor={`${formId}-mode`}>Hình thức:</label>
            <select
              id={`${formId}-mode`}
              value={interviewMode}
              onChange={(e) => setInterviewMode(e.target.value)}
              required
            >
              <option value="Online">Online</option>
              <option value="Offline">Offline (Trực tiếp)</option>
            </select>
          </div>
          <div className="form-row">
            <label htmlFor={`${formId}-location`}>
              {interviewMode === 'Online' ? 'Link phỏng vấn:' : 'Địa điểm:'}
            </label>
            <input
              id={`${formId}-location`}
              type="text"
              placeholder={interviewMode === 'Online' ? 'VD: https://meet.google.com/xxx' : 'VD: 123 Nguyễn Huệ, Q1, HCM'}
              value={interviewLocation}
              onChange={(e) => setInterviewLocation(e.target.value)}
              required
              aria-required="true"
            />
          </div>
        </div>
      )}

      <div className="btn_area">
        {status === 'pending' && (
          <>
            <button
              className="accept-btn"
              onClick={handleAccept}
              aria-label={`Chấp nhận đơn ứng tuyển của ${element.name}`}
            >
              Chấp nhận
            </button>
            <button
              className="reject-btn"
              onClick={handleReject}
              aria-label={`Từ chối đơn ứng tuyển của ${element.name}`}
            >
              Từ chối
            </button>
          </>
        )}

        {status === 'accepted' && !showScheduleForm && (
          <button
            className="schedule-btn"
            onClick={() => setShowScheduleForm(true)}
            aria-label={`Đặt lịch phỏng vấn cho ${element.name}`}
          >
            Đặt lịch phỏng vấn
          </button>
        )}

        {showScheduleForm && (
          <button
            className="schedule-btn"
            onClick={handleScheduleInterview}
            aria-label="Xác nhận lịch phỏng vấn"
          >
            Xác nhận lịch
          </button>
        )}

        {status === 'scheduled' && element.interviewSchedule && (
          <div className="interview-info" role="region" aria-label="Thông tin lịch phỏng vấn">
            <div>Ngày: {element.interviewSchedule.date} lúc {element.interviewSchedule.time}</div>
            <div>{element.interviewSchedule.mode}: {element.interviewSchedule.location}</div>
          </div>
        )}
      </div>
    </article>
  );
};