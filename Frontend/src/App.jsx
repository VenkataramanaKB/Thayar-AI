import { useState } from "react";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold text-blue-600">
        Vite + React + Tailwind
      </h1>
      <div className="mt-6 bg-white p-6 rounded-2xl shadow-md text-center">
        <button
          onClick={() => setCount((count) => count + 1)}
          className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 transition"
        >
          Count is {count}
        </button>
        <p className="mt-4 text-gray-600">
          Edit <code className="bg-gray-200 px-1 rounded">src/App.jsx</code> and
          save to test HMR.
        </p>
      </div>
      <p className="mt-4 text-gray-500">
        Click on the Vite and React logos to learn more.
      </p>
    </div>
  );
}

export default App;
