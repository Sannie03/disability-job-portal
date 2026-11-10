import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { once } from "node:events";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { User } from "../models/userSchema.js";
import { Application } from "../models/applicationSchema.js";
import { Job } from "../models/jobSchema.js";
import { Notification } from "../models/notificationSchema.js";

process.env.JWT_SECRET_KEY = "test-login-secret-000000000000000000000000000";
process.env.ASL_TOKEN_SECRET = "test-asl-secret-00000000000000000000000000000";
process.env.JWT_EXPIRE = "7d";
process.env.COOKIE_EXPIRE = "7";
process.env.NODE_ENV = "production";
const { default: app } = await import("../app.js");

const employerId = "111111111111111111111111";
const applicantId = "222222222222222222222222";
const roomId = "333333333333333333333333";
let server, baseURL;
before(async () => {
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  baseURL = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });

function replace(t, object, key, replacement) {
  const original = object[key];
  object[key] = replacement;
  t.after(() => { object[key] = original; });
}
async function request(path, { user, body, method = "POST", ...options } = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (user) headers.Cookie = `token=${jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET_KEY)}`;
  return fetch(`${baseURL}/api/v1${path}`, {
    ...options, method, headers, body: body === undefined ? undefined : JSON.stringify(body),
  });
}
function application(overrides = {}) {
  return {
    _id: roomId, employerID: { user: employerId }, applicantID: { user: applicantId },
    status: "scheduled", interviewResponse: "confirmed",
    interviewSchedule: { mode: "ASL", date: "2099-01-01", time: "10:00" }, ...overrides,
  };
}

test("public registration rejects Admin and unknown roles before writing a user", async (t) => {
  replace(t, User, "create", () => { assert.fail("must not create user"); });
  replace(t, User, "findOne", () => { assert.fail("must not query for forbidden role"); });
  for (const role of ["Admin", "admin", "Owner"]) {
    const response = await request("/user/register", { body: {
      name: "Test User", email: "test@example.com", phone: "0123456789", password: "password123", role,
    } });
    assert.equal(response.status, 403);
  }
});

test("valid registration returns profile and a secure cookie without password/hash or googleId", async (t) => {
  replace(t, User, "findOne", async () => null);
  replace(t, User, "create", async (input) => new User({
    ...input, password: await bcrypt.hash(input.password, 4), googleId: "private-provider-id",
  }));
  const response = await request("/user/register", { body: {
    name: "Test User", email: "test@example.com", phone: "0123456789", password: "password123", role: "Employer",
  } });
  assert.equal(response.status, 201);
  const cookie = response.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  const { user } = await response.json();
  assert.equal(user.role, "Employer");
  assert.equal(user.password, undefined);
  assert.equal(user.googleId, undefined);
});

test("local login verifies the password but never returns the selected password hash", async (t) => {
  const user = new User({ name: "Test User", email: "test@example.com", role: "Employer",
    password: await bcrypt.hash("password123", 4) });
  replace(t, User, "findOne", () => ({ select: async () => user }));
  const response = await request("/user/login", { body: { email: user.email, password: "password123", role: user.role } });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).user.password, undefined);
});

test("password login for a Google-only account is a handled client error", async (t) => {
  replace(t, User, "findOne", () => ({ select: async () => new User({
    name: "Google User", email: "google@example.com", role: "Job Seeker", authProvider: "google",
  }) }));
  const response = await request("/user/login", { body: { email: "google@example.com", password: "invalid", role: "Job Seeker" } });
  assert.equal(response.status, 400);
});

test("Google login rejects a forbidden role without calling Google", async () => {
  const response = await request("/user/google-login", { body: { tokenId: "test", role: "Admin" } });
  assert.equal(response.status, 403);
});

test("ASL grant rejects anonymous, unrelated, unconfirmed, wrong-mode and expired access", async (t) => {
  const user = new User({ _id: employerId, name: "Employer", email: "hr@example.com", role: "Employer" });
  replace(t, User, "findById", async () => user);
  let record = application();
  replace(t, Application, "findById", async () => record);
  assert.equal((await request(`/application/interview-access/${roomId}`)).status, 401);
  record = application({ employerID: { user: applicantId } });
  assert.equal((await request(`/application/interview-access/${roomId}`, { user })).status, 403);
  record = application({ interviewResponse: undefined });
  assert.equal((await request(`/application/interview-access/${roomId}`, { user })).status, 403);
  record = application({ interviewSchedule: { mode: "Online", date: "2099-01-01" } });
  assert.equal((await request(`/application/interview-access/${roomId}`, { user })).status, 403);
  record = application({ interviewSchedule: { mode: "ASL", date: "2020-01-01" } });
  assert.equal((await request(`/application/interview-access/${roomId}`, { user })).status, 403);
});

