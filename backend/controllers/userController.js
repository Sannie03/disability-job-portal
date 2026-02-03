import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import { User } from "../models/userSchema.js";
import ErrorHandler from "../middlewares/error.js";
import { sendToken } from "../utils/jwtToken.js";

export const register = catchAsyncErrors(async (req, res, next) => {
  const { name, email, phone, password, role } = req.body;
  if (!name || !email || !phone || !password || !role) {
    return next(new ErrorHandler("Vui lòng điền đầy đủ thông tin!"));
  }
  
  // Validate phone (giữ dạng chuỗi để không mất số 0 ở đầu)
  const phoneString = phone?.toString().trim();
  if (!/^\d{10}$/.test(phoneString)) {
    return next(new ErrorHandler("Vui lòng nhập số điện thoại hợp lệ (10 số)!"));
  }
  
  const isEmail = await User.findOne({ email });
  if (isEmail) {
    return next(new ErrorHandler("Email đã được đăng ký!"));
  }
  
  try {
    const user = await User.create({
      name,
      email,
      phone: phoneString,
      password,
      role,
    });
    
    if (!user) {
      return next(new ErrorHandler("Không thể tạo tài khoản. Vui lòng thử lại!"));
    }
    
    console.log("✓ User created successfully:", user.email);
    sendToken(user, 201, res, "Người dùng đã đăng ký thành công!");
  } catch (error) {
    console.error("✗ Error creating user:", error.message);
    return next(new ErrorHandler("Lỗi khi tạo tài khoản: " + error.message));
  }
});

export const login = catchAsyncErrors(async (req, res, next) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) {
    return next(new ErrorHandler("Vui lòng cung cấp email, mật khẩu và vai trò!"));
  }
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return next(new ErrorHandler("Email hoặc mật khẩu không hợp lệ.", 400));
  }
  const isPasswordMatched = await user.comparePassword(password);
  if (!isPasswordMatched) {
    return next(new ErrorHandler("Email hoặc mật khẩu không hợp lệ.", 400));
  }
  if (user.role !== role) {
    return next(
      new ErrorHandler(`Người dùng với email và vai trò ${role} không tìm thấy!`, 404)
    );
  }
  sendToken(user, 201, res, "Người dùng đã đăng nhập thành công!");
});

