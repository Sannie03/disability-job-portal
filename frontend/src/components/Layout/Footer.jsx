import { Link } from "react-router-dom"
import { FaGithub, FaFacebook, FaPhoneAlt, FaEnvelope, FaMapMarkerAlt } from "react-icons/fa"
import { RiInstagramFill } from "react-icons/ri"
import "./Footer.css"

function Footer() {
  return (
    <footer className="footerShow">
      <div className="footer-content">
        {/* Cot 1: Ve chung toi */}
        <div className="footer-section">
          <h4>CareerConnect</h4>
          <p>
            Nen tang ket noi viec lam danh rieng cho nguoi khuyet tat.
            Chung toi cam ket mang den co hoi viec lam binh dang va phu hop cho tat ca moi nguoi.
          </p>
          <div className="footer-socials">
            <Link to="https://github.com/Sannie04" target="_blank" rel="noopener noreferrer">
              <FaGithub />
            </Link>
            <Link to="https://facebook.com" target="_blank" rel="noopener noreferrer">
              <FaFacebook />
            </Link>
            <Link to="https://www.instagram.com/sannie_2801/" target="_blank" rel="noopener noreferrer">
              <RiInstagramFill />
            </Link>
          </div>
        </div>

        {/* Cot 2: Dieu huong */}
        <div className="footer-section">
          <h4>Liên kết</h4>
          <ul className="footer-links">
            <li><Link to="/">Trang chủ</Link></li>
            <li><Link to="/job/getall">Việc làm</Link></li>
            <li><Link to="/login">Đăng nhập</Link></li>
            <li><Link to="/register">Đăng ký</Link></li>
          </ul>
        </div>

        {/* Cot 3: Lien he */}
        <div className="footer-section">
          <h4>Liên hệ</h4>
          <ul className="footer-contact">
            <li>
              <FaEnvelope />
              <span>tranthituyetsang.280104@gmail.com</span>
            </li>
            <li>
              <FaPhoneAlt />
              <span>0379328104</span>
            </li>
            <li>
              <FaMapMarkerAlt />
              <span>TP.Đà Nẵng</span>
            </li>
          </ul>
        </div>
      </div>

    </footer>
  )
}

export default Footer
