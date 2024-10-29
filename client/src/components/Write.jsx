import axios from "axios";
import React, { useContext, useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
const SERVER = import.meta.env.VITE_DEV_SERVER;
import { AuthContext } from "../context/AuthContext";
import AddTagBtn from "./AddTagBtn";

export default function Write({ setCreatePost }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const { currentUser } = useContext(AuthContext);
  const [tags, setTags] = useState([]);

  const modules = {
    toolbar: false,
  };

  const submitPost = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post(`${SERVER}/posts/${currentUser.id}`, {
        title,
        content,
        tags
      });
      console.log(res.data);
      window.location.reload();
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div
      onClick={(e) =>
        e.target === e.currentTarget ? setCreatePost(false) : null
      }
      className="fixed inset-0 flex justify-center items-center bg-darkBg bg-opacity-80"
    >
      <div className="bg-darkBg w-full m-6 p-6 border-2 border-primary rounded-md">
        <div className="space-y-6">
          <h1 className="text-center text-2xl font-bold">Create Post</h1>
          <div className="space-y-2">
            <input
              className="px-4 py-2 bg-darkBg border-l border-primary w-full focus:outline-none"
              type="text"
              placeholder="Write your title"
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className="border-l border-primary h-[300px]">
              <ReactQuill
                className="h-full font-serif text-gray-400 custom-quill"
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
                  <div className="group text-primary border border-primary px-3 py-1 rounded-md flex justify-between gap-2 items-center">
                    #{tag}
                    <span onClick={() => setTags(tags.filter((t) => t !== tag))} className="hidden cursor-pointer text-gray-400 group-hover:block">x</span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between">
              <AddTagBtn tags={tags} setTags={setTags} />

              <button
                onClick={submitPost}
                className="text-primary border border-primary px-6 py-2 rounded-md hover:text-darkBg hover:bg-primary transition-all duration-200 hover:px-8"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
