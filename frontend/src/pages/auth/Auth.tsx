import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { toast } from 'sonner';
import { useNavigate } from "react-router-dom";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const { setUser } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex bg-slate-100 text-slate-900">

      {/* LEFT SIDE - Branding */}
      <div className="hidden lg:flex w-1/2 relative items-center justify-center overflow-hidden border-r border-slate-200">

        {/* Background Image */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-150 h-150 bg-indigo-300 rounded-full blur-3xl opacity-40 animate-blob"></div>
          <div className="absolute w-125 h-125 bg-purple-300 rounded-full blur-3xl opacity-40 animate-blob animation-delay-2000"></div>
        </div>

        {/* Overlay */}
        <div className="absolute "></div>

        <div className="relative z-10 max-w-md text-center space-y-6 font-headline px-10">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-slate-900">
            Universal Infotech
          </h1>
          <p className="text-slate-600 text-base leading-relaxed">
            Smart inventory management for modern businesses.
            Track stock, manage sales, and scale with clarity.
          </p>

          <div className="flex justify-center gap-6 mt-6 text-sm text-slate-500">
            <span>Fast</span>
            <span>Secure</span>
            <span>Insightful</span>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center px-6">
        <div className="w-full max-w-md">

          {/* Card */}
          <div className="bg-white border border-slate-200 p-8 rounded-xl shadow-sm font-body">

            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
                {isLogin ? "Welcome back" : "Create account"}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {isLogin
                  ? "Login to continue managing your inventory"
                  : "Start managing your inventory today"}
              </p>
            </div>

            {/* Toggle */}
            <div className="flex mb-6 bg-slate-100 rounded-md p-1">
              <button
                onClick={() => setIsLogin(true)}
                className={`w-1/2 py-2 rounded-md text-sm transition ${isLogin
                    ? "bg-white border border-slate-200 text-slate-900 font-bold"
                    : "text-slate-500 font-bold"
                  }`}
              >
                Login
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`w-1/2 py-2 rounded-md text-sm transition ${!isLogin
                    ? "bg-white border border-slate-200 text-slate-900 font-bold"
                    : "text-slate-500 font-bold"
                  }`}
              >
                Register
              </button>
            </div>

            {/* Form */}
            <form className="space-y-4" onSubmit={async (e) => {
              e.preventDefault();
              try {
                if (isLogin) {
                  const resp = await fetch(`${import.meta.env.VITE_BASE_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                  });

                  if (!resp.ok) {
                    const err = await resp.json().catch(() => ({ message: 'Login failed' }));
                    toast.error(err.message || 'Login failed');
                    return;
                  }

                  const data = await resp.json();
                  console.log("login data : ", data);
                  const token = data.token;
                  // prefer server-provided user object, fall back to top-level
                  const serverUser = data.user || data;
                  const userId = serverUser?.id ?? serverUser?.userId ?? '';
                  const nameFromResp = serverUser?.name ?? '';
                  const emailFromResp = serverUser?.email ?? email;
                  setUser({ userId, name: nameFromResp, email: emailFromResp }, token);
                  toast.success('Logged in');
                  navigate('/dashboard');
                } else {
                  if (password !== confirmPassword) {
                    toast.error('Passwords do not match');
                    return;
                  }

                  const resp = await fetch(`${import.meta.env.VITE_BASE_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password }),
                  });

                  if (!resp.ok) {
                    const err = await resp.json().catch(() => ({ message: 'Register failed' }));
                    toast.error(err.message || 'Register failed');
                    return;
                  }

                  const data = await resp.json();
                  const user = data.user || data;
                  const userId = user?.id ?? user?.userId ?? '';
                  const nameFromResp = user?.name ?? '';
                  const emailFromResp = user?.email ?? email;
                  setUser({ userId, name: nameFromResp, email: emailFromResp }, null);
                  toast.success('Account created');
                  setIsLogin(true);
                  navigate('/dashboard');
                }
              } catch (err: any) {
                toast.error(err?.message || 'Network error');
              }
            }}>

              {!isLogin && (
                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                />
              )}

              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
              />

              {!isLogin && (
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                />
              )}

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 transition py-2.5 rounded-md font-medium text-white"
              >
                {isLogin ? "Login" : "Create Account"}
              </button>
            </form>

            {/* Footer */}
            <p className="text-sm text-center text-slate-500 mt-6">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="ml-1 text-indigo-600 font-medium hover:underline"
              >
                {isLogin ? "Register" : "Login"}
              </button>
            </p>
          </div>

          {/* Bottom Branding */}
          <p className="text-center text-xs text-slate-400 mt-6">
            © 2026 Universal Infotech
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;