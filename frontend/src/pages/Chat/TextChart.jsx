import React, {useState} from 'react'
import './Chat.css'
import blue_logo from '../../assets/blue_logo_vector.png'
import input_arrow from '../../assets/input_arrow.png'
import ChatSideBar from '../../components/ChatSideBar';
import { BsList } from "react-icons/bs";
import MobileSideBar from '../../components/MobileSideBar';


const TextChart = () => {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [openBurger, setOpenBurger] =useState(false)

  const handleUserInputChange = (event) => {
    setUserInput(event.target.value);
  };

  const getCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const am_pm = hours < 12 ? "AM" : "PM"
    return `${hours}:${minutes} ${am_pm}`;
  };

  const handleSendMessage = () => {
    if (!userInput.trim()) {
      return;
    }

    const newUserMessage = {
      sender: 'User',
      message: userInput,
      timestamp: getCurrentTime(),
    };

    setUserInput('');
    setMessages([...messages, newUserMessage]);

    setTimeout(() => {
      const newBotMessage = {
        sender: 'Livechat',
        message: 'Hello there! How can I help you today?',
        timestamp: getCurrentTime(),
      };

      setMessages((prevMessages) => [...prevMessages, newBotMessage]);
    }, 1000);
  };
  const getAvatarFromName = (name) => {
  return name.charAt(0).toUpperCase(); 
};
console.log(messages.sender)
  return (
    <React.Fragment>
      <section className='flex'>
        {/* ASIDE SECTION */}
        <ChatSideBar />
        {openBurger && <MobileSideBar/>}
        {/* MAIN SECTION */}
        <section className="chat_main_container">
          <header className='chat_with_us_header'>
            <h1> Chat with Us</h1>
            <BsList className='burger' onClick={()=> setOpenBurger(!openBurger)} />
          </header>

          <article className='p-5'>
            <div className='flex items-center mt-5'>
              <div className='blue_logo_div'>
                <img src={blue_logo} alt="med chart logo" />
              </div>

              <div>
                <h2 style={{ color: "#667085", fontWeight: "800" }}>MedChat</h2>
                <p className='text-sm' style={{ color: "#667085" }}>Health Agent</p>
              </div>
            </div>

    

            <div className="bot_default_msg">
              <div className="messages">
                    <div className='bot_details_div flex items-center mt-7'>
              <div className='bot_avatar_div'>
                <img src={blue_logo} alt="med chart logo" />
              </div>
              <small className='text-xs mr-1' style={{ color: "#667085" }}>Livechat</small><span className='text-xs' style={{ color: "#667085" }}>02:30PM</span>
            </div>
                      {messages.map((message, index) => (
                    <>
                   
                  <div className={`message ${message.sender.toLowerCase()}`} key={index}>

                    <div className='message_user_details flex items-center'>
                        <div className='bot_details_div flex items-center mt-7'>
                        <div className='bot_avatar_div'>
                        {message.sender === "User" ? (<div className="bot_avatar_div"><p className='user_first_letter'>{getAvatarFromName(message.sender)}</p></div>) : (
                    <div className="bot_avatar_div">
                    <img src={blue_logo} alt="user avatar" />
                    </div>
                      )}
                    </div>
              <div className='flex'>
              <div className="message-sender text-xs mr-1"><h3>{message.sender}</h3></div>
                    <div className="message-timestamp text-xs">{message.timestamp}</div>
            </div>
            </div>
                    </div>
                 <div className="message_content text-sm" >{message.message}</div>
                    
                  </div>
                  </>
                ))}
                </div>

              <div className="message_input-container">
                <input
                  type="text"
                  value={userInput}
                  onChange={handleUserInputChange}
                  placeholder="Type your symptoms"
                />
                <button onClick={handleSendMessage}>
                  <img src={input_arrow} alt="" />
                </button>
              </div>
            </div>

          </article>
        </section>
      </section>
    </React.Fragment>
  );
};

export default TextChart;
