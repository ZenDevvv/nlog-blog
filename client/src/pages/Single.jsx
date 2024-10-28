import axios from "axios";
import React, { useContext, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
const SERVER = import.meta.env.VITE_DEV_SERVER;
import { AuthContext } from "../context/AuthContext";
import dayjs from "dayjs";

// Helper function to format date
const formatDate = (date) => {
  return dayjs(date).format("MMMM DD, YYYY");
};

export default function Single() {
  // const dummy = {
  //   id: 1,
  //   username: "johndoe",
  //   title: "Exploring the Mountains in the Ocean",
  //   content:
  //     "Last weekend, I hiked up the beautiful Blue Ridge Mountains. The views were breathtaking, and I can't wait to go back!Last weekend, I hiked up the beautiful Blue Ridge Mountains. The views were breathtaking, and I can't wait to go back!Last weekend, I hiked up the beautiful Blue Ridge Mountains. The views were breathtaking, and I can't wait to go back!Last weekend, I hiked up the beautiful Blue Ridge Mountains. The views were breathtaking, and I can't wait to go back!",
  //   date: "15 March 2023",
  //   tags: ["#hiking", "#nature", "#adventure"],
  // };
  const [post, setPost] = useState({});
  const { currentUser } = useContext(AuthContext);
  const location = useLocation();
  const postsID = location.pathname.split("/").pop();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await axios.get(`${SERVER}/posts/${postsID}`);
        setPost(res.data[0]);
      } catch (err) {
        console.log(err);
      }
    };

    fetchPost();
  }, []);

  const getText = (html) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent;
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    console.log("delete");
    try {
      const res = await axios.delete(`${SERVER}/posts/${postsID}`, {
        withCredentials: true,
      });
      console.log(res);
      navigate("/");
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="">
      <div className="text-white pb-24 p-10 md:px-24 lg:pl-40 max-w-[1000px] lg:pt-20 mx-auto">
        <div>
          <h1 className="w-full text-primary text-4xl font-serif leading-[50px]">
            {post.title}
          </h1>
          <div className="text-[#A5A5A5] pt-4 font-extralight">
            <p>written by @{post.username}</p>
            <p>on {formatDate(post.updated_at)}</p>
          </div>
          {currentUser.username === post.username && (
            <div className="flex gap-4">
              <button>Edit</button>
              <button onClick={handleDelete}>Delete</button>
            </div>
          )}
        </div>

        <div className="pt-12">
          <p className="first-letter:text-6xl md:text-base">
            {getText(post.content)}
          </p>
        </div>
      </div>
    </div>
  );
}
