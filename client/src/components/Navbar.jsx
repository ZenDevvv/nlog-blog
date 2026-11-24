import { useContext, useState } from "react";
import { IoIosSearch, IoIosAddCircleOutline, IoIosTrendingUp, IoIosHome } from "react-icons/io";
import { AuthContext } from "../context/AuthContext";
import Write from "./Write";
import AuthPrompt from "./AuthPrompt";
import { Link, useLocation } from "react-router-dom";
import SearchBar from "./SearchBar";
import { motion as m } from "framer-motion";

export default function Navbar() {
  const { currentUser } = useContext(AuthContext);
  const location = useLocation();
  const [createPost, setCreatePost] = useState(false);
  const [guestPrompt, setGuestPrompt] = useState(false);
  const [openSearchBar, setOpenSearchBar] = useState(false);
  const navItem = "group flex items-center gap-2 lg:flex-col lg:gap-1 lg:w-full cursor-pointer hover:bg-slate-700 lg:px-3 lg:py-2 transition-colors duration-150";

  return <>
    <m.nav aria-label="Main navigation" initial={{ x: window.innerWidth > 768 ? "-100%" : 0, y: window.innerWidth <= 768 ? "100%" : 0 }} animate={{ x: 0, y: 0 }} transition={{ duration: 0.6 }} className="fixed w-screen lg:w-fit bottom-0 left-0 p-4 lg:p-0 bg-darkBg z-50 min-w-[350px] lg:min-w-0">
      <div className="text-white w-full flex lg:flex-col justify-evenly items-center px-2 py-3 md:py-5 border-2 border-primary lg:h-screen lg:w-fit lg:border-0 lg:border-r-2 lg:justify-normal lg:py-12 lg:px-0 lg:gap-8">
        {currentUser ? <Link aria-label="Your profile" to={`/profile/${currentUser.id}`}>
          <span className="bg-primary text-darkBg aspect-square grid place-content-center rounded-full p-3 lg:p-6 text-xl lg:text-3xl font-semibold">{currentUser.username?.[0]?.toUpperCase()}</span>
        </Link> : <Link to="/login" state={{ from: location.pathname + location.search }} className="text-primary px-2 py-3 underline">Sign in</Link>}
        <button type="button" aria-label="Search" aria-expanded={openSearchBar} onClick={() => setOpenSearchBar(!openSearchBar)} className={navItem}>
          <IoIosSearch className="text-primary text-4xl" /><span className="hidden md:inline-block">Search</span>
        </button>
        <button type="button" aria-label="Write a post" onClick={() => currentUser ? setCreatePost(true) : setGuestPrompt(true)} className={navItem}>
          <IoIosAddCircleOutline className="text-primary text-4xl" /><span className="hidden md:inline-block">Create</span>
        </button>
        <Link to="/trending" className={navItem} aria-label="Trending"><IoIosTrendingUp className="text-primary text-4xl" /><span className="hidden md:inline-block">Trending</span></Link>
        <Link className="h-full flex flex-col items-center justify-end" to="/" aria-label="Home"><IoIosHome className="text-primary text-3xl" /></Link>
        <SearchBar setOpenSearchBar={setOpenSearchBar} openSearchBar={openSearchBar} />
      </div>
    </m.nav>
    {createPost && <Write setCreatePost={setCreatePost} createPost={createPost} />}
    {guestPrompt && <AuthPrompt onClose={() => setGuestPrompt(false)} />}
  </>;
}
