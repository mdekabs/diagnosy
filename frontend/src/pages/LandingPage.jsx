import React, {useEffect} from 'react'
import './Onboarding.css'
import logo from '../assets/medChat_logo.png'
import { useNavigate } from "react-router-dom"

const LandingPage = () => {
  const navigate  = useNavigate()

 useEffect(() => {
  setTimeout(() => {
    navigate("/onboarding");
  }, 5000);
});
  return (
    <>
    <div className="landing_page">
        <div className='logo_div'>
        <img src={logo} alt="med chart logo" />
    </div>
    </div>
    </>
  )
}

export default LandingPage