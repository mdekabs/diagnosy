import LandingPage from "./pages/LandingPage";
import OnboardingPage from "./pages/OnboardingPage";
import {Routes, Route} from 'react-router-dom'
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import MessageParser from "./components/MessageParser";
import ActionProvider from "./components/ActionProvider";
import Config from "./components/Config";
// import {Chatbot} from 'react-chatbot-kit'
// import 'react-chatbot-kit/build/main.css';
import ChatWithUs from "./pages/Chat/ChatWithUs";
import TextChart from "./pages/Chat/TextChart";

function App() {
  return (
    <div className="App">
      <Routes>
    <Route path="/" element={<LandingPage/>}></Route>
    <Route path="/onboarding" element={<OnboardingPage/>}></Route>
    <Route path="/signup" element={<SignUp/>}></Route>
    <Route path="/login" element={<SignIn/>}></Route>
    {/* <Route path="/chatbot" element={<Chatbot className="chatbot"
     messageParser={MessageParser} 
     actionProvider={ActionProvider} 
     config={Config}
     headerText='MedChat'
      placeholderText='Type your symptoms'/>}>
     </Route> */}
     <Route path="/start_chat" element={<ChatWithUs/>}></Route>
     <Route path="/chat" element={<TextChart/>}></Route>
      </Routes>
    </div>
  );
}

export default App;
