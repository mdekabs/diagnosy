import React from 'react'
import '../pages/Chat/Chat.css'
import blue_logo from '../assets/medChat_logo.png'
import voice_icon from '../assets/voice_call_icon.png'
import emergency_icon from '../assets/emergency_call_icon.png'
import axios from 'axios'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ChatSideBar = () => {
  const HandleSignOut = async () => {
    try {
      const token = localStorage.getItem("authToken"); 
      let url = "https://diagnosy-api.mikerock.tech/sign_out";
      let response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          'auth-token': token,
        },
      });
      if (response.status === 200 || response.status === 201 || response.status === 204){
        toast.success('Successfully logged out', { autoClose: 2000 });
      }
      console.log(response);
      console.log(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <React.Fragment>
      <aside className='chat_sidebar_container'>
        <ToastContainer/>
        <div className='side_blue_logo_div'>
          <img src={blue_logo} alt="med chart logo" />
        </div>

        <div className="call_btn">
          <img src={voice_icon} alt="" />
          <button>Voice Chat</button>
        </div>

        <div className="call_btn">
          <img src={emergency_icon} alt="" />
          <button>Emergency Chat</button>
        </div>

        <button className='sign_out_btn' onClick={HandleSignOut}>Sign Out</button>
      </aside>
    </React.Fragment>
  );
};

export default ChatSideBar;
