import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/admin/Dashboard";
import Products from "./pages/admin/Products";
import AuthPage from "./pages/auth/Auth";
import AdminRoutes from "./components/AdminRoutes";
import Purchases from "./pages/admin/Purchases";
import SalesPage from "./pages/admin/Sales";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthPage />} />

        {/* public */}
        <Route path="/" element={<AuthPage />} />

        {/* admin area - all child routes share the same layout and protection */}
        <Route element={<AdminRoutes />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/purchases" element={<Purchases />} />
          <Route path="/sales" element={<SalesPage />} />
          {/* add more admin child routes here */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;