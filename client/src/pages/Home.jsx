import React, { useContext, useEffect, useState } from "react";
import { Truncate } from "@re-dev/react-truncate";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { motion as m } from "framer-motion"
const SERVER = import.meta.env.VITE_DEV_SERVER;

import { AuthContext } from "../context/AuthContext";
import Posts from "../components/Posts";

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();

  const [posts, setPosts] = useState([]);
  const tag = location.search;
  const { currentUser, setCurrentUser } = useContext(AuthContext);

  const query = new URLSearchParams(location.search).get("q");
  const searchResult = location.state?.searchResults;
  const trending = location.pathname.split('/').pop()

  const sortPostsByDate = (posts) => {
    return posts.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  };

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    const fetchPosts = async () => {
      try {
        const res = await axios.get(`${SERVER}/posts/${tag}`,{withCredentials: true});
        const sortedPosts = sortPostsByDate(res.data);
        setPosts(sortedPosts);
      } catch (err) {
        console.log(err.response.data);
        setCurrentUser(null);
        localStorage.removeItem("user");
        window.location.reload()
      }
    };
    
    const fetchTrending = async () => {
      try {
        const res = await axios.get(`${SERVER}/posts/trending`);
        setPosts(res.data);
      } catch (err) {
        console.log(err);
      }
    }



    if (searchResult) {
      setPosts(searchResult);
    } else if(trending){
      fetchTrending();
    } else {
      fetchPosts();
    }
  }, [tag, searchResult, trending]);

  return (
    <section className="flex flex-col text-white pb-[100px] md:pb-[110px] lg:pl-32 lg:pr-16 xl:pl-[200px] xl:pr-28  max-w-[1600px] mx-auto">
      <div className="flex flex-col py-14 items-center md:items-start md:px-24 overflow-x-hidden">
        <div className="flex flex-col items-center md:ml-9">
          <div className="bg-primary w-6 h-1 lg:w-10 lg:h-1.5"></div>
          <h2 className="text-lg lg:text-2xl">
            {searchResult ? `Searched for: ${query}` : trending ? `Trending` : "latest"}
          </h2>
        </div>
      </div>

      <div className="flex flex-col gap-6 px-6  md:gap-10 lg:gap-14 ">
        {posts && <Posts posts={posts} />}
      </div>
    </section>
  );
}
