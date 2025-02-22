import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="bg-white shadow-md p-4">
      <div className="container mx-auto flex justify-between items-center">
        {/* Left - Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <img src="/logo.png" alt="Logo" className="h-10 w-10" />
          <span className="text-xl font-bold text-gray-700">MyApp</span>
        </Link>

        {/* Center - Navigation Links */}
        <div className="hidden md:flex space-x-6">
          <Link to="/dashboard" className="text-gray-600 hover:text-blue-500 font-medium">
            Dashboard
          </Link>
          <Link to="/explore" className="text-gray-600 hover:text-blue-500 font-medium">
            Explore
          </Link>
        </div>

        {/* Right - Profile */}
        <div className="flex items-center space-x-4">
          <Link to="/profile">
            <img
              src="/profile.jpg"
              alt="Profile"
              className="h-10 w-10 rounded-full border-2 border-gray-300 hover:border-blue-500 transition"
            />
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
