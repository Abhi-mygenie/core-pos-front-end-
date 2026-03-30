import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LoginPage, LoadingPage, DashboardPage, ReportsPage } from "./pages";
import { Toaster } from "./components/ui/toaster";
import { AppProviders } from "./contexts";

function App() {
  return (
    <AppProviders>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/loading" element={<LoadingPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </div>
    </AppProviders>
  );
}

export default App;
