import React from 'react'
import logo from '../../assets/logo_white_color.png'
import './Chat.css'
import { Link } from 'react-router-dom'

const ChatWithUs = () => {
  return (
    <React.Fragment>
        <header className='chat_with_us_header'>
        <h1> Chat with Daisy</h1>
        </header>
    
        <div className='chat_with_us_card'>
            <div className="logo_div2">
        <img src={logo} alt="logo" />
    </div>

            <p>Hello, Nice to see you here! By pressing the "Start chat" button you agree to have your personal data processed as described in our Privacy Policy</p>

            <button className='start_chat_btn'><Link to="/chat">Start Chat</Link></button>
        </div>
    </React.Fragment>
  )
}

export default ChatWithUs
