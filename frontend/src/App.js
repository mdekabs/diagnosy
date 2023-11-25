import LandingPage from "./pages/LandingPage";
import OnboardingPage from "./pages/OnboardingPage";
import {Routes, Route} from 'react-router-dom'
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
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
     <Route path="/start_chat" element={<ChatWithUs/>}></Route>
     <Route path="/chat" element={<TextChart/>}></Route>
      </Routes>
    </div>
  );
}

export default App;
