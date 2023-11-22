import React, { useState } from 'react';
import './Onboarding.css'
import OnboardingPage1Comp from '../components/OnboardingPage1Comp'
import OnboardingPage2Comp from '../components/OnboardingPage2Comp'


const OnboardingPage = () => {
  const [next, setNext] = useState(true)
  const [prev, setPrev] = useState(false)

  const handleNextClick = () => {
    setNext(false)
    setPrev(true)
  };

  const handlePrevClick = () => {
     setNext(true)
    setPrev(false)
  };
  
  return (
    <React.Fragment>
        <section className='onboarding_page_container'>
      
            <div>
              {next && <OnboardingPage1Comp next={next} prev={prev} handleNextClick={handleNextClick}/>}
              {prev && <OnboardingPage2Comp next={next} prev={prev} handlePrevClick={handlePrevClick}/>}
            </div>
          
        </section>
    </React.Fragment>
  )
}

export default OnboardingPage


