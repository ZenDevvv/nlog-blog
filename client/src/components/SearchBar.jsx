import axios from "axios";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
const SERVER = import.meta.env.VITE_DEV_SERVER;
import { AnimatePresence, motion as m } from "framer-motion";

export default function SearchBar({ setOpenSearchBar, openSearchBar }) {
  const [searchInput, setSearchInput] = useState("");
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.get(`${SERVER}/posts/search?q=${searchInput}`);
      console.log(res.data);
      navigate(`/posts/search?q=${searchInput}`, {
        state: { searchResults: res.data },
      });
      setOpenSearchBar(false);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <AnimatePresence>
      {openSearchBar && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{opacity: 0, transition: { duration: 0.1 } }}
          onClick={(e) => {
            e.target === e.currentTarget ? setOpenSearchBar(false) : null;
          }}
          className="fixed inset-0 pt-4 px-2 bg-darkBg bg-opacity-80 -z-10  lg:pl-[90px] lg:pt-8 xl:pl-16 "
        >
          <m.div
            initial={{ y: "-100%" }}
            animate={{ y: 0 }}
            exit={{ y: "-120%", transition: { duration: 0.1 } }}
            className="w-full h-auto flex shadow-2xl max-w-[1000px] mx-auto"
          >
            <input
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1 md:text-lg bg-gray-700 p-4 rounded-tl-md rounded-bl-md  lg:p-6 focus:outline-none"
              type="text"
              placeholder="Search"
            />
            <button
              onClick={handleSearch}
              className="text-darkBg md:text-lg h-full lg:p-6 bg-primary p-4 rounded-tr-md rounded-br-md active:opacity-80"
            >
              Search
            </button>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
