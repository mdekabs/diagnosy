import React, {useState} from 'react'
import './Chat.css'
import blue_logo from '../../assets/blue_logo_vector.png'
import input_arrow from '../../assets/input_arrow.png'
import ChatSideBar from '../../components/ChatSideBar';
import Hamburger from '../../components/Hamburger';

// const TextChart = () => {
//   const [messages, setMessages] = useState([]);
//   const [botMessages, setBotMessages] = useState([]);
//   const [userInput, setUserInput] = useState('');

//   const handleUserInputChange = (event) => {
//     setUserInput(event.target.value);
//   };

//   const handleSendMessage = () => {
//     const newMessage = {
//       sender: 'User',
//       message: userInput,
//     };

//     setUserInput('');
//     setMessages([...messages, newMessage]);

//     setTimeout(() => {
//       const botMessage = {
//         sender: 'Bot',
//         message: 'Hello there! How can I help you today?',
//       };

//       setBotMessages([...botMessages, botMessage]);
//     }, 1000);
//   };

//   return (
//     <React.Fragment>
//       <header className='chat_with_us_header'>
//         <h1> Chat with Us</h1>
//       </header>

//       <section className="chat_main_container">
//         {/* ... other components ... */}
//       <div className='flex items-center mt-5'>
//             <div className='blue_logo_div'>
//                 <img src={blue_logo} alt="med chart logo" />
//             </div>

//             <div>
//                 <h2 style={{color: "#667085", fontWeight: "800"}}>MedChat</h2>
//                 <p className='text-sm' style={{color: "#667085"}}>Health Agent</p>
//             </div>
//         </div>

//         <div className='bot_details_div flex items-center mt-7'>
//              <div className='bot_avatar_div'>
//                 <img src={blue_logo} alt="med chart logo" />
//             </div>
//             <small className='text-xs mr-1' style={{color: "#667085"}}>Livechat</small><span className='text-xs' style={{color: "#667085"}}>02:30PM</span>
//         </div>
//          <div className="bot_default_msg">
//           <div className="messages">
//             {botMessages.map((message) => (
//               <div className={`message bot`} key={message.sender + message.message}>
//                 {message.message}
//               </div>
//             ))}
//           </div>

//           <div className="messages">
//             {messages.map((message) => (
//               <div className={`message user`} key={message.sender + message.message}>
//                 {message.message}
//               </div>
//             ))}
//           </div> 

//           <div className="input-container">
//             <input
//               type="text"
//               value={userInput}
//               onChange={handleUserInputChange}
//               placeholder="Enter your message..."
//             />
//             <button onClick={handleSendMessage}>Send</button>
//           </div>
//         </div>
//       </section>
//     </React.Fragment>
//   );
// };

// export default TextChart;


const TextChart = () => {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');

  const handleUserInputChange = (event) => {
    setUserInput(event.target.value);
  };

const handleSendMessage = () => {
     if (!userInput.trim()) {
    return;
  }

  const newUserMessage = {
    sender: 'User',
    message: userInput,
  };

  setUserInput('');
  setMessages([...messages, newUserMessage]);
    

  setTimeout(() => {
    const newBotMessage = {
      sender: 'Bot',
      message: 'Hello there! How can I help you today?',
    };

    setMessages((prevMessages) => [...prevMessages, newBotMessage]);
  }, 1000);
};

  return (
    <React.Fragment>
        <section className='flex'>
            {/* ASIDE SECTION */}
        <ChatSideBar/>

{/* MAIN SECTION */}
       <section className="chat_main_container">

        <header className='chat_with_us_header'>
         <h1> Chat with Us</h1>
         {/* <Hamburger/> */}
       </header>

        <article className='p-5'>
       <div className='flex items-center mt-5'>
             <div className='blue_logo_div'>
                 <img src={blue_logo} alt="med chart logo" />
            </div>

             <div>
                 <h2 style={{color: "#667085", fontWeight: "800"}}>MedChat</h2>
                 <p className='text-sm' style={{color: "#667085"}}>Health Agent</p>
             </div>
         </div>

         <div className='bot_details_div flex items-center mt-7'>
              <div className='bot_avatar_div'>
                 <img src={blue_logo} alt="med chart logo" />
             </div>
             <small className='text-xs mr-1' style={{color: "#667085"}}>Livechat</small><span className='text-xs' style={{color: "#667085"}}>02:30PM</span>
        </div>

      <div className="bot_default_msg">
        <div className="messages">
          {messages.map((message, index) => (
            <div className={`message ${message.sender.toLowerCase()}`} key={index}>
              {message.message}
            </div>
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
