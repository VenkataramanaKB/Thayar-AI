import { Outlet } from "react-router-dom";

function Layout() {
  return (
    <div className="container mx-auto p-6">
      <Outlet />
    </div>
  );
}

export default Layout;
