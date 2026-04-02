// Danh sách loại khuyết tật chuẩn (dùng để validate)
export const DISABILITY_TYPES = [
  "Khiếm thị",
  "Khiếm thính",
  "Vận động",
  "Giao tiếp",
];

// Options cho select dropdown (Application form, Settings)
// Trống = người bình thường (không bắt buộc chọn)
export const DISABILITY_OPTIONS = [
  { value: "Khiếm thị", label: "Khiếm thị" },
  { value: "Khiếm thính", label: "Khiếm thính" },
  { value: "Vận động", label: "Khuyết tật vận động" },
  { value: "Giao tiếp", label: "Khuyết tật giao tiếp" },
  { value: "Khác", label: "Khác" },
];

// Options cho Job (PostJob, MyJobs, Jobs filter) — không có "Không có"
export const JOB_DISABILITY_OPTIONS = [
  { value: "Khiếm thị", label: "Khiếm thị" },
  { value: "Khiếm thính", label: "Khiếm thính" },
  { value: "Vận động", label: "Vận động" },
  { value: "Giao tiếp", label: "Giao tiếp" },
  { value: "Khác", label: "Khác" },
];
