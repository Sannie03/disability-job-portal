import React from "react";
import { FaBuilding, FaHandsHelping, FaUsers } from "react-icons/fa";

const PopularCompanies = () => {
  const companies = [
    {
      id: 1,
      title: "Công ty TNHH Công nghệ ABC",
      location: "Hà Nội",
      openPositions: 15,
      icon: <FaBuilding />,
    },
    {
      id: 2,
      title: "Tập đoàn XYZ Việt Nam",
      location: "Thành phố Hồ Chí Minh",
      openPositions: 22,
      icon: <FaHandsHelping />,
    },
    {
      id: 3,
      title: "Công ty Cổ phần DEF",
      location: "Đà Nẵng",
      openPositions: 18,
      icon: <FaUsers />,
    },
  ];
  return (
    <div className="companies">
      <div className="container">
        <h3>NHÀ TUYỂN DỤNG HÀNG ĐẦU</h3>
        <div className="banner">
          {companies.map((element) => {
            return (
              <div className="card" key={element.id}>
                <div className="content">
                  <div className="icon">{element.icon}</div>
                  <div className="text">
                    <p>{element.title}</p>
                    <p>{element.location}</p>
                  </div>
                </div>
                <button>Đang tuyển {element.openPositions} vị trí</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PopularCompanies;
