import { useContext, useState, useEffect, useCallback, useMemo, useRef } from "react"
import api from "../../utils/api"
import toast from "react-hot-toast"
import { useNavigate } from "react-router-dom"
import { Context } from "../../main"
import "./PostJob.css"

const CATEGORIES = [
  { value: "Nhập liệu", label: "Nhập liệu" },
  { value: "Frontend", label: "Frontend" },
  { value: "Backend", label: "Backend" },
  { value: "UI/UX", label: "UI/UX" },
  { value: "Marketing", label: "Marketing" },
  { value: "Kế toán", label: "Kế toán" },
  { value: "Nhân sự", label: "Nhân sự" },
  { value: "Kinh doanh", label: "Kinh doanh" },
  { value: "Thiết kế đồ họa", label: "Thiết kế đồ họa" },
  { value: "Biên dịch", label: "Biên dịch" },
  { value: "Chăm sóc khách hàng", label: "Chăm sóc khách hàng" },
  { value: "Other", label: "Khác" },
]

const WORK_MODES = [
  { value: "Online", label: "Online" },
  { value: "Offline", label: "Offline" },
  { value: "Hybrid", label: "Hybrid" },
]

const SALARY_TYPES = [
  { value: "Fixed Salary", label: "Lương cố định" },
  { value: "Ranged Salary", label: "Theo khoảng" },
]

const DISABILITIES = [
  { value: "Khiếm thị", label: "Khiếm thị" },
  { value: "Khiếm thính", label: "Khiếm thính" },
  { value: "Vận động", label: "Vận động" },
  { value: "Giao tiếp", label: "Giao tiếp" },
  { value: "Khác", label: "Khác" },
]

const PROVINCES = [
  "Hà Nội", "Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Cần Thơ",
  "An Giang", "Bà Rịa - Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu",
  "Bắc Ninh", "Bến Tre", "Bình Định", "Bình Dương", "Bình Phước",
  "Bình Thuận", "Cà Mau", "Cao Bằng", "Đắk Lắk", "Đắk Nông",
  "Điện Biên", "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Giang",
  "Hà Nam", "Hà Tĩnh", "Hải Dương", "Hậu Giang", "Hòa Bình",
  "Hưng Yên", "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu",
  "Lâm Đồng", "Lạng Sơn", "Lào Cai", "Long An", "Nam Định",
  "Nghệ An", "Ninh Bình", "Ninh Thuận", "Phú Thọ", "Phú Yên",
  "Quảng Bình", "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị",
  "Sóc Trăng", "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên",
  "Thanh Hóa", "Thừa Thiên Huế", "Tiền Giang", "Trà Vinh", "Tuyên Quang",
  "Vĩnh Long", "Vĩnh Phúc", "Yên Bái"
]

const CityAutocomplete = ({ value, onChange }) => {
  const [inputValue, setInputValue] = useState("")
  const wrapperRef = useRef(null)
  const inputRef = useRef(null)

  const findBestMatch = useCallback((search) => {
    if (!search.trim()) return null
    const s = search.toLowerCase().trim()
    return PROVINCES.find(name => name.toLowerCase().includes(s)) || null
  }, [])

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault()
      const match = findBestMatch(inputValue)
      if (match) {
        onChange(match)
        setInputValue("")
      }
    }
  }

  const handleInputChange = (e) => {
    const val = e.target.value
    setInputValue(val)
    if (!val) onChange("")
  }

  const handleClear = () => {
    onChange("")
    setInputValue("")
    inputRef.current?.focus()
  }

  if (value) {
    return (
      <div className="city-selected">
        <span className="city-selected-text">{value}</span>
        <button type="button" className="city-selected-clear" onClick={handleClear}>
          ✕
        </button>
      </div>
    )
  }

  const suggestion = findBestMatch(inputValue)

  return (
    <div className="autocomplete-wrapper" ref={wrapperRef}>
      <input
        ref={inputRef}
        type="text"
        className="field-input"
        placeholder="Nhập tên tỉnh/thành phố, Enter để chọn"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {suggestion && inputValue && (
        <div className="autocomplete-hint">
          Enter để chọn: <strong>{suggestion}</strong>
        </div>
      )}
    </div>
  )
}

