import React from 'react'
import onboardingImg2 from '../assets/onboardingImg2.png'
import { Link } from 'react-router-dom'


const OnboardingPage2Comp = (props) => {
    const {handleNextClick, handlePrevClick, next, prev} = props
  return (
        <React.Fragment>
            <section className='onboarding_page_container'>
             <div>
                <h1>Your AI Health Assistant</h1>
                <p>Sign up for free and start using our app today</p>
            </div>

        <div className='onboarding_page_img_div'>
              <img src={onboardingImg2} alt="illustration" />
          </div>
        
    <div className='flex items-center justify-center my-10'>
    <div className={`${next ? `btn_active`: `eclipse_next`} eclipse_prev mr-2`} onClick={handlePrevClick}></div>
        <div className={`${prev ? `btn_active`: `eclipse_next`} eclipse_prev mr-2`} onClick={handleNextClick}></div>
      </div>

          <button className='onboarding_btn2'><Link to="/login">Continue</Link></button>
          </section>
    </React.Fragment>

  )
}

export default OnboardingPage2Comp