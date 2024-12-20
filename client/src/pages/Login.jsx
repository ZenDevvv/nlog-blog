import React, { useContext, useEffect, useState } from "react";
import sideImg from "../assets/auth/sidebg.png";
import axios from "axios";
const SERVER = import.meta.env.VITE_DEV_SERVER;
import Notif from "../components/Notif";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useNotif } from "../context/NotifContext";

export default function Login() {
  const [inputs, setInputs] = useState({
    username: "",
    password: "",
  });
  const { notifyError, notifySuccess, error, success } = useNotif();
  const { currentUser, setCurrentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [databaseLoading, setDatabaseLoading] = useState(true);
  const [databaseError, setDatabaseError] = useState(null);

  useEffect(() => {
    const databaseConnect = async () => {
      try {
        console.log(SERVER);
        const res = await axios.get(`${SERVER}/`);
        console.log(res.data);
        setDatabaseLoading(false);
        setDatabaseError(null);
      } catch (err) {
        console.error("Database connection error:", err);
        setDatabaseLoading(false);
        setDatabaseError("Failed to connect to the database.");
      }
    };

    databaseConnect();
  }, []);

  const handleChangeInput = (e) => {
    setInputs((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!inputs.username || !inputs.password) {
      notifyError("Username and password are required");
      return;
    }

    try {
      const res = await axios.post(`${SERVER}/auth/login`, inputs, {
        withCredentials: true,
      });
      const { message, ...user } = res.data;
      setCurrentUser(user);
      notifySuccess(message);
      navigate("/");
    } catch (err) {
      console.error("Login error:", err);
      notifyError(
        err.response?.data?.message || "Login failed. Please try again."
      );
    }
  };

  return (
    <div className="text-white h-screen flex justify-center items-center">
      <div className="hidden lg:grid h-screen lg:w-1/3 relative lg:place-content-center">
        <img
          src={sideImg}
          alt=""
          className="object-cover h-full w-full absolute"
        />
        <h1 className="text-white text-7xl z-10 font-bold -rotate-90">Login</h1>
      </div>

      <div className="w-screen px-6 lg:w-2/3 lg:p-[8vw]">
        {databaseLoading ? (
          <p className="text-center">Connecting to database. Please wait...</p>
        ) : databaseError ? (
          <p className="text-center text-red-500">{databaseError}</p>
        ) : (
          <>
            <div className="text-center mb-14">
              <h1 className="font-serif text-4xl">Welcome</h1>
              <h2 className="font-thin text-2xl">Let's log you up quickly</h2>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-14">
              <input
                onChange={handleChangeInput}
                name="username"
                type="text"
                placeholder="Enter your username"
                className="bg-darkBg border border-primary p-4 text-sm font-light"
              />
              <input
                onChange={handleChangeInput}
                name="password"
                type="password"
                placeholder="Enter your password"
                className="bg-darkBg border border-primary p-4 text-sm font-light"
              />
              <button
                type="submit"
                className="bg-primary w-fit text-darkBg px-10 py-2 text-lg font-bold"
              >
                LOGIN
              </button>
            </form>

            <div>
              <p>
                Don't have an account?<span className="text-primary">?</span>
              </p>
              <a href="/register" className="text-primary">
                Sign-up
              </a>
            </div>
          </>
        )}
      </div>
      <Notif error={error} success={success} />
    </div>
  );
}
