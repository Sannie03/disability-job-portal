import React from "react";
import { Link } from "react-router-dom";

const Home = () => {
  return (
    <section className="homePage">

      {/* ===== HERO — Ảnh nền cinematic ===== */}
      <div className="home-hero">
        <img src="/heroS.jpg" alt="" className="home-hero-bg" />
        <div className="home-hero-overlay"></div>
        <div className="home-hero-text">
          <h1>
            Năng lực không có
            <br />
            <span>giới hạn.</span>
          </h1>
          <p>
            CareerConnect — nền tảng việc làm nơi người khuyết tật
            được đánh giá bằng khả năng, không phải bằng khiếm khuyết.
          </p>
          <Link to="/job/getall" className="home-hero-btn">
            Khám phá cơ hội
          </Link>
        </div>
      </div>

      {/* ===== MANIFESTO — 3 tuyên ngôn lớn ===== */}
      <div className="manifesto">
        <div className="manifesto-item">
          <span className="manifesto-num">01</span>
          <h2>Công bằng, <em>không phải</em> đặc cách.</h2>
          <p>
            Mọi ứng viên đều được đánh giá qua năng lực thực sự.
            Lọc công việc theo loại khuyết tật, hình thức từ xa, thời gian linh hoạt.
          </p>
        </div>
        <div className="manifesto-item">
          <span className="manifesto-num">02</span>
          <h2>Kết nối, <em>không phải</em> từ thiện.</h2>
          <p>
            Nhà tuyển dụng tìm nhân sự tài năng. Ứng viên tìm môi trường phù hợp.
            Đôi bên cùng có lợi.
          </p>
        </div>
        <div className="manifesto-item">
          <span className="manifesto-num">03</span>
          <h2>Hành động, <em>không phải</em> lời hứa.</h2>
          <p>
            Hồ sơ trực tuyến. Phỏng vấn qua hệ thống. Kết quả trong vài tuần.
            Không chờ đợi, không rào cản.
          </p>
        </div>
      </div>

      {/* ===== VOICES — Quote editorial xen kẽ ===== */}
      <div className="voices">
        <h2 className="voices-title">Tiếng nói thật</h2>

        <div className="voice-block voice-left">
          <blockquote>
            "Được đánh giá bằng code, không phải bằng đôi chân."
          </blockquote>
          <div className="voice-meta">
            <span className="voice-name">Nguyễn Văn Minh</span>
            <span className="voice-detail">Frontend Developer</span>
            <span className="voice-tag">Khuyết tật vận động</span>
          </div>
          <p className="voice-story">
            2 năm bị từ chối vì văn phòng không có lối xe lăn.
            Qua CareerConnect, lọc việc từ xa — nhận offer sau 3 tuần.
          </p>
        </div>

        <div className="voice-block voice-right">
          <blockquote>
            "Tôi được đánh giá bằng con số, không phải bằng thính giác."
          </blockquote>
          <div className="voice-meta">
            <span className="voice-name">Lê Thị Thu Hà</span>
            <span className="voice-detail">Nhân viên Kế toán</span>
            <span className="voice-tag">Khiếm thính 80%</span>
          </div>
          <p className="voice-story">
            Tốt nghiệp giỏi nhưng phỏng vấn bằng lời luôn thất bại.
            Tìm được NTD hỗ trợ giao tiếp bằng văn bản — lần đầu được thể hiện đúng năng lực.
          </p>
        </div>

        <div className="voice-block voice-left voice-employer">
          <blockquote>
            "Không phải từ thiện — họ là nhân sự xuất sắc mà chúng tôi không biết cách tìm."
          </blockquote>
          <div className="voice-meta">
            <span className="voice-name">Trần Thị Hương</span>
            <span className="voice-detail">Giám đốc Nhân sự · Tập đoàn XYZ</span>
            <span className="voice-tag employer">Nhà tuyển dụng</span>
          </div>
          <p className="voice-story">
            Tuyển được 15 nhân viên khuyết tật trong 6 tháng.
            Đăng tuyển với tiêu chí hỗ trợ rõ ràng, nhận hồ sơ chất lượng.
          </p>
        </div>
      </div>

      {/* ===== CTA ===== */}
      <div className="home-cta">
        <h2>Bạn sẵn sàng chưa?</h2>
        <div className="home-cta-buttons">
          <Link to="/job/getall" className="cta-main">Tìm việc ngay</Link>
          <Link to="/register" className="cta-ghost">Tạo tài khoản</Link>
        </div>
      </div>

    </section>
  );
};

export default Home;
