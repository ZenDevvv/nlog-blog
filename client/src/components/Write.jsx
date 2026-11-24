import { AuthContext } from "../context/AuthContext";
import AuthPrompt from "./AuthPrompt";
import { ALLOWED_IMAGE_TYPES, imageError, postError } from "../validation";
import axios from "axios";
import React, { useState, useEffect, useContext, useRef } from "react";
import RichTextEditor from "./RichTextEditor";
const SERVER = import.meta.env.VITE_DEV_SERVER;
import AddTagBtn from "./AddTagBtn";
import { useNotif } from "../context/NotifContext";
import { useNavigate } from "react-router-dom";
import { motion as m, AnimatePresence } from "framer-motion";
import { FiImage, FiX } from "react-icons/fi";

export default function Write({ setCreatePost, createPost, post }) {
  const navigate = useNavigate();
  const { currentUser } = useContext(AuthContext);
  const { notifyError, notifySuccess } = useNotif();
  const fileInputRef = useRef(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (post) {
      setTitle(post.title || "");
      setContent(post.content || "");
      setTags(post.tags ? post.tags.split(",").filter(Boolean) : []);
      setImageFile(null);
      setRemoveImage(false);
      setPreviewUrl(post.image_url || null);
    } else if (!createPost) {
      setTitle("");
      setContent("");
      setTags([]);
      setImageFile(null);
      setRemoveImage(false);
      setPreviewUrl(null);
    }
  }, [post, createPost]);

  useEffect(() => {
    if (!imageFile) return undefined;
    const objectUrl = URL.createObjectURL(imageFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  const selectImage = (file) => {
    if (!file) return;
    const err = imageError(file);
    if (err) {
      notifyError(err);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setImageFile(file);
    setRemoveImage(false);
  };

  const handleFileChange = (e) => {
    selectImage(e.target.files?.[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    selectImage(e.dataTransfer.files?.[0]);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setPreviewUrl(null);
    if (post?.image_url) setRemoveImage(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const areFieldsEmpty = () => {
    const validationError = postError(title, content, tags, imageFile);
    if (validationError) {
      notifyError(validationError);
      return true;
    }
    return false;
  };

  const buildPayload = () => {
    if (imageFile || removeImage) {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("content", content);
      formData.append("tags", JSON.stringify(tags));
      if (imageFile) formData.append("image", imageFile);
      if (removeImage && !imageFile) formData.append("removeImage", "true");
      return formData;
    }
    return { title, content, tags };
  };

  const submitPost = async (e) => {
    e.preventDefault();
    if (submitting || areFieldsEmpty()) return;
    setSubmitting(true);
    try {
      const res = await axios.post(
        `${SERVER}/posts`,
        buildPayload(),
        { withCredentials: true }
      );
      notifySuccess(res.data.message);
      setCreatePost(false);
    } catch (err) {
      console.log(err);
      notifyError(err.response?.data?.message || "Could not save the post");
    } finally {
      setSubmitting(false);
    }
  };

  const editPost = async (e) => {
    e.preventDefault();
    if (submitting || areFieldsEmpty()) return;
    setSubmitting(true);
    try {
      const res = await axios.put(
        `${SERVER}/posts/${post.id}`,
        buildPayload(),
        { withCredentials: true }
      );
      notifySuccess(res.data.message);
      setCreatePost(false);
      navigate(`/`);
    } catch (err) {
      console.log(err);
      notifyError(err.response?.data?.message || "Could not save the post");
    } finally {
      setSubmitting(false);
    }
  };

  if (createPost && !currentUser) return <AuthPrompt onClose={() => setCreatePost(false)} />;

  return (
    <AnimatePresence>
      {createPost && (
        <m.div
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          onClick={(e) =>
            !submitting && e.target === e.currentTarget ? setCreatePost(false) : null
          }
          className="fixed inset-0 flex justify-center items-center bg-darkBg bg-opacity-80 z-20 p-4"
        >
          <m.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0, transition: { duration: 0.1 } }}
            transition={{ type: "spring", duration: 0.7 }}
            className="bg-darkBg w-full max-h-[90vh] overflow-y-auto p-6 border-2 border-primary rounded-md lg:max-w-[600px]"
          >
            <div className="space-y-5">
              <h1 className="text-center text-2xl font-bold">
                {post ? "Edit Post" : "Create Post"}
              </h1>
              <div className="space-y-3">
                <input
                  className="px-4 py-2 bg-darkBg border-l border-primary w-full focus:outline-none"
                  type="text"
                  placeholder="Write your title"
                  maxLength={200}
                  onChange={(e) => setTitle(e.target.value)}
                  value={title}
                />

                <div className="border-l border-primary h-[220px]">
                  <RichTextEditor
                    className="h-full font-serif custom-quill"
                    value={content}
                    onChange={setContent}
                    placeholder="What's on your mind?"
                  />
                </div>

                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ALLOWED_IMAGE_TYPES.join(",")}
                    onChange={handleFileChange}
                    className="hidden"
                    aria-label="Upload cover image"
                  />

                  {previewUrl ? (
                    <div className="relative rounded-md overflow-hidden border border-primary/50 bg-black/30">
                      <img
                        src={previewUrl}
                        alt="Cover preview"
                        className="w-full max-h-56 object-cover"
                      />
                      <div className="absolute top-2 right-2 flex gap-2">
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-darkBg/85 text-primary border border-primary px-3 py-1 text-xs rounded-md hover:bg-primary hover:text-darkBg transition-colors"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={handleRemoveImage}
                          aria-label="Remove cover image"
                          className="bg-darkBg/85 text-white border border-white/30 p-1.5 rounded-md hover:border-red-400 hover:text-red-400 transition-colors"
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragging(true);
                      }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={handleDrop}
                      className={`w-full py-5 px-4 border border-dashed rounded-md flex flex-col items-center justify-center gap-1.5 text-sm transition-colors ${
                        dragging
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-primary/50 text-gray-300 hover:border-primary hover:text-primary"
                      }`}
                    >
                      <FiImage className="w-6 h-6 text-primary" />
                      <span>Add a cover photo</span>
                      <span className="text-xs text-gray-400">
                        Drag & drop or click · JPG, PNG, WebP, GIF (max 5 MB)
                      </span>
                    </button>
                  )}
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

                <div className="flex justify-between items-center pt-1">
                  <AddTagBtn tags={tags} setTags={setTags} />

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={post ? editPost : submitPost}
                    className="text-primary border border-primary px-6 py-2 rounded-md hover:text-darkBg hover:bg-primary transition-all duration-200 hover:px-8 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (post ? "Saving..." : "Posting...") : post ? "Save" : "Post"}
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
