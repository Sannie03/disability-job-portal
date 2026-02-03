import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import { Job } from "../models/jobSchema.js";
import ErrorHandler from "../middlewares/error.js";

export const getAllJobs = catchAsyncErrors(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // Limit max items per page
  const finalLimit = Math.min(limit, 10);

  const [jobs, total] = await Promise.all([
    Job.find({
      expired: false,
      status: "approved",
    })
      .populate("postedBy", "name email companyInfo")
      .sort({ jobPostedOn: -1 })
      .skip(skip)
      .limit(finalLimit),
    Job.countDocuments({ expired: false, status: "approved" })
  ]);

  res.status(200).json({
    success: true,
    jobs,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / finalLimit),
      totalJobs: total,
      perPage: finalLimit,
    },
  });
});

export const postJob = catchAsyncErrors(async (req, res, next) => {
  const { role } = req.user;
  if (role === "Job Seeker") {
    return next(
      new ErrorHandler("Ứng viên không được phép truy cập tài nguyên này.", 400)
    );
  }

  const {
    title,
    description,
    category,
    city,
    location,
    workMode,
    isFlexibleTime,
    workTime,
    deadline,
    isDisabilityFriendly,
    supportedDisabilities,
    fixedSalary,
    salaryFrom,
    salaryTo,
    
  } = req.body;

  // Validation: Các trường bắt buộc
  if (!title || !description || !category || !city || !location) {
    return next(new ErrorHandler("Vui lòng cung cấp đầy đủ thông tin công việc.", 400));
  }

  // Validation: workMode
  if (!workMode) {
    return next(new ErrorHandler("Vui lòng chọn hình thức làm việc.", 400));
  }

  // Validation: deadline
  if (!deadline) {
    return next(new ErrorHandler("Vui lòng nhập hạn nộp hồ sơ.", 400));
  }

  // Validation: Kiểm tra deadline phải là ngày trong tương lai
  const deadlineDate = new Date(deadline);
  if (deadlineDate <= new Date()) {
    return next(new ErrorHandler("Hạn nộp hồ sơ phải là ngày trong tương lai.", 400));
  }

  // Validation: Lương
  if ((!salaryFrom || !salaryTo) && !fixedSalary) {
    return next(
      new ErrorHandler(
        "Vui lòng cung cấp mức lương cố định hoặc mức lương theo khoảng.",
        400
      )
    );
  }

  if (salaryFrom && salaryTo && fixedSalary) {
    return next(
      new ErrorHandler("Không thể nhập mức lương cố định và mức lương theo khoảng cùng lúc.", 400)
    );
  }

  // Validation: Lương tối thiểu (người dùng nhập bằng đơn vị triệu)
  if (fixedSalary && Number(fixedSalary) <= 0) {
    return next(new ErrorHandler("Vui lòng nhập mức lương hợp lệ.", 400));
  }

  if (salaryFrom && Number(salaryFrom) <= 0) {
    return next(new ErrorHandler("Vui lòng nhập mức lương từ hợp lệ.", 400));
  }

  if (salaryTo && Number(salaryTo) <= 0) {
    return next(new ErrorHandler("Vui lòng nhập mức lương đến hợp lệ.", 400));
  }

  if (salaryFrom && salaryTo && Number(salaryFrom) >= Number(salaryTo)) {
    return next(new ErrorHandler("Lương từ phải nhỏ hơn lương đến.", 400));
  }

  // Validation: Thời gian làm việc
  if (!isFlexibleTime && (!workTime || !workTime.start || !workTime.end)) {
    return next(new ErrorHandler("Vui lòng nhập thời gian làm việc.", 400));
  }

  // Validation: Người khiếm khuyết
  if (isDisabilityFriendly && (!supportedDisabilities || supportedDisabilities.length === 0)) {
    return next(new ErrorHandler("Vui lòng chọn ít nhất một loại khiếm khuyết được hỗ trợ.", 400));
  }

  const postedBy = req.user._id;
  const job = await Job.create({
    title,
    description,
    category,
    city,
    location,
    workMode,
    isFlexibleTime,
    workTime: isFlexibleTime ? null : workTime,
    deadline,
    isDisabilityFriendly: isDisabilityFriendly || false,
    supportedDisabilities: supportedDisabilities || [],
    fixedSalary: fixedSalary ? Number(fixedSalary) * 1000000 : undefined,
    salaryFrom: salaryFrom ? Number(salaryFrom) * 1000000 : undefined,
    salaryTo: salaryTo ? Number(salaryTo) * 1000000 : undefined,
    postedBy,
  });

  res.status(200).json({
    success: true,
    message: "Đăng tin tuyển dụng thành công!",
    job,
  });
});

