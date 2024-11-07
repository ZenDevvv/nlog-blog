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
import SearchBar from "./SearchBar";
import { motion as m } from "framer-motion"

export default function Navbar() {
  const { currentUser } = useContext(AuthContext);
  const [createPost, setCreatePost] = useState(false);
  const [openSearchBar, setOpenSearchBar] = useState(false);

  return (
    <m.nav
      initial={{ x: window.innerWidth > 768 ? "-100%" : 0, y: window.innerWidth <= 768 ? "100%" : 0}}
      animate={{ x: 0, y: 0}}
      transition={{duration: 0.6}}
    className="fixed w-screen lg:w-fit bottom-0 left-0 p-4 lg:p-0 bg-darkBg z-50 min-w-[350px] lg:min-w-0">
      {currentUser && (
        <div className="text-white w-full flex lg:flex-col justify-evenly  items-center px-2 py-3 md:py-5 border-2 border-primary lg:h-screen lg:w-fit lg:border-0 lg:border-r-2 lg:justify-normal lg:py-12 lg:px-0 lg:gap-8">
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

          <div
            onClick={() => setOpenSearchBar(!openSearchBar)}
            className="group flex items-center gap-2 lg:flex-col lg:gap-1 lg:w-full cursor-pointer hover:bg-slate-700 lg:px-3 lg:py-2 transition-colors duration-150"
          >
            <IoIosSearch className="text-primary text-4xl group-hover:scale-[1.15] transition-transform duration-200" />
            <a className="hidden md:inline-block">Search</a>
          </div>

          <div
            onClick={() => setCreatePost(!createPost)}
            className="group flex items-center gap-2 lg:gap-1 lg:flex-col lg:w-full cursor-pointer hover:bg-slate-700 lg:px-3 lg:py-2 transition-colors duration-150"
          >
            <IoIosAddCircleOutline className="text-primary text-4xl group-hover:scale-[1.15] transition-transform duration-200 " />
            <a className="hidden md:inline-block">Create</a>
          </div>

          <Link to={"/trending"} className="lg:w-full  lg:py-2 transition-colors duration-150 hover:bg-slate-700">
            <div className="flex items-center gap-2 lg:gap-1 lg:flex-col lg:w-full cursor-pointer ">
              <IoIosTrendingUp className="text-primary text-4xl" />
              <p className="hidden md:inline-block">Trending</p>
            </div>
          </Link>

          <Link className="h-full flex flex-col items-center justify-end" to={"/"}>
 
              <IoIosHome className="w-full text-primary text-2xl lg:text-3xl hover:scale-125 transition-transform duration-250" />
          
          </Link>

           <Write setCreatePost={setCreatePost} createPost={createPost} />
          <SearchBar setOpenSearchBar={setOpenSearchBar} openSearchBar={openSearchBar} />
        </div>
      )}
    </m.nav>
  );
}
