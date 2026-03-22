import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LoginPage, DashboardPage } from "./pages";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider } from "./context/AuthContext";

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" richColors />
      </div>
    </AuthProvider>
  );
}

export default App;
