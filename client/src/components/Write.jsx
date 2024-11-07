import axios from "axios";
import React, { useContext, useState, useEffect } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
const SERVER = import.meta.env.VITE_DEV_SERVER;
import { AuthContext } from "../context/AuthContext";
import AddTagBtn from "./AddTagBtn";
import { useNotif } from "../context/NotifContext";
import { useNavigate } from "react-router-dom";
import { motion as m, AnimatePresence } from "framer-motion";

export default function Write({ setCreatePost, createPost, post }) {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const { notifyError, notifySuccess } = useNotif();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState([]);

  useEffect(() => {
    if (post) {
      setTitle(post.title || "");
      setContent(post.content || "");
      setTags(post.tags?.split(",") || []);
    }
  }, [post]);

  const modules = {
    toolbar: false,
  };

  const submitPost = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${SERVER}/posts/${currentUser.id}`, {
        title,
        content,
        tags,
      });
      notifySuccess(res.data.message);
      setCreatePost(false);
      navigate("/");
    } catch (err) {
      console.log(err);
    }
  };

  const editPost = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.put(`${SERVER}/posts/${post.id}`, {
        title,
        content,
        tags,
      });
      notifySuccess(res.data.message);
      setCreatePost(false);
      navigate(`/`);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <AnimatePresence>
      {createPost && (
        <m.div
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          onClick={(e) =>
            e.target === e.currentTarget ? setCreatePost(false) : null
          }
          className="fixed inset-0 flex justify-center items-center bg-darkBg bg-opacity-80 z-20"
        >
          <m.div
            initial={{ scale: 0}}
            animate={{ scale: 1}}
            exit={{ scale: 0, transition: { duration: 0.1 } }}
            transition={{ type: "spring", duration: 0.7 }}
            className="bg-darkBg w-full m-6 p-6 border-2 border-primary rounded-md lg:max-w-[600px]"
          >
            <div className="space-y-6">
              <h1 className="text-center text-2xl font-bold">
                {post ? "Edit Post" : "Create Post"}
              </h1>
              <div className="space-y-2">
                <input
                  className="px-4 py-2 bg-darkBg border-l border-primary w-full focus:outline-none"
                  type="text"
                  placeholder="Write your title"
                  onChange={(e) => setTitle(e.target.value)}
                  value={title}
                />
                <div className="border-l border-primary h-[300px]">
                  <ReactQuill
                    className="h-full font-serif custom-quill"
                    theme="snow"
                    value={content}
                    onChange={setContent}
                    placeholder="What's on your mind?"
                    modules={modules}
                  />
                </div>

                <div className="flex gap-2 flex-wrap">
                  {tags.map((tag, id) => {
                    return (
                      <div
                        key={id}
                        className="group text-primary border border-primary px-3 py-1 rounded-md flex justify-between gap-2 items-center"
                      >
                        #{tag}
                        <span
                          onClick={() => setTags(tags.filter((t) => t !== tag))}
                          className="hidden cursor-pointer text-gray-400 group-hover:block"
                        >
                          x
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between">
                  <AddTagBtn tags={tags} setTags={setTags} />

                  <button
                    onClick={post ? editPost : submitPost}
                    className="text-primary border border-primary px-6 py-2 rounded-md hover:text-darkBg hover:bg-primary transition-all duration-200 hover:px-8"
                  >
                    Post
                  </button>
                </div>
              </div>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