export const getMyJobs = catchAsyncErrors(async (req, res, next) => {
  const { role } = req.user;
  if (role === "Job Seeker") {
    return next(
      new ErrorHandler("Ứng viên không được phép truy cập tài nguyên này.", 400)
    );
  }
  const myJobs = await Job.find({ postedBy: req.user._id });
  res.status(200).json({
    success: true,
    myJobs,
  });
});

export const updateJob = catchAsyncErrors(async (req, res, next) => {
  const { role } = req.user;
  if (role === "Job Seeker") {
    return next(
      new ErrorHandler("Ứng viên không được phép truy cập tài nguyên này.", 400)
    );
  }

  const { id } = req.params;
  let job = await Job.findById(id);
  
  if (!job) {
    return next(new ErrorHandler("OOPS! Không tìm thấy công việc.", 404));
  }

  // Kiểm tra quyền sở hữu
  if (job.postedBy.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler("Bạn không có quyền cập nhật công việc này.", 403));
  }

  // Validation: Nếu update deadline, phải là ngày trong tương lai
  if (req.body.deadline) {
    const deadlineDate = new Date(req.body.deadline);
    if (deadlineDate <= new Date()) {
      return next(new ErrorHandler("Hạn nộp hồ sơ phải là ngày trong tương lai.", 400));
    }
  }

  // Validation và xử lý lương
  const { fixedSalary, salaryFrom, salaryTo } = req.body;

  // Chuẩn bị update data
  const updateData = { ...req.body };
  const unsetFields = {};

  // Xử lý chuyển đổi loại lương
  const hasFixedSalary = fixedSalary !== undefined && fixedSalary !== null && fixedSalary !== "" && Number(fixedSalary) > 0;
  const hasSalaryRange = ((salaryFrom !== undefined && salaryFrom !== null && salaryFrom !== "" && Number(salaryFrom) > 0) ||
                         (salaryTo !== undefined && salaryTo !== null && salaryTo !== "" && Number(salaryTo) > 0));

  // Xóa tất cả salary fields khỏi updateData trước
  delete updateData.fixedSalary;
  delete updateData.salaryFrom;
  delete updateData.salaryTo;

  if (hasFixedSalary) {
    // Chuyển sang lương cố định -> set fixedSalary, xóa salaryFrom/salaryTo
    updateData.fixedSalary = Number(fixedSalary);
    unsetFields.salaryFrom = "";
    unsetFields.salaryTo = "";
  } else if (hasSalaryRange) {
    // Chuyển sang lương theo khoảng -> set salaryFrom/salaryTo, xóa fixedSalary
    unsetFields.fixedSalary = "";
    if (salaryFrom !== undefined && salaryFrom !== null && salaryFrom !== "" && Number(salaryFrom) > 0) {
      updateData.salaryFrom = Number(salaryFrom);
    }
    if (salaryTo !== undefined && salaryTo !== null && salaryTo !== "" && Number(salaryTo) > 0) {
      updateData.salaryTo = Number(salaryTo);
    }

    // Validation: salaryFrom phải nhỏ hơn salaryTo
    if (updateData.salaryFrom && updateData.salaryTo && updateData.salaryFrom >= updateData.salaryTo) {
      return next(new ErrorHandler("Lương từ phải nhỏ hơn lương đến.", 400));
    }
  }

  // Validation: Nếu update isFlexibleTime = false, phải có workTime
  if (req.body.isFlexibleTime === false && (!req.body.workTime || !req.body.workTime.start || !req.body.workTime.end)) {
    return next(new ErrorHandler("Vui lòng nhập thời gian làm việc.", 400));
  }

  // Validation: Nếu update isDisabilityFriendly = true, phải có supportedDisabilities
  if (req.body.isDisabilityFriendly === true && (!req.body.supportedDisabilities || req.body.supportedDisabilities.length === 0)) {
    return next(new ErrorHandler("Vui lòng chọn ít nhất một loại khiếm khuyết được hỗ trợ.", 400));
  }

  // Tạo update query
  const updateQuery = { $set: updateData };
  if (Object.keys(unsetFields).length > 0) {
    updateQuery.$unset = unsetFields;
  }

  job = await Job.findByIdAndUpdate(id, updateQuery, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  res.status(200).json({
    success: true,
    message: "Cập nhật công việc thành công!",
    job,
  });
});

