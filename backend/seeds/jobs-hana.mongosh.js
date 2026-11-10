// Run in mongosh connected to the intended Atlas cluster:
// load("D:/disability-job-portal/backend/seeds/jobs-hana.mongosh.js")
// Sample posts remain pending until an administrator approves them.
{
  const fs = require("fs");
  const seedDb = db.getSiblingDB("Job_Portal");
  const employerId = ObjectId("6af2e29ff064d7243d42b322");
  const employer = seedDb.users.findOne({
    _id: employerId,
    email: "hananguyen280104@gmail.com",
    role: "Employer",
  });

  if (!employer) {
    throw new Error("Không tìm thấy đúng nhà tuyển dụng trong Job_Portal. Chưa thêm dữ liệu.");
  }

  const jobs = EJSON.parse(fs.readFileSync(
    "D:/disability-job-portal/backend/seeds/jobs-hana.json", "utf8",
  ));
  const postedOn = new Date();
  const deadline = new Date(postedOn.getTime() + 30 * 24 * 60 * 60 * 1000);
  let created = 0;

  for (const template of jobs) {
    const job = {
      ...template,
      postedBy: employer._id,
      jobPostedOn: postedOn,
      deadline,
    };
    const result = seedDb.jobs.updateOne(
      { postedBy: employer._id, title: job.title },
      { $setOnInsert: job },
      { upsert: true },
    );
    created += result.upsertedCount;
  }

  print(`Đã thêm ${created} tin mẫu; ${jobs.length - created} tin đã tồn tại và được giữ nguyên.`);
  print("Các tin có trạng thái pending. Đăng nhập Admin để duyệt trước khi hiển thị công khai.");
}
