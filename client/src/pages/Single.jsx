import axios from "axios";
import React, { useContext, useEffect, useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
const SERVER = import.meta.env.VITE_DEV_SERVER;
import { AuthContext } from "../context/AuthContext";
import dayjs from "dayjs";
import Write from "../components/Write";
import { useNotif } from "../context/NotifContext";
import { AnimatePresence, motion as m } from "framer-motion"; // Import motion from framer-motion

// Helper function to format date
const formatDate = (date) => {
  return dayjs(date).format("MMMM DD, YYYY");
};

export default function Single() {
  const [post, setPost] = useState(null);
  const { currentUser } = useContext(AuthContext);
  const postsID = useLocation().pathname.split("/").pop();
  const navigate = useNavigate();
  const [createPost, setCreatePost] = useState(false);
  const viewedPosts = useRef(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { notifySuccess, notifyError } = useNotif();

  useEffect(() => {
    let active = true;
    setLoading(true); setError(null); setPost(null); setCreatePost(false);
    const fetchPost = async () => {
      try {
        const res = await axios.get(`${SERVER}/posts/${postsID}`);
        if (!active) return;
        if (!res.data.length) { setError("Post not found"); return; }
        setPost(res.data[0]);
        if (!viewedPosts.current.has(postsID)) {
          viewedPosts.current.add(postsID);
          axios.put(`${SERVER}/posts/${postsID}/increment-views`).catch(() => viewedPosts.current.delete(postsID));
        }
      } catch (err) {
        if (active) setError(err.response?.data?.message || "Could not load this post.");
      } finally { if (active) setLoading(false); }
    };
    fetchPost();
    return () => { active = false; };
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
      notifySuccess(res.data.message);
      navigate("/");
    } catch (err) {
      console.log(err);
    }
  };

  if (loading) return <p role="status" className="p-10 text-white lg:pl-40">Loading post…</p>;
  if (error || !post) return <p role="alert" className="p-10 text-white lg:pl-40">{error || "Post not found"}</p>;

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
        {currentUser?.id === post.user_id && (
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

      {post.image_url && (
        <div className="mt-6 overflow-hidden rounded-lg border border-white/10 bg-black/20">
          <img
            src={post.image_url}
            alt={post.title}
            className="w-full max-h-[560px] object-contain mx-auto"
          />
        </div>
      )}

      <div className="pt-8">
        <p className="first-letter:text-6xl md:text-base leading-7">
          {getText(post.content)}
        </p>
      </div>

      <Write setCreatePost={setCreatePost} createPost={createPost} post={post} />
    </div>
  );
}
