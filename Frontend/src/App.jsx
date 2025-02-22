import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import CreateList from "./pages/CreateList";
import ListDetail from "./pages/ListDetail";
import Explore from "./pages/Explore";

// // Protected Route component (Commented for now)
// const ProtectedRoute = ({ children }) => {
//   const token = localStorage.getItem("token");
//   return token ? children : <Navigate to="/" />;
// };

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="create" element={<CreateList />} />
          <Route path="list/:id" element={<ListDetail />} />
          <Route path="explore" element={<Explore />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
