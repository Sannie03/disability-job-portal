import { useEffect, useState, useContext } from "react"
import api from "../../utils/api"
import toast from "react-hot-toast"
import { useNavigate } from "react-router-dom"
import { Context } from "../../main"
import "./ManageJobs.css"

const ManageJobs = () => {
  const navigate = useNavigate()
  const { isAuthorized, user } = useContext(Context)

  const [jobs, setJobs] = useState([])
  const [selectedJobs, setSelectedJobs] = useState([]) // job IDs được chọn để duyệt hàng loạt
  const [loading, setLoading] = useState(false)
  const [selectedJob, setSelectedJob] = useState(null) // job đang xem chi tiết
  const [showModal, setShowModal] = useState(false)

  // redirect nếu không phải admin
  useEffect(() => {
    if (!isAuthorized || (user && user.role !== "Admin")) {
      navigate("/")
    }
  }, [isAuthorized, user, navigate])

  const fetchPendingJobs = async () => {
    try {
      const { data } = await api.get("/job/admin/pending")
      setJobs(data.jobs)
    } catch (error) {
      toast.error("Không thể tải danh sách tin chờ duyệt")
    }
  }

  useEffect(() => {
    fetchPendingJobs()
  }, [])

  // toggle chọn 1 job
  const toggleSelectJob = (jobId) => {
    setSelectedJobs((prev) =>
      prev.includes(jobId)
        ? prev.filter((id) => id !== jobId)
        : [...prev, jobId]
    )
  }

  // chọn/bỏ chọn tất cả
  const toggleSelectAll = () => {
    if (selectedJobs.length === jobs.length) {
      setSelectedJobs([])
    } else {
      setSelectedJobs(jobs.map((job) => job._id))
    }
  }

  const approveOne = async (id) => {
    try {
      await api.put(`/job/admin/${id}/approve`, {})
      toast.success("Đã duyệt tin")
      fetchPendingJobs()
      setSelectedJobs([])
    } catch (error) {
      toast.error("Duyệt tin thất bại")
    }
  }

  const rejectOne = async (id) => {
    const reason = prompt("Nhập lý do từ chối:")
    if (!reason) return

    try {
      await api.put(
        `/job/admin/${id}/reject`,
        { reason }
      )
      toast.success("Đã từ chối tin")
      fetchPendingJobs()
      setSelectedJobs([])
    } catch (error) {
      toast.error("Từ chối tin thất bại")
    }
  }

  // duyệt nhiều tin cùng lúc
  const approveMany = async () => {
    if (selectedJobs.length === 0) {
      return toast.error("Vui lòng chọn ít nhất một tin")
    }

    try {
      setLoading(true)
      await api.put(
        "/job/admin/approve-many",
        { jobIds: selectedJobs }
      )
      toast.success(`Đã duyệt ${selectedJobs.length} tin`)
      fetchPendingJobs()
      setSelectedJobs([])
    } catch (error) {
      toast.error("Duyệt nhiều tin thất bại")
    } finally {
      setLoading(false)
    }
  }

  const viewJobDetail = (job) => {
    setSelectedJob(job)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedJob(null)
  }

  return (
    <section className="manage-jobs-page">
      <div className="manage-jobs-container">
        <div className="manage-jobs-header">
          <h2>Quản lý tin tuyển dụng (Chờ duyệt)</h2>
        </div>

        {jobs.length === 0 ? (
          <div className="empty-state">
            <p>Không có tin nào đang chờ duyệt.</p>
          </div>
        ) : (
          <>
            {/* Bulk Actions */}
            <div className="bulk-actions">
              <button
                onClick={approveMany}
                disabled={loading}
                className="btn-approve-bulk"
              >
                Duyệt các tin đã chọn
              </button>
              {selectedJobs.length > 0 && (
                <span className="selected-count">
                  ({selectedJobs.length} tin được chọn)
                </span>
              )}
            </div>

            {/* Jobs Table */}
            <div className="jobs-table-container">
              <table className="jobs-table">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={selectedJobs.length === jobs.length}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th>Tiêu đề</th>
                    <th>Danh mục</th>
                    <th>Nhà tuyển dụng</th>
                    <th>Ngày đăng</th>
                    <th>Hành động</th>
                  </tr>
                </thead>

                <tbody>
                  {jobs.map((job) => (
                    <tr key={job._id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedJobs.includes(job._id)}
                          onChange={() => toggleSelectJob(job._id)}
                        />
                      </td>
                      <td>
                        <span
                          className="job-title clickable"
                          onClick={() => viewJobDetail(job)}
                        >
                          {job.title}
                        </span>
                      </td>
                      <td>
                        <span className="job-category">{job.category}</span>
                      </td>
                      <td>
                        <span className="employer-email">
                          {job.postedBy?.email}
                        </span>
                      </td>
                      <td>
                        <span className="job-date">
                          {new Date(job.jobPostedOn).toLocaleDateString("vi-VN")}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => approveOne(job._id)}
                            className="btn-approve"
                          >
                            Duyệt
                          </button>
                          <button
                            onClick={() => rejectOne(job._id)}
                            className="btn-reject"
                          >
                            Từ chối
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Job Detail Modal */}
        {showModal && selectedJob && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Chi tiết tin tuyển dụng</h2>
                <button className="modal-close" onClick={closeModal}>
                  ×
                </button>
              </div>

              <div className="modal-body">
                <div className="detail-section">
                  <h3>Thông tin cơ bản</h3>
                  <div className="detail-row">
                    <span className="detail-label">Tiêu đề:</span>
                    <span className="detail-value">{selectedJob.title}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Danh mục:</span>
                    <span className="detail-value">{selectedJob.category}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Quốc gia:</span>
                    <span className="detail-value">{selectedJob.country}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Thành phố:</span>
                    <span className="detail-value">{selectedJob.city}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Địa chỉ:</span>
                    <span className="detail-value">{selectedJob.location}</span>
                  </div>
                </div>

                <div className="detail-section">
                  <h3>Mô tả công việc</h3>
                  <p className="detail-description">{selectedJob.description}</p>
                </div>

                <div className="detail-section">
                  <h3>Thông tin nhà tuyển dụng</h3>
                  <div className="detail-row">
                    <span className="detail-label">Email:</span>
                    <span className="detail-value">{selectedJob.postedBy?.email}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Tên:</span>
                    <span className="detail-value">{selectedJob.postedBy?.name}</span>
                  </div>
                </div>

                {selectedJob.fixedSalary ? (
                  <div className="detail-section">
                    <h3>Mức lương</h3>
                    <div className="detail-row">
                      <span className="detail-label">Lương cố định:</span>
                      <span className="detail-value salary">
                        {selectedJob.fixedSalary?.toLocaleString("vi-VN")} VNĐ
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="detail-section">
                    <h3>Mức lương</h3>
                    <div className="detail-row">
                      <span className="detail-label">Khoảng lương:</span>
                      <span className="detail-value salary">
                        {selectedJob.salaryFrom?.toLocaleString("vi-VN")} - {selectedJob.salaryTo?.toLocaleString("vi-VN")} VNĐ
                      </span>
                    </div>
                  </div>
                )}

                <div className="detail-section">
                  <h3>Thông tin khác</h3>
                  <div className="detail-row">
                    <span className="detail-label">Ngày đăng:</span>
                    <span className="detail-value">
                      {new Date(selectedJob.jobPostedOn).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                  {selectedJob.expired && (
                    <div className="detail-row">
                      <span className="detail-label">Hạn nộp:</span>
                      <span className="detail-value">
                        {new Date(selectedJob.jobPostedOn).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button onClick={closeModal} className="btn-cancel">
                  Đóng
                </button>
                <button
                  onClick={() => {
                    approveOne(selectedJob._id)
                    closeModal()
                  }}
                  className="btn-approve"
                >
                  Duyệt tin
                </button>
                <button
                  onClick={() => {
                    closeModal()
                    rejectOne(selectedJob._id)
                  }}
                  className="btn-reject"
                >
                  Từ chối
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default ManageJobs
