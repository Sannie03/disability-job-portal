// API salary inputs use millions of VND; job responses and edit fields use VND.
export const salaryForUpdate = (job) => job.salaryType === "fixed"
  ? { fixedSalary: Number(job.fixedSalary) / 1000000, salaryFrom: "", salaryTo: "" }
  : { fixedSalary: "", salaryFrom: Number(job.salaryFrom) / 1000000, salaryTo: Number(job.salaryTo) / 1000000 };
