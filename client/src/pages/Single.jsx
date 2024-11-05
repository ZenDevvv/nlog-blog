import axios from "axios";
import React, { useContext, useEffect, useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
const SERVER = import.meta.env.VITE_DEV_SERVER;
import { AuthContext } from "../context/AuthContext";
import dayjs from "dayjs";
import Write from "../components/Write";
import Notif from "../components/Notif";

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
  const postsID = useLocation().pathname.split("/").pop();
  const navigate = useNavigate();
  const [createPost, setCreatePost] = useState(false);
  const hasIncrementedViews = useRef(false);

  useEffect(() => {
    const fetchPost = async () => {
      console.log("single")
      try {
        const res = await axios.get(`${SERVER}/posts/${postsID}`);
        setPost(res.data[0]);

        // Increment views only once
        if (!hasIncrementedViews.current) {
          await axios.put(`${SERVER}/posts/${postsID}/increment-views`);
          hasIncrementedViews.current = true; // Set to true after incrementing
        }
      } catch (err) {
        console.log(err);
      }
    };

    fetchPost();
  }, [postsID]);

  const getText = (html) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent;
  };

  const handleDelete = async (e) => {
    e.preventDefault();
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
    <div className="text-white pb-24 p-10 md:px-24 lg:pl-40 max-w-[1000px] lg:pt-20 mx-auto">
      <div>
        <h1 className="w-full text-primary text-4xl font-serif leading-[50px]">
          {post.title}
        </h1>
        <div className="text-[#A5A5A5] pt-4 font-extralight">
          <p>
            written by{" "}
            <Link
              className="cursor-pointer hover:underline"
              to={`/profile/${post.user_id}`}
            >
              @{post.username}
            </Link>
          </p>
          <p>on {formatDate(post.updated_at)}</p>
        </div>
        {currentUser.username === post.username && (
          <div className="flex gap-4">
            <button onClick={() => setCreatePost(!createPost)}>Edit</button>
            <button onClick={handleDelete}>Delete</button>
          </div>
        )}

        <ul className="flex gap-2 py-4 flex-wrap">
          {post.tags?.split(",").map((tag, id) => {
            return (
              <Link key={id} to={`/?tag=${tag}`}>
                <li className="text-xs lg:text-base text-primary border-[1px] font-light border-primary px-4 py-1 rounded-full hover:-translate-y-0.5 duration-200">
                  #{tag}
                </li>
              </Link>
            );
          })}
        </ul>
      </div>

      <div className="pt-12">
        <p className="first-letter:text-6xl md:text-base leading-7">
          {getText(post.content)}
        </p>
      </div>
      {createPost && <Write setCreatePost={setCreatePost} post={post} />}

      
    </div>
  );
}
 