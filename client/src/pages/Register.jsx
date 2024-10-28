import sideImg from "../assets/auth/sidebg.png";
import React, { useState } from "react";
const SERVER = import.meta.env.VITE_DEV_SERVER;
import axios from "axios";
import Notif from "../components/Notif";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [inputs, setInputs] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate()

  const handleChangeInput = (e) => {
    setInputs((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (inputs.password !== inputs.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setError(null);
    try {
      const res = await axios.post(`${SERVER}/auth/register`, inputs);
      console.log(res.data);
      setSuccess(res.data.message);
      navigate("/login")
    } catch (err) {
      setSuccess(null)
      console.log(err);
      setError(err.response.data.message);
    }
  };

  return (
    <div className="relative text-white h-screen flex justify-center items-center">
      <div className="hidden lg:grid h-screen  lg:w-1/3 relative lg:place-content-center">
        <img
          src={sideImg}
          alt=""
          className="object-cover h-full w-full absolute"
        />
        <h1 className="text-white text-7xl z-10 font-bold -rotate-90">
          Sign Up
        </h1>
      </div>

      <div className="w-screen px-6 lg:w-2/3 lg:p-[8vw]">
        <div className="text-center mb-14">
          <h1 className="font-serif text-4xl">Welcome</h1>
          <h2 className="font-thin text-2xl">Let's sign you you up quickly</h2>
        </div>

        <form className="flex flex-col gap-4 mb-14">
          <input
            onChange={handleChangeInput}
            name="username"
            type="text"
            placeholder="Enter your username"
            className="bg-darkBg border border-primary p-4 text-sm font-light"
          />
          <input
            onChange={handleChangeInput}
            name="email"
            type="email"
            placeholder="Enter your email"
            className="bg-darkBg border border-primary p-4 text-sm font-light"
          />
          <input
            onChange={handleChangeInput}
            name="password"
            type="password"
            placeholder="Enter your password"
            className="bg-darkBg border border-primary p-4 text-sm font-light"
          />
          <input
            onChange={handleChangeInput}
            name="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            className="bg-darkBg border border-primary p-4 text-sm font-light"
          />
          <button
            onClick={handleSubmit}
            className="bg-primary w-fit text-darkBg px-10 py-2 text-lg font-bold"
          >
            SIGNUP
          </button>
        </form>

        <div>
          <p>
            don't have an accounts<span className="text-primary">?</span>
          </p>
          <a href="/login" className="text-primary">
            log-in
          </a>
        </div>
      </div>

      <Notif error={error} success={success} />
    </div>
  );
}
