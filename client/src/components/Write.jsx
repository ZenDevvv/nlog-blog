import axios from "axios";
import React, { useContext, useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
const SERVER = import.meta.env.VITE_DEV_SERVER;
import { AuthContext } from "../context/AuthContext";

export default function Write({ setCreatePost }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const { currentUser } = useContext(AuthContext);

  const modules = {
    toolbar: false,
  };

  const submitPost = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post(`${SERVER}/posts/${currentUser.id}`, {
        title,
        content,
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
      <div className="bg-darkBg w-full m-6 p-10 border-2 border-primary rounded-md">
        <div className="space-y-6">
          <h1 className="text-center text-2xl font-bold">Create Post</h1>
          <div className="space-y-2">
            <input
              className="px-4 py-2 bg-darkBg border border-primary w-full"
              type="text"
              placeholder="Write your title"
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className="border border-primary h-[300px]">
              <ReactQuill
                className="h-full font-serif"
                theme="snow"
                value={content}
                onChange={setContent}
                placeholder="What's on your mind"
                modules={modules}
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={submitPost}
                className="border border-primary px-6 py-2 rounded-md"
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
