// Application Constants
export const ROLES = {
  JOB_SEEKER: "Job Seeker",
  EMPLOYER: "Employer",
  ADMIN: "Admin",
};

export const CONFIG = {
  // File upload
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_FILE_TYPES: [
    "image/png",
    "image/jpeg",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ],

  // Pagination
  DEFAULT_PAGE_LIMIT: 20,
  MAX_PAGE_LIMIT: 100,

  // Salary
  SALARY_MULTIPLIER: 1000000, // Convert millions to VND

  // Job
  MAX_EXTEND_DAYS: 90,

  // Password
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 32,
};

export const APPLICATION_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  SCHEDULED: "scheduled",
};

export const JOB_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

export const AUTH_PROVIDERS = {
  LOCAL: "local",
  GOOGLE: "google",
};
