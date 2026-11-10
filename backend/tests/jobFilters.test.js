import assert from "node:assert/strict";
import { test } from "node:test";
import { buildJobFilter, paginationFor } from "../utils/jobFilters.js";

test("public search always excludes unapproved, expired and deleted jobs", () => {
  const filter = buildJobFilter({ status: "pending", expired: "true" });
  assert.equal(filter.status, "approved");
  assert.equal(filter.expired, false);
  assert.deepEqual(filter.isDeleted, { $ne: true });
  assert.ok(filter.deadline.$gte instanceof Date);
});

test("keyword and salary filters compose instead of overwriting each other", () => {
  const filter = buildJobFilter({ keyword: "C++ (React)", salaryMin: "5000000", salaryMax: "10000000" });
  assert.equal(filter.$and.length, 2);
  const regex = filter.$and[0].$or[0].title.$regex;
  assert.equal(regex, "C\\+\\+ \\(React\\)");
  const salary = filter.$and[1].$or;
  assert.deepEqual(salary[0].fixedSalary, { $gte: 5000000, $lte: 10000000 });
  // Ranged salaries overlap the requested interval, matching the old UI semantics.
  assert.equal(salary[1].salaryTo.$gte, 5000000);
  assert.equal(salary[1].salaryFrom.$lte, 10000000);
});

test("page offset uses the effective capped page size", () => {
  assert.deepEqual(paginationFor({ page: "2", limit: "100" }), { page: 2, limit: 10, skip: 10 });
  for (const query of [{ page: "-1" }, { page: "1.5" }, { limit: "0" }]) {
    assert.throws(() => paginationFor(query), { statusCode: 400 });
  }
});

test("invalid salary bounds fail as client errors", () => {
  for (const query of [{ salaryMin: "bad" }, { salaryMax: "-1" }, { salaryMin: "10", salaryMax: "5" }]) {
    assert.throws(() => buildJobFilter(query), { statusCode: 400 });
  }
});
