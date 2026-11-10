// Explicitly list fields that may be returned to a browser, even after +password.
export const serializeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  authProvider: user.authProvider,
  companyInfo: user.companyInfo,
  disabilityType: user.disabilityType,
  customDisabilityDetail: user.customDisabilityDetail,
  acceptedJobs: user.acceptedJobs,
  createdAt: user.createdAt,
});
