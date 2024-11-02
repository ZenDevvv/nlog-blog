import React, { useContext, useEffect, useState } from "react";
import { Truncate } from "@re-dev/react-truncate";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
const SERVER = import.meta.env.VITE_DEV_SERVER;

import { AuthContext } from "../context/AuthContext";
import Posts from "../components/Posts";

export default function Home() {
  // const dummy = [
  //   {
  //     id: 1,
  //     username: "johndoe",
  //     title: "Exploring the Mountains",
  //     content:
  //       "Last weekend, I hiked up the beautiful Blue Ridge Mountains. The views were breathtaking, and I can't wait to go back!",
  //     date: "15 March 2023",
  //     tags: ["#hiking", "#nature", "#adventure"],
  //   },
  //   {
  //     id: 2,
  //     username: "janedoe",
  //     title: "Cooking My Favorite Dish",
  //     content:
  //       "I tried making homemade pasta for the first time, and it turned out amazing! Here's the recipe I used. I tried making homemade pasta for the first time, and it turned out amazing! Here's the recipe I used. I tried making homemade pasta for the first time, and it turned out amazing! Here's the recipe I used. I tried making homemade pasta for the first time, and it turned out amazing! Here's the recipe I used. I tried making homemade pasta for the first time, and it turned out amazing! Here's the recipe I used.",
  //     date: "16 March 2023",
  //     tags: ["#cooking", "#foodie", "#recipe"],
  //   },
  //   {
  //     id: 3,
  //     username: "janedoe",
  //     title: "Cooking My Favorite Dish",
  //     content:
  //       "I tried making homemade pasta for the first time, and it turned out amazing! Here's the recipe I used. I tried making homemade pasta for the first time, and it turned out amazing! Here's the recipe I used. I tried making homemade pasta for the first time, and it turned out amazing! Here's the recipe I used. I tried making homemade pasta for the first time, and it turned out amazing! Here's the recipe I used. I tried making homemade pasta for the first time, and it turned out amazing! Here's the recipe I used. I tried making homemade pasta for the first time, and it turned out amazing! Here's the recipe I used.",
  //     date: "16 March 2023",
  //     tags: ["#cooking", "#foodie", "#recipe"],
  //   },
  //   {
  //     id: 5,
  //     username: "janedoe",
  //     title: "Cooking My Favorite Dish",
  //     content:
  //       "I tried making homemade pasta for the first time, and it turned out amazing! Here's the recipe I used. I tried making homemade pasta for the first time, and it turned out amazing! Here's the recipe I used. I tried making homemade pasta for the first time, and it turned out amazing! Here's the recipe I used. I tried making homemade pasta for the first time, and it turned out amazing! Here's the recipe I used. I tried making homemade pasta for the first time, and it turned out amazing! Here's the recipe I used. I tried making homemade pasta for the first time, and it turned out amazing! Here's the recipe I used.",
  //     date: "16 March 2023",
  //     tags: ["#cooking", "#foodie", "#recipe"],
  //   },
  //   {
  //     id: 6,
  //     username: "janedoe",
  //     title: "Cooking My Favorite Dish",
  //     content:
  //       "I tried making homemade pasta for the first time, and it turned out amazing! Here's the recipe I used. I tried making homemade pasta for the first time, and it turned out amazing! Here's the recipe I used. I tried making homemade pasta for the first time, and it turned out amazing! Here's the recipe I used. I tried making homemade pasta for the first time, and it turned out amazing! Here's the recipe I used. I tried making homemade pasta for the first time, and it turned out amazing! Here's the recipe I used. I tried making homemade pasta for the first time, and it turned out amazing! Here's the recipe I used.",
  //     date: "16 March 2023",
  //     tags: ["#cooking", "#foodie", "#recipe"],
  //   },
  //   {
  //     id: 7,
  //     username: "janedoe",
  //     title: "Cooking My Favorite Dish",
  //     content:
  //       "I tried making homemade pasta for the first time, and it turned out amazing! Here's the recipe I used. I tried making homemade pasta for the first time, and it turned out amazing! Here's the recipe I used. I tried making homemade pasta for the first time, and it turned out amazing! Here's the recipe I used. I tried making homemade pasta for the first time, and it turned out amazing! Here's the recipe I used. I tried making homemade pasta for the first time, and it turned out amazing! Here's the recipe I used. I tried making homemade pasta for the first time, and it turned out amazing! Here's the recipe I used.",
  //     date: "16 March 2023",
  //     tags: ["#cooking", "#foodie", "#recipe"],
  //   },
  // ];
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const tag = useLocation().search;
  const { currentUser } = useContext(AuthContext);

  

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await axios.get(`${SERVER}/posts/${tag}`);
        const sortedPosts = res.data.sort(
          (a, b) => new Date(b.updated_at) - new Date(a.updated_at)
        );
        setPosts(sortedPosts);
        
      } catch (err) {
        console.log(err);
      }
    };

    if (!currentUser) {
      navigate("/login");
      return;
    }
    fetchPosts();
  }, [tag]);

  return (
    <section className="flex flex-col text-white pb-[100px] md:pb-[110px] lg:pl-32 lg:pr-16 xl:pl-[200px] xl:pr-28  max-w-[1600px] mx-auto">
      <div className="flex flex-col py-14 items-center md:items-start md:px-24 overflow-x-hidden">
        
        <div className="flex flex-col items-center md:ml-9">
          <div className="bg-primary w-6 h-1 lg:w-10 lg:h-1.5"></div>
          <h2 className="text-lg lg:text-2xl">Latest</h2>
        </div>
      </div>

      <div className="flex flex-col gap-6 px-6  md:gap-10 lg:gap-14 ">
        {posts && <Posts posts={posts}/>}
      </div>
    </section>
  );
}
