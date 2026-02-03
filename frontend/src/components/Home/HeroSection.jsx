import React from "react";
import { FaBuilding, FaSuitcase, FaUsers, FaHandsHelping } from "react-icons/fa";

const HeroSection = () => {
  const details = [
    {
      id: 1,
      title: "2,500+",
      subTitle: "Công việc phù hợp",
      icon: <FaSuitcase />,
    },
    {
      id: 2,
      title: "800+",
      subTitle: "Nhà tuyển dụng hỗ trợ",
      icon: <FaBuilding />,
    },
    {
      id: 3,
      title: "10,000+",
      subTitle: "Ứng viên đã kết nối",
      icon: <FaUsers />,
    },
    {
      id: 4,
      title: "1,200+",
      subTitle: "Việc làm hỗ trợ NKT",
      icon: <FaHandsHelping />,
    },
  ];
  return (
    <>
      <div className="heroSection">
        <div className="container">
          <div className="title">
            <h1>Kết nối cơ hội việc làm</h1>
            <h1>dành cho người khuyết tật</h1>
            <p>
              Nền tảng việc làm hỗ trợ người khuyết tật tìm kiếm công việc phù hợp
              với năng lực và kỹ năng. Kết nối với các nhà tuyển dụng cam kết tạo môi
              trường làm việc thân thiện, hòa nhập và bình đẳng.
            </p>
          </div>
          <div className="image">
            <img src="/heroS.jpg" alt="hero" />
          </div>
        </div>
        <div className="details">
          {details.map((element) => {
            return (
              <div className="card" key={element.id}>
                <div className="icon">{element.icon}</div>
                <div className="content">
                  <p>{element.title}</p>
                  <p>{element.subTitle}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default HeroSection;
