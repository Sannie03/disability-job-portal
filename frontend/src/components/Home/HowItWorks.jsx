import React from "react";
import { FaUserPlus } from "react-icons/fa";
import { MdFindInPage } from "react-icons/md";
import { IoMdSend } from "react-icons/io";

const HowItWorks = () => {
  return (
    <>
      <div className="howitworks">
        <div className="container">
          <h3>Career Connect hoạt động như thế nào!</h3>

<div className="card">
  <FaUserPlus />
  <p>Tạo tài khoản</p>
  <p>
    Người dùng đăng ký tài khoản để bắt đầu sử dụng hệ thống.
  </p>
</div>

<div className="card">
  <MdFindInPage />
  <p>Tìm việc / Đăng tin tuyển dụng</p>
  <p>
    Người tìm việc có thể tìm kiếm công việc phù hợp, nhà tuyển dụng có thể đăng tin tuyển dụng.
  </p>
</div>

<div className="card">
  <IoMdSend />
  <p>Ứng tuyển việc làm / Tuyển dụng ứng viên phù hợp</p>
  <p>
    Ứng viên nộp hồ sơ ứng tuyển, nhà tuyển dụng lựa chọn ứng viên phù hợp.
  </p>
</div>

            </div>
          </div>
    
    </>
  );
};

export default HowItWorks;
