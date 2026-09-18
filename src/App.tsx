import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";

import Login from "./pages/Login";
import POSPage from "./pages/pos/POSPage";
import ReturnPOSPage from "./pages/pos/ReturnPOSPage";
import ProtectedRoute from "./components/ProtectedRoute";
import Toast from "./components/ui/toast";
import { logoutApi } from "./api/authApi";

function Shell() {
  const [page, setPage] = useState<"pos" | "return">("pos");
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user") || "null");

  const handleLogout = async () => {
    await logoutApi();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  return (
    <>
      <Toast />

      <div className="flex items-center gap-1 p-2 bg-[#12171A] sticky top-0 z-30">
        <button
          onClick={() => setPage("pos")}
          className={`px-4 py-2 rounded-xl text-[14px] font-medium transition ${page === "pos"
            ? "bg-[#0B6E4F] text-white shadow-sm"
            : "text-white/50 hover:text-white/80 hover:bg-white/5"
            }`}
        >
          POS
        </button>

        <button
          onClick={() => setPage("return")}
          className={`px-4 py-2 rounded-xl text-[14px] font-medium transition ${page === "return"
            ? "bg-[#4338CA] text-white shadow-sm"
            : "text-white/50 hover:text-white/80 hover:bg-white/5"
            }`}
        >
          Returns
        </button>

        {/* SPACER */}
        <div className="flex-1" />

        {/* USER + LOGOUT */}
        {user && (
          <div className="flex items-center gap-3 pr-2">
            <div className="text-right leading-tight">
              <p className="text-[12px] font-medium text-white/80">
                {user.fullName || user.username}
              </p>
              <p className="text-[10px] font-mono text-white/40 uppercase">
                {user.role}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition"
            >
              Logout
            </button>
          </div>
        )}
      </div>

      {page === "pos" && <POSPage />}
      {page === "return" && <ReturnPOSPage />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Shell />
            </ProtectedRoute>
          }
        />

        {/* Any unknown path → home (which will redirect to /login if not authed) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}