// Đăng nhập/đăng ký qua Google
export const googleLogin = catchAsyncErrors(async (req, res, next) => {
  const { tokenId, role } = req.body;

  console.log("Google login request:", { tokenId: tokenId ? "có" : "không", role });

  if (!tokenId) {
    return next(new ErrorHandler("Thiếu token từ Google!"));
  }

  // Không cho phép đăng nhập Google với vai trò Admin
  if (role === "Admin") {
    return next(new ErrorHandler("Không thể đăng nhập Google với vai trò Quản trị viên!"));
  }

  try {
    // Verify Google token
    const { OAuth2Client } = await import("google-auth-library");
    const client = new OAuth2Client(process.env.VITE_GOOGLE_CLIENT_ID);

    console.log("Verifying token with client ID:", process.env.VITE_GOOGLE_CLIENT_ID);

    const ticket = await client.verifyIdToken({
      idToken: tokenId,
      audience: process.env.VITE_GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;

    console.log("Google user info:", { email, name, googleId });

    if (!email || !name || !googleId) {
      return next(new ErrorHandler("Không thể lấy thông tin từ Google!"));
    }

    // Kiểm tra email đã tồn tại chưa
    let user = await User.findOne({ email });

    if (user) {
      console.log("User đã tồn tại:", user.email);

      // Nếu tài khoản được tạo bằng local auth → không cho đăng nhập Google
      if (user.authProvider === "local") {
        return next(
          new ErrorHandler("Email này đã được đăng ký bằng mật khẩu. Vui lòng đăng nhập bằng email và mật khẩu.")
        );
      }

      // Nếu tài khoản được tạo bằng Google nhưng googleId khác → không cho
      if (user.googleId && user.googleId !== googleId) {
        return next(
          new ErrorHandler("Email này đã được liên kết với tài khoản Google khác!")
        );
      }

      // Không cho phép user có role Admin đăng nhập bằng Google
      if (user.role === "Admin") {
        return next(new ErrorHandler("Quản trị viên không thể đăng nhập bằng Google!"));
      }

      // Nếu tài khoản Google đã tồn tại → cập nhật googleId nếu chưa có
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    } else {
      // Email chưa tồn tại → tạo tài khoản mới
      console.log("Tạo user mới");
      user = await User.create({
        name,
        email,
        googleId,
        role: role || "Job Seeker",
        authProvider: "google",
      });
    }

    sendToken(user, 201, res, "Đăng nhập Google thành công!");
  } catch (error) {
    console.error("Google login error:", error);
    return next(new ErrorHandler("Token Google không hợp lệ!"));
  }
});

export const logout = catchAsyncErrors(async (req, res, next) => {
  res
    .status(201)
    .cookie("token", "", {
      httpOnly: true,
      expires: new Date(Date.now()),
    })
    .json({
      success: true,
      message: "Đăng xuất thành công!",
    });
});


export const getUser = catchAsyncErrors((req, res, next) => {
  const user = req.user;
  res.status(200).json({
    success: true,
    user,
  });
});

// @desc    Update user profile
// @route   PUT /api/v1/user/update
// @access  Private
export const updateProfile = catchAsyncErrors(async (req, res, next) => {
  const { name, email, phone, currentPassword, newPassword, companyInfo } = req.body;

  // Find user with password field
  const user = await User.findById(req.user.id).select("+password");

  if (!user) {
    return next(new ErrorHandler("Người dùng không tồn tại", 404));
  }

  // Update basic info
  if (name) {
    if (name.length < 3) {
      return next(new ErrorHandler("Tên phải chứa ít nhất 3 ký tự", 400));
    }
    user.name = name;
  }

  if (phone) {
    const phoneString = phone.toString().trim();
    if (!/^\d{10}$/.test(phoneString)) {
      return next(new ErrorHandler("Số điện thoại phải có 10 chữ số", 400));
    }
    user.phone = phoneString;
  }

  // Check if user wants to update email
  if (email && email !== user.email) {
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return next(new ErrorHandler("Email đã được sử dụng", 400));
    }
    user.email = email;
  }

  // Update company info for Employer
  if (user.role === "Employer" && companyInfo) {
    // Validate company info
    if (companyInfo.companyName && companyInfo.companyName.length > 100) {
      return next(new ErrorHandler("Tên công ty không được vượt quá 100 ký tự", 400));
    }
    if (companyInfo.address && companyInfo.address.length > 200) {
      return next(new ErrorHandler("Địa chỉ không được vượt quá 200 ký tự", 400));
    }
    if (companyInfo.description && companyInfo.description.length > 1000) {
      return next(new ErrorHandler("Mô tả không được vượt quá 1000 ký tự", 400));
    }

    user.companyInfo = {
      companyName: companyInfo.companyName?.trim() || "",
      companySize: companyInfo.companySize || "",
      website: companyInfo.website?.trim() || "",
      address: companyInfo.address?.trim() || "",
      description: companyInfo.description?.trim() || "",
    };
  }

  // Update password if provided
  if (newPassword) {
    // For local auth users, require current password
    if (user.authProvider === "local") {
      if (!currentPassword) {
        return next(
          new ErrorHandler("Vui lòng nhập mật khẩu hiện tại", 400)
        );
      }

      const isPasswordMatched = await user.comparePassword(currentPassword);
      if (!isPasswordMatched) {
        return next(new ErrorHandler("Mật khẩu hiện tại không đúng", 401));
      }
    }

    // Validate new password
    if (newPassword.length < 8) {
      return next(
        new ErrorHandler("Mật khẩu mới phải chứa ít nhất 8 ký tự", 400)
      );
    }

    user.password = newPassword;
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: "Cập nhật thông tin thành công",
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      authProvider: user.authProvider,
      companyInfo: user.companyInfo,
    },
  });
});