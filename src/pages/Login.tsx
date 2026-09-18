import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginApi } from "../api/authApi";

export default function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const navigate = useNavigate();

    const handleLogin = async (e?: React.FormEvent) => {
        e?.preventDefault();

        if (!username.trim() || !password.trim()) {
            setError("Enter username and password");
            return;
        }

        try {
            setLoading(true);
            setError("");

            const res = await loginApi({ username, password });

            localStorage.setItem("token", res.accessToken);
            localStorage.setItem("user", JSON.stringify(res.user));

            navigate("/");
        } catch (err: any) {
            setError(
                err?.response?.data?.message || "Invalid username or password"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#12171A] flex items-center justify-center p-4 font-sans">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-5">
                {/* HEADER */}
                <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-[#0B6E4F] mx-auto flex items-center justify-center text-white font-bold text-xl">
                        K
                    </div>
                    <h1 className="text-xl font-bold mt-3 text-[#14181C]">
                        Cashier Login
                    </h1>
                    <p className="text-[13px] text-black/40 mt-0.5">
                        Karrali POS Terminal
                    </p>
                </div>

                {/* FORM */}
                <form onSubmit={handleLogin} className="space-y-3">
                    <div>
                        <label className="text-[12px] font-semibold text-black/50 uppercase tracking-wider">
                            Username
                        </label>
                        <input
                            type="text"
                            autoFocus
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username"
                            className="w-full mt-1 border border-black/10 bg-[#FAFAF8] p-3 rounded-xl text-[14px] outline-none focus:ring-2 focus:ring-[#0B6E4F]/30 focus:border-[#0B6E4F] transition"
                        />
                    </div>

                    <div>
                        <label className="text-[12px] font-semibold text-black/50 uppercase tracking-wider">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            className="w-full mt-1 border border-black/10 bg-[#FAFAF8] p-3 rounded-xl text-[14px] outline-none focus:ring-2 focus:ring-[#0B6E4F]/30 focus:border-[#0B6E4F] transition"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 text-[13px] px-3 py-2 rounded-xl">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#0B6E4F] hover:bg-[#0A5F44] text-white p-3.5 rounded-xl font-semibold tracking-wide transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {loading ? "Logging in..." : "Login"}
                    </button>
                </form>

                <p className="text-center text-[11px] text-black/30">
                    Secure POS Access Only
                </p>
            </div>
        </div>
    );
}