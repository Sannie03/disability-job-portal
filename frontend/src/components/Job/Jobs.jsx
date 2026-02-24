import { useContext, useEffect, useState } from "react";
import api from "../../utils/api";
import { Link, useNavigate } from "react-router-dom";
import { Context } from "../../main";
import toast from "react-hot-toast";
import "./Jobs.css";

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [applied, setApplied] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { isAuthorized, user } = useContext(Context);
  const navigate = useNavigate();

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

  useEffect(() => {
    api.get(`/job/getall?page=${currentPage}&limit=10`)
      .then(res => {
        setJobs(res.data);
        setFiltered(res.data.jobs || []);
        setPagination(res.data.pagination);
      })
      .catch(err => console.log(err));

    if (isAuthorized && user?.role === "Job Seeker") {
      api.get("/application/jobseeker/getall")
        .then(res => {
          const appliedJobIds = res.data.applications?.map(app => app.jobId?._id || app.jobId) || [];
          setApplied(appliedJobIds);
        })
        .catch(err => console.log(err));
    }
  }, [isAuthorized, user, currentPage]);

  useEffect(() => {
    if (!jobs.jobs) return;
    let result = [...jobs.jobs];

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

    if (disability) {
      result = result.filter(j =>
        j.isDisabilityFriendly && j.supportedDisabilities?.includes(disability)
      );
    }

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

  const activeFilterCount = [city, category, workMode, disability, salaryMin, salaryMax].filter(Boolean).length;

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
    return `${job.salaryFrom?.toLocaleString("vi-VN")} – ${job.salaryTo?.toLocaleString("vi-VN")} VNĐ`;
  };

  return (
    <section className="jobs-page" aria-label="Danh sách công việc">
      <div className="jobs-container">

        {/* ===== Search ===== */}
        <div className="jobs-search" role="search">
          <div className="search-box">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Tìm theo chức danh, kỹ năng, danh mục..."
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              className="search-input"
              aria-label="Tìm kiếm công việc theo từ khóa"
            />
          </div>
          <button
            className="filter-toggle"
            onClick={() => setShowFilters(!showFilters)}
            aria-expanded={showFilters}
            aria-label={showFilters ? "Đóng bộ lọc" : "Mở bộ lọc"}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="filter-icon">
              <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
            </svg>
            Lọc{activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}
          </button>
        </div>

        <div className="jobs-layout">

          {/* ===== Filters ===== */}
          <aside className={`filters ${showFilters ? "open" : ""}`} aria-label="Bộ lọc tìm kiếm">
            <div className="filters-top">
              <h3>Bộ lọc</h3>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="filters-clear" aria-label="Xóa tất cả bộ lọc">
                  Xóa tất cả
                </button>
              )}
              <button className="filters-close" onClick={() => setShowFilters(false)} aria-label="Đóng bộ lọc">
                ✕
              </button>
            </div>

            <div className="filters-body">
              <div className="f-group">
                <label htmlFor="f-city">Thành phố</label>
                <select id="f-city" value={city} onChange={e => setCity(e.target.value)}>
                  <option value="">Tất cả</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="f-group">
                <label htmlFor="f-cat">Danh mục</label>
                <select id="f-cat" value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="">Tất cả</option>
                  {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="f-group">
                <label htmlFor="f-mode">Hình thức</label>
                <select id="f-mode" value={workMode} onChange={e => setWorkMode(e.target.value)}>
                  <option value="">Tất cả</option>
                  <option value="Online">Từ xa</option>
                  <option value="Offline">Tại văn phòng</option>
                  <option value="Hybrid">Kết hợp</option>
                </select>
              </div>

              <div className="f-group">
                <label htmlFor="f-dis">Hỗ trợ NKT</label>
                <select id="f-dis" value={disability} onChange={e => setDisability(e.target.value)}>
                  <option value="">Không lọc</option>
                  {disabilities.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="f-group">
                <label>Mức lương (VNĐ)</label>
                <div className="salary-range">
                  <input type="number" placeholder="Từ" value={salaryMin} onChange={e => setSalaryMin(e.target.value)} min="0" aria-label="Mức lương tối thiểu" />
                  <span className="salary-sep">–</span>
                  <input type="number" placeholder="Đến" value={salaryMax} onChange={e => setSalaryMax(e.target.value)} min="0" aria-label="Mức lương tối đa" />
                </div>
              </div>
            </div>
          </aside>

          {/* ===== Job List ===== */}
          <main className="jobs-list" role="main" aria-label="Danh sách việc làm">
            {filtered.length > 0 ? filtered.map(job => (
              <article className="jcard" key={job._id} aria-label={`Công việc: ${job.title}`}>
                <div className="jcard-top">
                  <div className="jcard-info">
                    <h3 className="jcard-title">
                      <Link to={`/job/${job._id}`}>{job.title}</Link>
                    </h3>
                    {job.postedBy && (
                      <span className="jcard-company">
                        {job.postedBy.companyInfo?.companyName || job.postedBy.name}
                      </span>
                    )}
                  </div>
                  {job.isDisabilityFriendly && (
                    <span className="nkt-badge" title="Hỗ trợ người khuyết tật">NKT</span>
                  )}
                </div>

                <div className="jcard-tags">
                  <span className="tag tag-cat">{job.category}</span>
                  <span className="tag tag-loc">{job.city}</span>
                  {job.workMode && <span className="tag tag-mode">{job.workMode === "Online" ? "Từ xa" : job.workMode === "Offline" ? "Tại VP" : "Kết hợp"}</span>}
                </div>

                {job.isDisabilityFriendly && job.supportedDisabilities?.length > 0 && (
                  <div className="jcard-disabilities">
                    {job.supportedDisabilities.map((d, i) => (
                      <span key={i} className="dis-tag">{d}</span>
                    ))}
                  </div>
                )}

                <div className="jcard-bottom">
                  <span className="jcard-salary">{formatSalary(job)}</span>
                  <div className="jcard-actions">
                    <Link to={`/job/${job._id}`} className="btn-detail">Chi tiết</Link>
                    {(!user || user.role !== "Employer") && (
                      applied.includes(job._id)
                        ? <span className="btn-done">Đã nộp</span>
                        : <Link to={`/application/${job._id}`} className="btn-apply" onClick={e => handleApply(e, job._id)} aria-label={`Nộp đơn ứng tuyển ${job.title}`}>Ứng tuyển</Link>
                    )}
                  </div>
                </div>
              </article>
            )) : (
              <div className="jobs-empty">
                <div className="empty-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9.172 14.828a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3>Chưa tìm thấy công việc</h3>
                <p>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="btn-reset">Xóa bộ lọc</button>
                )}
              </div>
            )}

            {pagination && pagination.totalPages > 1 && (
              <div className="paging">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="paging-btn"
                >
                  ← Trước
                </button>
                <span className="paging-num">
                  {pagination.currentPage} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                  disabled={currentPage === pagination.totalPages}
                  className="paging-btn"
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
