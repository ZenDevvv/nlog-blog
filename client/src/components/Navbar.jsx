import React, { useContext, useState } from "react";
import {
  IoIosSearch,
  IoIosAddCircleOutline,
  IoIosTrendingUp,
  IoIosHome,
} from "react-icons/io";
import { AuthContext } from "../context/AuthContext";
import Write from "./Write";
import { Link } from "react-router-dom";

export default function Navbar() {
  const { currentUser } = useContext(AuthContext);
  const [createPost, setCreatePost] = useState(false);
  
  return (
    <nav className="fixed w-screen lg:w-fit bottom-0 left-0 p-4 lg:p-0 bg-darkBg z-10 min-w-[350px] lg:min-w-0">
      {currentUser && 
      <div className="text-white w-full flex lg:flex-col justify-evenly  items-center px-2 py-3 md:py-5 border-2 border-primary lg:h-screen lg:w-fit lg:border-0 lg:border-r-2 lg:justify-normal lg:py-12 lg:gap-8">
        <Link to={`/profile/${currentUser.id}`}>
          <div className="flex items-center gap-2 lg:w-full cursor-pointer">
            <p className="bg-primary text-darkBg h-full aspect-square grid place-content-center rounded-full p-3 lg:p-6 text-xl lg:text-3xl font-semibold">
              {currentUser?.username[0].toUpperCase()}
            </p>
            <p className="hidden md:inline-block lg:hidden">
              {currentUser?.username}
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2 lg:flex-col lg:gap-1 lg:w-full cursor-pointer">
          <IoIosSearch className="text-primary text-4xl" />
          <a className="hidden md:inline-block">Search</a>
        </div>

        <div
          onClick={() => setCreatePost(!createPost)}
          className="flex items-center gap-2 lg:gap-1 lg:flex-col lg:w-full cursor-pointer"
        >
          <IoIosAddCircleOutline className="text-primary text-4xl" />
          <a className="hidden md:inline-block">Create</a>
        </div>

        <div className="flex items-center gap-2 lg:gap-1 lg:flex-col lg:w-full cursor-pointer">
          <IoIosTrendingUp className="text-primary text-4xl" />
          <a className="hidden md:inline-block">Trending</a>
        </div>

        <Link className="h-full flex flex-col items-end justify-end" to={'/'}>
          <div>
            <IoIosHome className="text-primary text-2xl lg:text-3xl" />
          </div>
        </Link>

        {createPost && <Write setCreatePost={setCreatePost} />}
      </div>}
    </nav>
  );
}
