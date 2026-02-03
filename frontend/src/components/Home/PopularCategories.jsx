import React from "react";
import {
  MdOutlineDesignServices,
  MdSupportAgent,
  MdAccountBalance,
  MdComputer,
} from "react-icons/md";
import { FaEdit, FaHeadset, FaChalkboardTeacher, FaWarehouse } from "react-icons/fa";

const PopularCategories = () => {
  const categories = [
    {
      id: 1,
      title: "Thiết kế đồ họa",
      subTitle: "180 vị trí tuyển dụng",
      icon: <MdOutlineDesignServices />,
    },
    {
      id: 2,
      title: "Biên tập nội dung",
      subTitle: "250 vị trí tuyển dụng",
      icon: <FaEdit />,
    },
    {
      id: 3,
      title: "Hỗ trợ khách hàng",
      subTitle: "320 vị trí tuyển dụng",
      icon: <FaHeadset />,
    },
    {
      id: 4,
      title: "Lập trình viên",
      subTitle: "400 vị trí tuyển dụng",
      icon: <MdComputer />,
    },
    {
      id: 5,
      title: "Kế toán - Tài chính",
      subTitle: "150 vị trí tuyển dụng",
      icon: <MdAccountBalance />,
    },
    {
      id: 6,
      title: "Nhân viên tổng đài",
      subTitle: "280 vị trí tuyển dụng",
      icon: <MdSupportAgent />,
    },
    {
      id: 7,
      title: "Giáo viên - Đào tạo",
      subTitle: "120 vị trí tuyển dụng",
      icon: <FaChalkboardTeacher />,
    },
    {
      id: 8,
      title: "Thủ kho - Hành chính",
      subTitle: "200 vị trí tuyển dụng",
      icon: <FaWarehouse />,
    },
  ];
  return (
    <div className="categories">
      <h3>NGÀNH NGHỀ PHỔ BIẾN</h3>
      <div className="banner">
        {categories.map((element) => {
          return (
            <div className="card" key={element.id}>
              <div className="icon">{element.icon}</div>
              <div className="text">
                <p>{element.title}</p>
                <p>{element.subTitle}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PopularCategories;
