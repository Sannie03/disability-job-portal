import ErrorHandler from "../middlewares/error.js";

export const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

export const publicJobFilter = () => ({
  expired: false, status: "approved", isDeleted: { $ne: true },
  deadline: { $gte: startOfToday() },
});

export const paginationFor = (query) => {
  const parsePositive = (value, fallback) => {
    if (value === undefined) return fallback;
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < 1) {
      throw new ErrorHandler("Tham số phân trang không hợp lệ.", 400);
    }
    return number;
  };
  const page = parsePositive(query.page, 1);
  const limit = Math.min(parsePositive(query.limit, 10), 10);
  const skip = (page - 1) * limit;
  if (!Number.isSafeInteger(skip)) throw new ErrorHandler("Trang không hợp lệ.", 400);
  return { page, limit, skip };
};

export const buildJobFilter = (query) => {
  for (const field of ["keyword", "city", "category", "workMode", "supportedDisability", "isDisabilityFriendly", "salaryMin", "salaryMax"]) {
    if (query[field] !== undefined && typeof query[field] !== "string") {
      throw new ErrorHandler("Bộ lọc không hợp lệ.", 400);
    }
  }
  const filter = publicJobFilter();
  const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const conditions = [];
  if (query.keyword?.trim()) {
    conditions.push({ $or: ["title", "description", "category"].map((field) => ({
      [field]: { $regex: escapeRegex(query.keyword.trim()), $options: "i" },
    })) });
  }
  if (query.city) filter.city = query.city;
  if (query.category) filter.category = query.category;
  if (query.workMode) filter.workMode = query.workMode;
  if (query.isDisabilityFriendly === "true" || query.supportedDisability) filter.isDisabilityFriendly = true;
  if (query.supportedDisability) {
    filter.supportedDisabilities = query.supportedDisability === "Khác"
      ? { $elemMatch: { $nin: ["Khiếm thị", "Khiếm thính", "Vận động", "Giao tiếp"] } }
      : query.supportedDisability;
  }
  const salary = (value) => {
    if (value === undefined || value === "") return undefined;
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) throw new ErrorHandler("Mức lương không hợp lệ.", 400);
    return number;
  };
  const min = salary(query.salaryMin);
  const max = salary(query.salaryMax);
  if (min !== undefined && max !== undefined && min > max) {
    throw new ErrorHandler("Lương tối thiểu phải nhỏ hơn hoặc bằng lương tối đa.", 400);
  }
  if (min !== undefined || max !== undefined) {
    const fixed = {};
    const range = { salaryFrom: { $exists: true }, salaryTo: { $exists: true } };
    if (min !== undefined) { fixed.$gte = min; range.salaryTo.$gte = min; }
    if (max !== undefined) { fixed.$lte = max; range.salaryFrom.$lte = max; }
    conditions.push({ $or: [{ fixedSalary: fixed }, range] });
  }
  if (conditions.length) filter.$and = conditions;
  return filter;
};
