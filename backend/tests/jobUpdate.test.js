import assert from "node:assert/strict";
import { test } from "node:test";
import { Job } from "../models/jobSchema.js";
import { updateJob } from "../controllers/jobController.js";
import { salaryForUpdate } from "../../frontend/src/utils/jobSalary.js";

async function callUpdate(req) {
  return new Promise((resolve, reject) => {
    updateJob(req, { status: () => ({ json: resolve }) }, reject);
  });
}

test("editing a job without changing its salary preserves the amount in VND", async (t) => {
  const employer = "111111111111111111111111";
  const record = new Job({ _id: "333333333333333333333333", postedBy: employer,
    fixedSalary: 8000000, expired: true, deadline: "2099-01-01", isFlexibleTime: true });
  let saves = 0;
  record.save = async () => { saves++; return record; };
  const original = Job.findById;
  Job.findById = async () => record;
  t.after(() => { Job.findById = original; });
  await callUpdate({ params: { id: record.id }, user: { _id: employer }, body: {
    ...salaryForUpdate({ salaryType: "fixed", fixedSalary: record.fixedSalary }),
    deadline: record.deadline.toISOString(), expired: true,
  } });
  assert.equal(record.fixedSalary, 8000000);
  assert.equal(record.expired, true);
  assert.equal(saves, 1);
});

test("changing fixed salary to a range removes the old fixed amount", async (t) => {
  const employer = "111111111111111111111111";
  const record = new Job({ _id: "333333333333333333333333", postedBy: employer, fixedSalary: 8000000 });
  record.save = async () => record;
  const original = Job.findById;
  Job.findById = async () => record;
  t.after(() => { Job.findById = original; });
  await callUpdate({ params: { id: record.id }, user: { _id: employer }, body:
    salaryForUpdate({ salaryType: "range", salaryFrom: 5500000, salaryTo: 10000000 }),
  });
  assert.equal(record.fixedSalary, undefined);
  assert.equal(record.salaryFrom, 5500000);
  assert.equal(record.salaryTo, 10000000);
});