const PostJob = () => {
  const navigate = useNavigate()
  const { isAuthorized, user } = useContext(Context)

  // state chính của form
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    customCategory: "",
    city: "",
    location: "",
    description: "",
    workMode: "",
    isFlexibleTime: false,
    workStartTime: "",
    workEndTime: "",
    salaryType: "default",
    fixedSalary: "",
    salaryFrom: "",
    salaryTo: "",
    deadline: "",
    isDisabilityFriendly: false,
    supportedDisabilities: [],
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  // redirect nếu không phải employer
  useEffect(() => {
    if (!isAuthorized || (user && user.role !== "Employer")) {
      navigate("/")
    }
  }, [isAuthorized, user, navigate])

  const handleChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleDisabilityToggle = useCallback((disability) => {
    setFormData(prev => ({
      ...prev,
      supportedDisabilities: prev.supportedDisabilities.includes(disability)
        ? prev.supportedDisabilities.filter(d => d !== disability)
        : [...prev.supportedDisabilities, disability]
    }))
  }, [])

  // validate trước khi submit
  const validateForm = useCallback(() => {
    const { 
      title, description, category, customCategory, city, location, 
      workMode, isFlexibleTime, workStartTime, workEndTime, deadline,
      salaryType, fixedSalary, salaryFrom, salaryTo,
      isDisabilityFriendly, supportedDisabilities 
    } = formData

    const validations = [
      { condition: !title || title.length < 3, message: "Tiêu đề phải có ít nhất 3 ký tự!" },
      { condition: !description || description.length < 30, message: "Mô tả phải có ít nhất 30 ký tự!" },
      { condition: !(category === "Other" ? customCategory : category), message: "Vui lòng chọn hoặc nhập danh mục!" },
      { condition: !city, message: "Vui lòng chọn thành phố!" },
      { condition: !location || location.length < 10, message: "Địa điểm phải có ít nhất 10 ký tự!" },
      { condition: !workMode, message: "Vui lòng chọn hình thức làm việc!" },
      { condition: !isFlexibleTime && (!workStartTime || !workEndTime), message: "Vui lòng nhập thời gian làm việc!" },
      { condition: !deadline, message: "Vui lòng nhập hạn nộp hồ sơ!" },
      { condition: salaryType === "default", message: "Vui lòng chọn loại lương!" },
      { condition: salaryType === "Fixed Salary" && !fixedSalary, message: "Vui lòng nhập mức lương cố định!" },
      { condition: salaryType === "Ranged Salary" && (!salaryFrom || !salaryTo), message: "Vui lòng nhập đầy đủ khoảng lương!" },
      { condition: salaryType === "Ranged Salary" && Number(salaryFrom) >= Number(salaryTo), message: "Lương từ phải nhỏ hơn lương đến!" },
      { condition: isDisabilityFriendly && supportedDisabilities.length === 0, message: "Vui lòng chọn ít nhất một loại khiếm khuyết!" },
    ]

    for (const { condition, message } of validations) {
      if (condition) {
        toast.error(message)
        return false
      }
    }
    return true
  }, [formData])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    const { 
      title, category, customCategory, city, location, description,
      workMode, isFlexibleTime, workStartTime, workEndTime, deadline,
      salaryType, fixedSalary, salaryFrom, salaryTo,
      isDisabilityFriendly, supportedDisabilities 
    } = formData

    const jobData = {
      title,
      category: category === "Other" ? customCategory : category,
      city,
      location,
      description,
      workMode,
      isFlexibleTime,
      workTime: isFlexibleTime ? null : { start: workStartTime, end: workEndTime },
      deadline,
      isDisabilityFriendly,
      supportedDisabilities,
      ...(salaryType === "Fixed Salary" && { fixedSalary }),
      ...(salaryType === "Ranged Salary" && { salaryFrom, salaryTo }),
    }

    setIsSubmitting(true)
    try {
      await api.post("/job/post", jobData)
      toast.success("Đăng tin thành công! Tin đang chờ duyệt.")
      navigate("/myjobs")
    } catch (error) {
      toast.error(error.response?.data?.message || "Đăng tin thất bại")
    } finally {
      setIsSubmitting(false)
    }
  }

  // computed values
  const minDate = useMemo(() => new Date().toISOString().split("T")[0], [])
  
  const formatSalary = useCallback((value) => {
    const num = parseFloat(value)
    return isNaN(num) ? "" : (num * 1000000).toLocaleString("vi-VN")
  }, [])

  const salaryPreview = useMemo(() => {
    const { salaryType, fixedSalary, salaryFrom, salaryTo } = formData
    if (salaryType === "Fixed Salary" && fixedSalary) {
      return `${formatSalary(fixedSalary)} VNĐ/tháng`
    }
    if (salaryType === "Ranged Salary" && salaryFrom && salaryTo) {
      return `${formatSalary(salaryFrom)} - ${formatSalary(salaryTo)} VNĐ/tháng`
    }
    return null
  }, [formData, formatSalary])

  return (
    <div className="post-job-page">
      <div className="post-job-container">
        <header className="post-job-header">
          <h1 className="post-job-title">Đăng tin tuyển dụng</h1>
          <p className="post-job-subtitle">Tìm kiếm ứng viên phù hợp cho công việc của bạn</p>
        </header>

        <form onSubmit={handleSubmit} className="post-job-form">
          {/* Disability Section */}
          <section className="form-section">
            <div className="disability-box">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  className="checkbox-input"
                  checked={formData.isDisabilityFriendly}
                  onChange={(e) => handleChange("isDisabilityFriendly", e.target.checked)}
                />
                <span className="checkbox-text">
                  Công việc phù hợp cho người khuyết tật
                </span>
              </label>

              {formData.isDisabilityFriendly && (
                <div className="disability-options">
                  {DISABILITIES.map(({ value, label }) => (
                    <label
                      key={value}
                      className={`disability-tag ${formData.supportedDisabilities.includes(value) ? "active" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.supportedDisabilities.includes(value)}
                        onChange={() => handleDisabilityToggle(value)}
                      />
                      {formData.supportedDisabilities.includes(value) && <span>✓</span>}
                      {label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Basic Info Section */}
          <section className="form-section">
            <h3 className="section-title">Thông tin cơ bản</h3>

            <div className="field-group">
              <label className="field-label">Tiêu đề công việc *</label>
              <input
                type="text"
                className="field-input"
                placeholder="VD: Nhân viên nhập liệu bán thời gian"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
              />
            </div>

            <div className="field-row">
              <div className="field-group">
                <label className="field-label">Danh mục *</label>
                <select
                  className="field-select"
                  value={formData.category}
                  onChange={(e) => handleChange("category", e.target.value)}
                >
                  <option value="">Chọn danh mục</option>
                  {CATEGORIES.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="field-group">
                <label className="field-label">Thành phố *</label>
                <CityAutocomplete
                  value={formData.city}
                  onChange={(city) => handleChange("city", city)}
                />
              </div>
            </div>

            {formData.category === "Other" && (
              <div className="field-group">
                <label className="field-label">Danh mục tùy chỉnh *</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="Nhập tên danh mục công việc"
                  value={formData.customCategory}
                  onChange={(e) => handleChange("customCategory", e.target.value)}
                />
              </div>
            )}

            <div className="field-group">
              <label className="field-label">Địa điểm làm việc *</label>
              <input
                type="text"
                className="field-input"
                placeholder="VD: 123 Nguyễn Huệ, Quận 1"
                value={formData.location}
                onChange={(e) => handleChange("location", e.target.value)}
              />
            </div>
          </section>

          {/* Work Mode & Time Section */}
          <section className="form-section">
            <h3 className="section-title">Hình thức & Thời gian</h3>

            <div className="field-group">
              <label className="field-label">Hình thức làm việc *</label>
              <div className="card-options">
                {WORK_MODES.map(({ value, label }) => (
                  <label
                    key={value}
                    className={`option-card ${formData.workMode === value ? "active" : ""}`}
                  >
                    <input
                      type="radio"
                      name="workMode"
                      value={value}
                      checked={formData.workMode === value}
                      onChange={(e) => handleChange("workMode", e.target.value)}
                    />
                    <span className="option-card-label">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="field-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  className="checkbox-input"
                  checked={formData.isFlexibleTime}
                  onChange={(e) => handleChange("isFlexibleTime", e.target.checked)}
                />
                <span className="checkbox-text">Thời gian làm việc linh hoạt</span>
              </label>
            </div>

            {!formData.isFlexibleTime && (
              <div className="field-row">
                <div className="field-group">
                  <label className="field-label">Giờ bắt đầu *</label>
                  <input
                    type="time"
                    className="field-input"
                    value={formData.workStartTime}
                    onChange={(e) => handleChange("workStartTime", e.target.value)}
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Giờ kết thúc *</label>
                  <input
                    type="time"
                    className="field-input"
                    value={formData.workEndTime}
                    onChange={(e) => handleChange("workEndTime", e.target.value)}
                  />
                </div>
              </div>
            )}
          </section>

          {/* Salary Section */}
          <section className="form-section">
            <h3 className="section-title">Mức lương (triệu VNĐ/tháng)</h3>

            <div className="field-group">
              <label className="field-label">Loại lương *</label>
              <div className="card-options horizontal">
                {SALARY_TYPES.map(({ value, label }) => (
                  <label
                    key={value}
                    className={`option-card ${formData.salaryType === value ? "active" : ""}`}
                  >
                    <input
                      type="radio"
                      name="salaryType"
                      value={value}
                      checked={formData.salaryType === value}
                      onChange={(e) => handleChange("salaryType", e.target.value)}
                    />
                    <span className="option-card-label">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {formData.salaryType === "Fixed Salary" && (
              <div className="field-group">
                <label className="field-label">Mức lương *</label>
                <div className="salary-wrapper">
                  <input
                    type="number"
                    className="field-input salary-input"
                    placeholder="VD: 8"
                    value={formData.fixedSalary}
                    onChange={(e) => handleChange("fixedSalary", e.target.value)}
                    min="0"
                    step="0.1"
                  />
                  <span className="salary-unit">triệu/tháng</span>
                </div>
              </div>
            )}

            {formData.salaryType === "Ranged Salary" && (
              <div className="field-row">
                <div className="field-group">
                  <label className="field-label">Từ *</label>
                  <div className="salary-wrapper">
                    <input
                      type="number"
                      className="field-input salary-input"
                      placeholder="VD: 5"
                      value={formData.salaryFrom}
                      onChange={(e) => handleChange("salaryFrom", e.target.value)}
                      min="0"
                      step="0.1"
                    />
                    <span className="salary-unit">triệu</span>
                  </div>
                </div>
                <div className="field-group">
                  <label className="field-label">Đến *</label>
                  <div className="salary-wrapper">
                    <input
                      type="number"
                      className="field-input salary-input"
                      placeholder="VD: 10"
                      value={formData.salaryTo}
                      onChange={(e) => handleChange("salaryTo", e.target.value)}
                      min="0"
                      step="0.1"
                    />
                    <span className="salary-unit">triệu</span>
                  </div>
                </div>
              </div>
            )}

            {salaryPreview && <p className="salary-preview">{salaryPreview}</p>}
          </section>

          {/* Deadline Section */}
          <section className="form-section">
            <h3 className="section-title">Thời hạn</h3>
            <div className="field-group">
              <label className="field-label">Hạn nộp hồ sơ *</label>
              <input
                type="date"
                className="field-input"
                value={formData.deadline}
                onChange={(e) => handleChange("deadline", e.target.value)}
                min={minDate}
              />
            </div>
          </section>

          {/* Description Section */}
          <section className="form-section">
            <h3 className="section-title">Mô tả công việc</h3>
            <div className="field-group">
              <label className="field-label">Chi tiết công việc *</label>
              <textarea
                className="field-textarea"
                rows="6"
                placeholder="Mô tả chi tiết về công việc, yêu cầu, quyền lợi..."
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
              />
              <p className={`char-count ${formData.description.length >= 30 ? "valid" : ""}`}>
                {formData.description.length}/30 ký tự tối thiểu
              </p>
            </div>
          </section>

          {/* Submit Button */}
          <button type="submit" className="submit-btn" disabled={isSubmitting}>
            {isSubmitting ? "Đang đăng..." : "Đăng tin tuyển dụng"}
          </button>
        </form>
      </div>
    </div>
  )
}

export default PostJob