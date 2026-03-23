import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LoginPage, LoadingPage, DashboardPage } from "./pages";
import { Toaster } from "./components/ui/toaster";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/loading" element={<LoadingPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </div>
  );
}

export default App;
