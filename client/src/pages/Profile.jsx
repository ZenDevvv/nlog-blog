import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import dayjs from "dayjs"; // Import dayjs
import { useLocation } from "react-router-dom";
import Posts from "../components/Posts";
const SERVER = import.meta.env.VITE_DEV_SERVER;

const formatDate = (date) => {
  return dayjs(date).format("MMMM DD, YYYY");
};

export default function Profile() {
  const { currentUser } = useContext(AuthContext);

  const [posts, setPosts] = useState({});
  const userID = location.pathname.split("/").pop();

  useEffect(() => {
    const getUser = async () => {
      try {
        const res = await axios.get(`${SERVER}/profile/${userID}`);
        setPosts(res.data);
        console.log(res.data);
      } catch (err) {
        console.log(err);
      }
    };

    getUser();
  }, [userID]);

  return (
    <div className="text-white pt-8 flex flex-col pb-[100px] md:pb-[110px] lg:pl-32 lg:pr-16 xl:pl-[200px] xl:pr-28  max-w-[1600px] mx-auto">
      <div className="flex flex-col items-center gap-4">
        <div className="bg-primary w-[150px] aspect-square rounded-full grid place-content-center">
          <span className="text-7xl">
            {posts[0] && posts[0].username
              ? posts[0].username[0].toUpperCase()
              : ""}
          </span>
        </div>
        <h2 className="text-2xl">@{posts[0]?.username}</h2>
        <p className="text-[#A5A5A5]">
          Joined since {formatDate(posts[0]?.created_at)}
        </p>
      </div>

      <div className="flex flex-col items-center my-8">
        <div className="bg-primary w-5 h-1 lg:w-10 lg:h-1"></div>
        <h2 className="text-sm  lg:text-2xl">Posts</h2>
      </div>

      <div className="flex flex-col gap-6 px-6  md:gap-10 lg:gap-14 pb-20 md:pb-[130px]">
        {posts[0] && <Posts posts={posts} />}
      </div>
    </div>
  );
}
