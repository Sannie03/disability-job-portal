import { Link } from "react-router-dom"
import { FaGithub, FaFacebook } from "react-icons/fa"
import { RiInstagramFill } from "react-icons/ri"
import "./Footer.css"

function Footer() {
  return (
    <footer className="footerShow">
      <div>&copy; Tất cả các quyền được bảo lưu.</div>
      <div>
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
    </footer>
  )
}

export default Footer