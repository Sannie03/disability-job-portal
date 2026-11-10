import { serializeUser } from "./serializeUser.js";

export const getTokenCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    path: "/",
    secure: isProduction,
    sameSite: process.env.COOKIE_SAME_SITE || "lax",
  };
};

export const sendToken = (user, statusCode, res, message) => {
  const token = user.getJWTToken();
  const options = {
    ...getTokenCookieOptions(),
    expires: new Date(
      Date.now() + (Number(process.env.COOKIE_EXPIRE) || 7) * 24 * 60 * 60 * 1000
    ),
  };

  res.status(statusCode).cookie("token", token, options).json({
    success: true,
    user: serializeUser(user),
    message,
  });
};
