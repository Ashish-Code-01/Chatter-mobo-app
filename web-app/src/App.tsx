import { Routes, Route } from "react-router-dom";
import HomeScreen from "./pages/home.tsx";
import ChatScreen from "./pages/chatScreen.tsx";


function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/chat" element={<ChatScreen />} />
    </Routes>
  );
}

export default App;
