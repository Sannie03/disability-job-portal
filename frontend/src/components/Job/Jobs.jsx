import { useContext, useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { Context } from "../../main";
import toast from "react-hot-toast";
import "./Jobs.css";

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [applied, setApplied] = useState([]); // lưu job đã ứng tuyển
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { isAuthorized, user } = useContext(Context);
  const navigate = useNavigate();

  // filters state
  const [keyword, setKeyword] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [workMode, setWorkMode] = useState("");
  const [disability, setDisability] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const categories = [
    "Nhập liệu", "Frontend", "Backend", "UI/UX", "Marketing",
    "Kế toán", "Nhân sự", "Kinh doanh", "Thiết kế đồ họa",
    "Biên dịch", "Chăm sóc khách hàng"
  ];
  const disabilities = ["Khiếm thị", "Khiếm thính", "Vận động", "Giao tiếp", "Khác"];

  // fetch jobs + lấy danh sách đơn đã nộp của user
  useEffect(() => {
    axios.get(`http://localhost:5000/api/v1/job/getall?page=${currentPage}&limit=10`, { withCredentials: true })
      .then(res => {
        setJobs(res.data);
        setFiltered(res.data.jobs || []);
        setPagination(res.data.pagination);
      })
      .catch(err => console.log(err));

    // nếu đã đăng nhập và là Job Seeker thì lấy danh sách job đã ứng tuyển
    if (isAuthorized && user?.role === "Job Seeker") {
      axios.get("http://localhost:5000/api/v1/application/jobseeker/getall", { withCredentials: true })
        .then(res => {
          const appliedJobIds = res.data.applications?.map(app => app.jobId?._id || app.jobId) || [];
          setApplied(appliedJobIds);
        })
        .catch(err => console.log(err));
    }
  }, [isAuthorized, user, currentPage]);

  // filter logic - chạy mỗi khi filter thay đổi
  useEffect(() => {
    if (!jobs.jobs) return;
    let result = [...jobs.jobs];

    // tìm theo keyword
    if (keyword.trim()) {
      const kw = keyword.toLowerCase();
      result = result.filter(j =>
        j.title.toLowerCase().includes(kw) ||
        j.description.toLowerCase().includes(kw) ||
        j.category.toLowerCase().includes(kw)
      );
    }
    if (city) result = result.filter(j => j.city === city);
    if (category) result = result.filter(j => j.category === category);
    if (workMode) result = result.filter(j => j.workMode === workMode);

    // filter theo loại khuyết tật được hỗ trợ
    if (disability) {
      result = result.filter(j =>
        j.isDisabilityFriendly && j.supportedDisabilities?.includes(disability)
      );
    }

    // filter theo khoảng lương
    if (salaryMin || salaryMax) {
      result = result.filter(j => {
        const min = j.fixedSalary || j.salaryFrom || 0;
        const max = j.fixedSalary || j.salaryTo || Infinity;
        const fMin = salaryMin ? parseInt(salaryMin) : 0;
        const fMax = salaryMax ? parseInt(salaryMax) : Infinity;
        return max >= fMin && min <= fMax;
      });
    }
    setFiltered(result);
  }, [jobs, keyword, city, category, workMode, disability, salaryMin, salaryMax]);

  const cities = [...new Set(jobs.jobs?.map(j => j.city) || [])];
  const allCategories = [...new Set([...categories, ...(jobs.jobs?.map(j => j.category) || [])])];
  allCategories.sort((a, b) => a.localeCompare(b, 'vi'));

  const clearFilters = () => {
    setKeyword(""); setCity(""); setCategory("");
    setWorkMode(""); setDisability("");
    setSalaryMin(""); setSalaryMax("");
  };

  const handleApply = (e, jobId) => {
    if (!isAuthorized) {
      e.preventDefault();
      toast.error("Vui lòng đăng nhập để nộp đơn");
      navigate("/login");
      return;
    }
    if (applied.includes(jobId)) {
      e.preventDefault();
      toast.error("Bạn đã ứng tuyển công việc này rồi");
    }
  };

  const formatSalary = (job) => {
    if (job.fixedSalary) {
      return job.fixedSalary.toLocaleString("vi-VN") + " VNĐ";
    }
    return `${job.salaryFrom?.toLocaleString("vi-VN")} - ${job.salaryTo?.toLocaleString("vi-VN")} VNĐ`;
  };

  return (
    <section className="jobs-page" aria-label="Danh sách công việc">
      <div className="jobs-container">
        <div className="jobs-header">
          <h1>Tất cả công việc</h1>
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {filtered.length > 0
              ? `Tìm thấy ${filtered.length} công việc${disability ? ` hỗ trợ ${disability}` : ''}`
              : 'Không tìm thấy công việc phù hợp'}
          </p>
        </div>

        <div className="search-bar-wrapper" role="search">
          <input
            type="text"
            placeholder="Tìm kiếm công việc..."
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            className="search-input-main"
            aria-label="Tìm kiếm công việc theo từ khóa"
          />
          <button
            className="mobile-filter-toggle"
            onClick={() => setShowFilters(!showFilters)}
            aria-expanded={showFilters}
            aria-label={showFilters ? "Đóng bộ lọc" : "Mở bộ lọc"}
          >
            {showFilters ? "Đóng" : "Bộ lọc"}
          </button>
        </div>

        <div className="jobs-content">
          <aside className={`filters-sidebar ${showFilters ? "show" : ""}`} aria-label="Bộ lọc tìm kiếm">
            <div className="filters-header">
              <h3 id="filters-heading">Bộ lọc</h3>
              <button onClick={clearFilters} className="btn-clear-all" aria-label="Xóa tất cả bộ lọc">Xóa</button>
            </div>

            <div className="filters-list" role="group" aria-labelledby="filters-heading">
              <div className="filter-group">
                <label htmlFor="filter-city">Thành phố</label>
                <select id="filter-city" value={city} onChange={e => setCity(e.target.value)} aria-label="Lọc theo thành phố">
                  <option value="">Tất cả thành phố</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="filter-category">Danh mục</label>
                <select id="filter-category" value={category} onChange={e => setCategory(e.target.value)} aria-label="Lọc theo danh mục công việc">
                  <option value="">Tất cả danh mục</option>
                  {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="filter-workmode">Hình thức</label>
                <select id="filter-workmode" value={workMode} onChange={e => setWorkMode(e.target.value)} aria-label="Lọc theo hình thức làm việc">
                  <option value="">Tất cả hình thức</option>
                  <option value="Online">Online - Làm việc từ xa</option>
                  <option value="Offline">Offline - Làm việc tại văn phòng</option>
                  <option value="Hybrid">Hybrid - Kết hợp</option>
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="filter-disability">Hỗ trợ người khuyết tật</label>
                <select id="filter-disability" value={disability} onChange={e => setDisability(e.target.value)} aria-label="Lọc công việc theo loại khuyết tật được hỗ trợ">
                  <option value="">Tất cả - không lọc theo khuyết tật</option>
                  {disabilities.map(d => <option key={d} value={d}>Hỗ trợ {d}</option>)}
                </select>
              </div>

              <div className="filter-group">
                <label>Mức lương (VNĐ)</label>
                <input id="filter-salary-min" type="number" placeholder="Từ" value={salaryMin} onChange={e => setSalaryMin(e.target.value)} min="0" aria-label="Mức lương tối thiểu" />
                <input id="filter-salary-max" type="number" placeholder="Đến" value={salaryMax} onChange={e => setSalaryMax(e.target.value)} min="0" aria-label="Mức lương tối đa" />
              </div>
            </div>
          </aside>

          <main className="jobs-grid" id="main-content" role="main" aria-label="Danh sách việc làm">
            {filtered.length > 0 ? filtered.map(job => (
              <article className="job-card" key={job._id} aria-label={`Công việc: ${job.title}`}>
                <div className="job-card-header">
                  <h3 className="job-card-title">
                    <Link to={`/job/${job._id}`}>{job.title}</Link>
                  </h3>
                  {job.isDisabilityFriendly && (
                    <span className="disability-badge-small" role="img" aria-label="Công việc hỗ trợ người khuyết tật" title="Hỗ trợ người khuyết tật">
                      NKT
                    </span>
                  )}
                </div>

                <div className="job-card-meta">
                  <span className="job-category">{job.category}</span>
                  <span className="job-location">{job.city}</span>
                </div>

                {job.postedBy && (
                  <div className="job-card-employer">
                    <span className="employer-label">Nhà tuyển dụng:</span>{" "}
                    {job.postedBy.companyInfo?.companyName || job.postedBy.name}
                  </div>
                )}

                <div className="job-card-salary">{formatSalary(job)}</div>

                {job.isDisabilityFriendly && job.supportedDisabilities?.length > 0 && (
                  <div className="job-card-disabilities" role="region" aria-label="Hỗ trợ người khuyết tật">
                    <span className="disabilities-label" id={`dis-label-${job._id}`}>Hỗ trợ:</span>
                    <div className="disabilities-tags" role="list" aria-labelledby={`dis-label-${job._id}`}>
                      {job.supportedDisabilities.map((d, i) => (
                        <span key={i} className="disability-tag-small" role="listitem">{d}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="job-card-footer">
                  <Link to={`/job/${job._id}`} className="btn-view-detail">Xem chi tiết</Link>
                  {(!user || user.role !== "Employer") && (
                    applied.includes(job._id)
                      ? <button className="btn-applied" disabled aria-label="Bạn đã ứng tuyển công việc này">Đã ứng tuyển</button>
                      : <Link to={`/application/${job._id}`} className="btn-apply" onClick={e => handleApply(e, job._id)} aria-label={`Nộp đơn ứng tuyển ${job.title}`}>Nộp đơn</Link>
                  )}
                </div>
              </article>
            )) : (
              <div className="no-jobs" role="status"><p>Chưa có công việc nào</p></div>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  ← Trước
                </button>
                <span className="pagination-info">
                  Trang {pagination.currentPage} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                  disabled={currentPage === pagination.totalPages}
                  className="pagination-btn"
                >
                  Sau →
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </section>
  );
};

export default Jobs;