test("room tickets are bound to the authenticated subject, role, audience and application", async (t) => {
  replace(t, Application, "findById", async () => application());
  let currentUser;
  replace(t, User, "findById", async () => currentUser);
  for (const [id, role] of [[employerId, "Employer"], [applicantId, "Job Seeker"]]) {
    currentUser = new User({ _id: id, name: "Test User", email: "test@example.com", role });
    const response = await request(`/application/interview-access/${roomId}`, {
      user: currentUser, body: { role: "Admin", room_id: "444444444444444444444444" },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const { token } = await response.json();
    const claims = jwt.verify(token, process.env.ASL_TOKEN_SECRET, {
      algorithms: ["HS256"], audience: "asl-interview", issuer: "careerconnect-api",
    });
    assert.equal(claims.sub, id);
    assert.equal(claims.role, role);
    assert.equal(claims.room_id, roomId);
    assert.ok(claims.exp - claims.iat <= 7200);
    assert.throws(() => jwt.verify(token, process.env.JWT_SECRET_KEY));
  }
});

test("room tickets fail closed when the shared ASL secret is missing", async (t) => {
  const user = new User({ _id: employerId, name: "Employer", email: "hr@example.com", role: "Employer" });
  replace(t, User, "findById", async () => user);
  replace(t, Application, "findById", async () => application());
  const previous = process.env.ASL_TOKEN_SECRET;
  delete process.env.ASL_TOKEN_SECRET;
  t.after(() => { process.env.ASL_TOKEN_SECRET = previous; });
  assert.equal((await request(`/application/interview-access/${roomId}`, { user })).status, 503);
});

test("getuser never serializes password even if a selected document contains it", async (t) => {
  const user = new User({ _id: employerId, name: "Test User", email: "test@example.com", role: "Employer", password: "secret-hash" });
  replace(t, User, "findById", async () => user);
  const response = await request("/user/getuser", { user, method: "GET" });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).user.password, undefined);
});

test("notification interview response uses application ID and rejects stale schedules", async (t) => {
  const user = new User({ _id: applicantId, name: "Candidate", email: "test@example.com", role: "Job Seeker" });
  replace(t, User, "findById", async () => user);
  let saves = 0;
  const record = application({ save: async () => { saves++; } });
  replace(t, Application, "findById", () => ({ populate: async () => record }));
  replace(t, Notification, "create", async () => ({}));
  replace(t, Notification, "updateMany", async () => ({}));
  const stale = await request(`/application/interview-response/${roomId}`, { user, method: "PUT",
    body: { response: "confirmed", interviewDate: "2098-01-01", interviewTime: "10:00" } });
  assert.equal(stale.status, 409);
  assert.equal(saves, 0);
  const response = await request(`/application/interview-response/${roomId}`, { user, method: "PUT",
    body: { response: "confirmed", interviewDate: "2099-01-01", interviewTime: "10:00" } });
  assert.equal(response.status, 200);
  assert.equal(saves, 1);
});

test("public job detail hides unapproved jobs", async (t) => {
  replace(t, Job, "findById", () => ({ populate: async () => ({ status: "pending", isDeleted: false }) }));
  assert.equal((await request(`/job/${roomId}`, { method: "GET" })).status, 404);
});

test("CORS allows the configured website and denies unknown origins; preflight succeeds", async () => {
  const allowed = await request("/user/getuser", { method: "OPTIONS", headers: { Origin: "https://52hzconnect.site", "Access-Control-Request-Method": "GET" } });
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get("access-control-allow-origin"), "https://52hzconnect.site");
  assert.equal(allowed.headers.get("access-control-allow-credentials"), "true");
  const denied = await request("/user/getuser", { method: "GET", headers: { Origin: "https://untrusted.example" } });
  assert.equal(denied.headers.get("access-control-allow-origin"), null);
});