export const deleteJob = catchAsyncErrors(async (req, res, next) => {
  const { role } = req.user;
  if (role === "Job Seeker") {
    return next(
      new ErrorHandler("Ứng viên không được phép truy cập tài nguyên này.", 400)
    );
  }

  const { id } = req.params;
  const job = await Job.findById(id);
  
  if (!job) {
    return next(new ErrorHandler("OOPS! Không tìm thấy công việc.", 404));
  }

  // Kiểm tra quyền sở hữu
  if (job.postedBy.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler("Bạn không có quyền xóa công việc này.", 403));
  }

  await job.deleteOne();
  
  res.status(200).json({
    success: true,
    message: "Xóa công việc thành công!",
  });
});

export const getSingleJob = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  try {
    const job = await Job.findById(id).populate("postedBy", "name email companyInfo");
    if (!job) {
      return next(new ErrorHandler("OOPS! Không tìm thấy công việc.", 404));
    }
    res.status(200).json({
      success: true,
      job,
    });
  } catch (error) {
    return next(new ErrorHandler(`ID không hợp lệ / Lỗi chuyển đổi`, 404));
  }
});

// Controller mới: Lọc công việc theo tiêu chí phù hợp với người khiếm khuyết
export const getDisabilityFriendlyJobs = catchAsyncErrors(async (req, res, next) => {
  const { disabilityType } = req.query;

  let filter = { 
    expired: false, 
    isDisabilityFriendly: true 
  };

  // Nếu có chỉ định loại khiếm khuyết cụ thể
  if (disabilityType) {
    filter.supportedDisabilities = disabilityType;
  }

  const jobs = await Job.find(filter);

  res.status(200).json({
    success: true,
    count: jobs.length,
    jobs,
  });
});

