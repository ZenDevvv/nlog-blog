
import { useState } from "react";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Navbar from "./components/Navbar";
import Single from "./pages/Single"
import Register from "./pages/Register"
import Profile from "./pages/Profile"

const Layout = () => {
  
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        path: "/",
        element: <Home />
      },
      {
        path: "/post/:id",
        element: <Single />
      },
      {
        path: "/profile/:id",
        element: <Profile />
      },
      {
        path: "/posts/search",
        element: <Home />
      },
      {
        path: "/trending",
        element: <Home />
      }
    ]
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
]);

function App() {
  return (
    <main className="bg-darkBg h-screen w-screen min-w-[365px] overflow-x-hidden">
      <div className="font-sans bg-darkBg ">
        <RouterProvider router={router} />
      </div>
    </main>
  );
}

export default App;