// Controller mới: Tìm kiếm và lọc công việc nâng cao
export const searchJobs = catchAsyncErrors(async (req, res, next) => {
  const { 
    keyword, 
    city, 
    category, 
    workMode, 
    isDisabilityFriendly,
    supportedDisability,
    salaryMin,
    salaryMax 
  } = req.query;

  let filter = { expired: false };

  // Tìm kiếm theo keyword trong title hoặc description
  if (keyword) {
    // Sanitize input to prevent NoSQL injection
    const sanitizedKeyword = String(keyword).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { title: { $regex: sanitizedKeyword, $options: 'i' } },
      { description: { $regex: sanitizedKeyword, $options: 'i' } }
    ];
  }

  // Lọc theo thành phố
  if (city) {
    const sanitizedCity = String(city).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.city = { $regex: sanitizedCity, $options: 'i' };
  }

  // Lọc theo danh mục
  if (category) {
    filter.category = category;
  }

  // Lọc theo hình thức làm việc
  if (workMode) {
    filter.workMode = workMode;
  }

  // Lọc theo công việc phù hợp người khiếm khuyết
  if (isDisabilityFriendly === 'true') {
    filter.isDisabilityFriendly = true;
  }

  // Lọc theo loại khiếm khuyết cụ thể
  if (supportedDisability) {
    filter.supportedDisabilities = supportedDisability;
  }

  // Lọc theo khoảng lương
  if (salaryMin || salaryMax) {
    filter.$or = [];
    
    if (salaryMin && salaryMax) {
      filter.$or.push(
        { 
          fixedSalary: { 
            $gte: Number(salaryMin), 
            $lte: Number(salaryMax) 
          } 
        },
        { 
          $and: [
            { salaryFrom: { $gte: Number(salaryMin) } },
            { salaryTo: { $lte: Number(salaryMax) } }
          ]
        }
      );
    } else if (salaryMin) {
      filter.$or.push(
        { fixedSalary: { $gte: Number(salaryMin) } },
        { salaryFrom: { $gte: Number(salaryMin) } }
      );
    } else if (salaryMax) {
      filter.$or.push(
        { fixedSalary: { $lte: Number(salaryMax) } },
        { salaryTo: { $lte: Number(salaryMax) } }
      );
    }
  }

  const jobs = await Job.find(filter).sort({ jobPostedOn: -1 });

  res.status(200).json({
    success: true,
    count: jobs.length,
    jobs,
  });
});

// Controller mới: Gia hạn deadline
export const extendDeadline = catchAsyncErrors(async (req, res, next) => {
  const { role } = req.user;
  if (role === "Job Seeker") {
    return next(
      new ErrorHandler("Ứng viên không được phép truy cập tài nguyên này.", 400)
    );
  }

  const { id } = req.params;
  const { newDeadline } = req.body;

  // Kiểm tra có nhập deadline mới không
  if (!newDeadline) {
    return next(new ErrorHandler("Vui lòng nhập ngày hạn mới.", 400));
  }

  // Tìm job
  const job = await Job.findById(id);
  
  if (!job) {
    return next(new ErrorHandler("OOPS! Không tìm thấy công việc.", 404));
  }

  // Kiểm tra quyền sở hữu
  if (job.postedBy.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler("Bạn không có quyền gia hạn công việc này.", 403));
  }

  const newDeadlineDate = new Date(newDeadline);
  const currentDeadline = new Date(job.deadline);
  const now = new Date();

  // Validation: Ngày mới phải sau ngày hiện tại
  if (newDeadlineDate <= now) {
    return next(new ErrorHandler("Ngày hạn mới phải là ngày trong tương lai.", 400));
  }

  // Validation: Ngày mới phải sau deadline cũ
  if (newDeadlineDate <= currentDeadline) {
    return next(new ErrorHandler("Ngày hạn mới phải sau ngày hạn hiện tại.", 400));
  }

  // Validation: Không cho phép gia hạn quá 90 ngày kể từ deadline cũ
  const maxExtendDays = 90;
  const daysDifference = Math.ceil((newDeadlineDate - currentDeadline) / (1000 * 60 * 60 * 24));
  
  if (daysDifference > maxExtendDays) {
    return next(new ErrorHandler(`Chỉ được gia hạn tối đa ${maxExtendDays} ngày kể từ hạn hiện tại.`, 400));
  }

  // Cập nhật deadline và reset expired status nếu job đã hết hạn
  job.deadline = newDeadlineDate;
  job.expired = false;
  
  await job.save();

  res.status(200).json({
    success: true,
    message: `Gia hạn thành công! Ngày hạn mới: ${newDeadlineDate.toLocaleDateString('vi-VN')}`,
    job,
  });
});